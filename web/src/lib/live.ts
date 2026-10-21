"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isRetryable,
  liveErrorMessage,
  reportRow,
  type EcgScheduleRow,
  type EnergyStatus,
  type ZoneStatusRow,
  emptySharing,
  loadNotifications,
  loadSharing,
  markNotificationsRead,
  syncProfileZone,
  type Notification,
  type SharingData,
} from "./energy";
import {
  predictionColumns,
  todayBounds,
  type PredictionRow,
} from "../../../shared/forecast";

// Next.js inlines NEXT_PUBLIC_ variables at build time (web/.env.local).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Live mode needs both public values; without them the app stays a local demo.
 * NEXT_PUBLIC_LIGHTLINK_MODE=demo forces the demo (browser tests never touch the real database).
 */
export const liveEnabled =
  Boolean(url && anonKey) && process.env.NEXT_PUBLIC_LIGHTLINK_MODE !== "demo";

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!liveEnabled) return null;
  client ??= createClient(url!, anonKey!);
  return client;
}

/**
 * Reporting must take two taps: a resident without an account gets an anonymous session,
 * which the database treats as a signed-in user (one user id, same rate limit).
 */
async function ensureSession(db: SupabaseClient): Promise<string | null> {
  const { data } = await db.auth.getSession();
  if (data.session) return null;
  const { error } = await db.auth.signInAnonymously();
  return error ? liveErrorMessage(error) : null;
}

export interface LiveReport {
  neighborhoodId: string;
  status: EnergyStatus;
  description: string;
  lat?: number;
  lng?: number;
}

/** Returns null when the report is stored, otherwise a message for the resident. */
export async function sendReport(report: LiveReport): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  try {
    const sessionError = await ensureSession(db);
    if (sessionError) return sessionError;
    const { error } = await db.from("outage_reports").insert(reportRow(report));
    return error ? liveErrorMessage(error) : null;
  } catch (error) {
    return liveErrorMessage(error as Error);
  }
}

export { isRetryable };

/** Task 37: e-mail account; the profile row is created by the database at sign-up. */
export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  neighborhoodId: string;
}): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.name } },
  });
  if (error) return accountError(error.message);
  if (data.user) {
    await db
      .from("profiles")
      .update({ display_name: input.name, zone_id: input.neighborhoodId })
      .eq("id", data.user.id);
  }
  return null;
}

export async function signIn(
  email: string,
  password: string,
): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  const { error } = await db.auth.signInWithPassword({ email, password });
  return error ? accountError(error.message) : null;
}

function accountError(message: string): string {
  if (/invalid login credentials/i.test(message))
    return "E-mail ou mot de passe incorrect.";
  if (/already registered/i.test(message))
    return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
  if (/password/i.test(message))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  return "La connexion a échoué. Réessayez dans un instant.";
}

/**
 * Live neighbourhood states and ECG schedules, refreshed when a report arrives
 * (task 60, realtime) and at most every 2 seconds.
 */
/** "off": demo mode; "loading": first read pending; "error": no live data could be read. */
export type LiveState = "off" | "loading" | "ready" | "error";

export function useLiveData() {
  const [zones, setZones] = useState<ZoneStatusRow[] | null>(null);
  const [state, setState] = useState<LiveState>(
    liveEnabled ? "loading" : "off",
  );
  const [schedules, setSchedules] = useState<EcgScheduleRow[]>([]);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);

  const refresh = useCallback(async () => {
    const db = supabase();
    if (!db) return;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [dayStart, dayEnd] = todayBounds();
    let results;
    try {
      results = await Promise.all([
        db.from("zone_status").select("*"),
        db
          .from("ecg_schedules")
          .select(
            "id, zone_id, starts_at, ends_at, partial, localities, source_url",
          )
          .gte("ends_at", since)
          .order("starts_at", { ascending: false })
          .limit(200),
        // Today's forecasts, newest first: the apps keep the first row of each zone.
        db
          .from("predictions")
          .select(predictionColumns)
          .gte("window_start", dayStart)
          .lt("window_start", dayEnd)
          .order("generated_at", { ascending: false }),
      ]);
    } catch {
      // Keep the last live data if there is some; otherwise say it is unavailable.
      setState((previous) => (previous === "ready" ? previous : "error"));
      return;
    }
    const [status, planned, forecast] = results;
    if (status.error || !status.data) {
      setState((previous) => (previous === "ready" ? previous : "error"));
    } else {
      setState("ready");
      setZones(status.data as ZoneStatusRow[]);
    }
    if (!planned.error && planned.data)
      setSchedules(planned.data as EcgScheduleRow[]);
    if (!forecast.error && forecast.data)
      setPredictions(forecast.data as PredictionRow[]);
  }, []);

  useEffect(() => {
    const db = supabase();
    if (!db) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void refresh();
      }, 2000);
    };
    // First load outside the effect body, like every later refresh.
    const first = setTimeout(() => void refresh(), 0);
    const channel = db
      .channel("outage-reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "outage_reports" },
        scheduleRefresh,
      )
      .subscribe();
    // The view also changes when an ECG window starts or ends: refresh every minute.
    const minute = setInterval(() => void refresh(), 60_000);
    return () => {
      clearTimeout(first);
      if (timer) clearTimeout(timer);
      clearInterval(minute);
      void db.removeChannel(channel);
    };
  }, [refresh]);

  return { state, zones, schedules, predictions, refresh };
}

/**
 * Phase 3, live mode: offers and requests around the resident's neighbourhood, the
 * requests on their own offers, and their notification inbox. `run` performs a sharing
 * action, shows its error if any, then reloads.
 */
export function useLiveSharing(zoneId: string) {
  const [data, setData] = useState<SharingData>(emptySharing);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Which session and neighbourhood the profile was last synced for (point 7 of #9).
  const synced = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    // Reading needs no account: a session is only opened when the resident acts.
    const db = supabase();
    if (!db) return;
    const { data: session } = await db.auth.getSession();
    const me = session.session?.user.id;
    if (me && synced.current !== `${me}:${zoneId}`) {
      // Alerts follow the profile's neighbourhood, anonymous sessions included.
      await syncProfileZone(db, zoneId).catch(() => undefined);
      synced.current = `${me}:${zoneId}`;
    }
    const [sharing, inbox] = await Promise.all([
      loadSharing(db, zoneId).catch(() => null),
      loadNotifications(db).catch(() => []),
    ]);
    if (sharing) setData(sharing);
    setNotifications(inbox);
  }, [zoneId]);

  useEffect(() => {
    if (!liveEnabled) return;
    const first = setTimeout(() => void refresh(), 0);
    const minute = setInterval(() => void refresh(), 60_000);
    // Point 3 of #9: another account must never see the previous one's requests or
    // private addresses, even for a moment. Clear, then reload for the new session.
    const db = supabase();
    let currentUser: string | null | undefined;
    const subscription = db?.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (currentUser !== undefined && next !== currentUser) {
        setData(emptySharing);
        setNotifications([]);
        setNotice(null);
        synced.current = null;
        void refresh();
      }
      currentUser = next;
    });
    return () => {
      clearTimeout(first);
      clearInterval(minute);
      subscription?.data.subscription.unsubscribe();
    };
  }, [refresh]);

  const run = useCallback(
    async (action: (db: SupabaseClient) => Promise<string | null>) => {
      const db = supabase();
      if (!db) return "Mode démo : action non envoyée.";
      const sessionError = await ensureSession(db).catch(
        () => "Pas de connexion. Réessayez quand le réseau revient.",
      );
      const error =
        sessionError ??
        (await action(db).catch(() => "L’action n’a pas pu aboutir."));
      setNotice(error);
      await refresh();
      return error;
    },
    [refresh],
  );

  const markRead = useCallback(async () => {
    const db = supabase();
    if (!db) return;
    await markNotificationsRead(db).catch(() => undefined);
    await refresh();
  }, [refresh]);

  return { data, notifications, notice, run, markRead };
}
