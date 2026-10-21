import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isRetryable,
  liveErrorMessage,
  reportRow,
  type EcgScheduleRow,
  type ZoneStatusRow,
} from "./energy";
import { predictionColumns, todayBounds, type PredictionRow } from "./forecast";
import type { QueuedReport, SendResult } from "./report-queue";

// Expo inlines EXPO_PUBLIC_ variables when bundling (mobile/.env).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Live mode needs both public values; without them the app stays a local demo.
 * EXPO_PUBLIC_LIGHTLINK_MODE=demo forces the demo (browser tests never touch the real database).
 */
export const liveEnabled =
  Boolean(url && anonKey) && process.env.EXPO_PUBLIC_LIGHTLINK_MODE !== "demo";

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!liveEnabled) return null;
  client ??= createClient(url!, anonKey!, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Two taps, no account: an anonymous session is a signed-in user for the database. */
async function ensureSession(db: SupabaseClient): Promise<SendResult | null> {
  const { data } = await db.auth.getSession();
  if (data.session) return null;
  const { error } = await db.auth.signInAnonymously();
  return error
    ? { ok: false, retry: isRetryable(error), message: liveErrorMessage(error) }
    : null;
}

/**
 * The client with a session (anonymous if needed), for energy sharing and notifications.
 * Null in demo mode or when no session can be opened.
 */
export async function sessionDb(): Promise<SupabaseClient | null> {
  const db = supabase();
  if (!db) return null;
  try {
    return (await ensureSession(db)) ? null : db;
  } catch {
    return null;
  }
}

export async function sendLiveReport(
  report: QueuedReport,
): Promise<SendResult> {
  const db = supabase();
  if (!db) return { ok: true };
  try {
    const session = await ensureSession(db);
    if (session) return session;
    // A retry after a lost answer must not add a second row (same client_id).
    const { error } = await db
      .from("outage_reports")
      .upsert(reportRow(report), {
        onConflict: "client_id",
        ignoreDuplicates: true,
      });
    return error
      ? {
          ok: false,
          retry: isRetryable(error),
          message: liveErrorMessage(error),
        }
      : { ok: true };
  } catch (error) {
    return {
      ok: false,
      retry: true,
      message: liveErrorMessage(error as Error),
    };
  }
}

export interface LiveData {
  zones: ZoneStatusRow[] | null;
  schedules: EcgScheduleRow[];
  predictions: PredictionRow[];
}

/** Neighbourhood states and the ECG schedules of the last 30 days and to come. */
export async function fetchLiveData(): Promise<LiveData | null> {
  const db = supabase();
  if (!db) return null;
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [dayStart, dayEnd] = todayBounds();
  const [status, planned, forecast] = await Promise.all([
    db.from("zone_status").select("*"),
    db
      .from("ecg_schedules")
      .select(
        "id, zone_id, starts_at, ends_at, partial, localities, source_url",
      )
      .gte("ends_at", since)
      .order("starts_at", { ascending: false })
      .limit(200),
    db
      .from("predictions")
      .select(predictionColumns)
      .gte("window_start", dayStart)
      .lt("window_start", dayEnd)
      .order("generated_at", { ascending: false }),
  ]);
  if (status.error) return null;
  return {
    zones: status.data as ZoneStatusRow[],
    schedules: planned.error ? [] : (planned.data as EcgScheduleRow[]),
    predictions: forecast.error ? [] : (forecast.data as PredictionRow[]),
  };
}

/** Task 60: calls onChange when anyone reports, so the map updates live. */
export function subscribeToReports(onChange: () => void): () => void {
  const db = supabase();
  if (!db) return () => {};
  const channel = db
    .channel("outage-reports")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "outage_reports" },
      onChange,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}
