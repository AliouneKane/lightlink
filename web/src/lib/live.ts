"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
  isRetryable,
  liveErrorMessage,
  reportRow,
  type EcgScheduleRow,
  type EnergyStatus,
  type ZoneStatusRow,
} from "./energy";

// Next.js inlines NEXT_PUBLIC_ variables at build time (web/.env.local).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Live mode needs both public values; without them the app stays a local demo. */
export const liveEnabled = Boolean(url && anonKey);

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
export function useLiveData() {
  const [zones, setZones] = useState<ZoneStatusRow[] | null>(null);
  const [schedules, setSchedules] = useState<EcgScheduleRow[]>([]);

  const refresh = useCallback(async () => {
    const db = supabase();
    if (!db) return;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [status, planned] = await Promise.all([
      db.from("zone_status").select("*"),
      db
        .from("ecg_schedules")
        .select(
          "id, zone_id, starts_at, ends_at, partial, localities, source_url",
        )
        .gte("ends_at", since)
        .order("starts_at", { ascending: false })
        .limit(200),
    ]);
    if (!status.error && status.data) setZones(status.data as ZoneStatusRow[]);
    if (!planned.error && planned.data)
      setSchedules(planned.data as EcgScheduleRow[]);
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

  return { zones, schedules, refresh };
}
