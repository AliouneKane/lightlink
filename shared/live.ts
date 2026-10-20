/**
 * Live mode: converts what the Supabase database returns into what the screens show.
 * Pure functions only, so web and mobile share them and tests need no server.
 * Each app calls the database itself (web/src/lib/live.ts, mobile/src/lib/live.ts).
 */
import type { EcgAnnouncement } from "./announcements";
import type { EnergyStatus, Neighborhood } from "./energy";
import { formatTime } from "./energy";

/** A row of the zone_status view (backend/supabase/migrations). */
export interface ZoneStatusRow {
  zone_id: string;
  status: "powered" | "probable_outage" | "confirmed_outage";
  outage_reports: number;
  restored_reports: number;
  powered_reports: number;
  last_report_at: string | null;
  planned_now: boolean;
  planned_until: string | null;
  outage_origin: "planned" | "surprise" | null;
}

/** A row of the ecg_schedules table. */
export interface EcgScheduleRow {
  id: string;
  zone_id: string;
  starts_at: string;
  ends_at: string;
  partial: boolean;
  localities: string;
  source_url: string | null;
}

const liveStatus: Record<ZoneStatusRow["status"], EnergyStatus> = {
  powered: "powered",
  // Fewer than 3 reports: shown as "to confirm", like the demo's unstable state.
  probable_outage: "unstable",
  confirmed_outage: "outage",
};

/** Replaces the demo state of each neighbourhood by the live one, when the database knows it. */
export function applyLiveStatus(
  zones: Neighborhood[],
  rows: ZoneStatusRow[],
): Neighborhood[] {
  const byZone = new Map(rows.map((row) => [row.zone_id, row]));
  return zones.map((zone) => {
    const row = byZone.get(zone.id);
    if (!row) return zone;
    const status = liveStatus[row.status];
    return {
      ...zone,
      status,
      reports:
        Number(row.outage_reports) +
        Number(row.restored_reports) +
        Number(row.powered_reports),
      restoration: restorationLabel(row, status),
    };
  });
}

/**
 * Live mode before the database answered: no demo state may pass for a live one.
 * Reports are zeroed and the label says why; screens hide the state colours.
 */
export function withoutLiveData(
  zones: Neighborhood[],
  state: "loading" | "error",
): Neighborhood[] {
  const label =
    state === "loading"
      ? "Chargement des données en direct…"
      : "Données en direct indisponibles";
  return zones.map((zone) => ({
    ...zone,
    status: "powered",
    reports: 0,
    restoration: label,
  }));
}

function restorationLabel(row: ZoneStatusRow, status: EnergyStatus): string {
  const until = row.planned_until ? formatTime(row.planned_until) : null;
  if (status === "powered")
    return until
      ? `Coupure annoncée par l’ECG jusqu’à ${until}`
      : "Courant disponible";
  if (row.outage_origin === "planned")
    return until
      ? `Coupure prévue par l’ECG · fin annoncée ${until}`
      : "Coupure prévue par l’ECG";
  return status === "outage"
    ? "Coupure non annoncée · confirmée par les habitants"
    : "Coupure non annoncée · à confirmer";
}

export function scheduleRowsToAnnouncements(
  rows: EcgScheduleRow[],
): EcgAnnouncement[] {
  return rows.map((row) => ({
    id: row.id,
    neighborhoodId: row.zone_id,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    partial: row.partial,
    localities: row.localities || "Quartier",
    sourceUrl: row.source_url ?? "",
    demo: false,
  }));
}

/** The row an app inserts in outage_reports. The user id is filled in by the database. */
export function reportRow(input: {
  neighborhoodId: string;
  status: EnergyStatus;
  description: string;
  lat?: number;
  lng?: number;
  /** When the resident saw it; omitted, the database uses the reception time. */
  observedAt?: string;
  /** Same on every retry of a queued report, so the database stores it once. */
  clientId?: string;
}) {
  const hasPosition = Number.isFinite(input.lat) && Number.isFinite(input.lng);
  return {
    zone_id: input.neighborhoodId,
    kind: input.status,
    description: input.description.trim().slice(0, 280),
    lat: hasPosition ? input.lat! : null,
    lng: hasPosition ? input.lng! : null,
    ...(input.observedAt ? { observed_at: input.observedAt } : {}),
    ...(input.clientId ? { client_id: input.clientId } : {}),
  };
}

/** Random UUID v4, also on phones where crypto.randomUUID is missing. */
export function newClientId(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues)
    globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
}

/** Database and network errors, in words a resident understands. */
export function liveErrorMessage(error: {
  message?: string;
  code?: string;
}): string {
  const message = error.message ?? "";
  if (message.includes("Too many reports"))
    return "Vous avez déjà envoyé 5 signalements en 10 minutes. Réessayez un peu plus tard.";
  if (message.includes("too far"))
    return "Votre position est trop loin de ce quartier. Choisissez le quartier où vous êtes.";
  if (message.includes("Observation older than 24 hours"))
    return "Ce signalement date de plus de 24 heures : il n’a pas été envoyé.";
  if (message.includes("Observation time is in the future"))
    return "L’heure de votre téléphone semble fausse. Vérifiez-la, puis réessayez.";
  if (message.includes("row-level security"))
    return "Connectez-vous pour envoyer un signalement.";
  if (/fetch|network|Failed to fetch|timeout/i.test(message))
    return "Pas de connexion. Votre signalement n’a pas été envoyé : réessayez quand le réseau revient.";
  return "Le signalement n’a pas pu être envoyé. Réessayez dans un instant.";
}

/** Network failures can be retried later; refusals by the database cannot. */
export function isRetryable(error: { message?: string }): boolean {
  return /fetch|network|Failed to fetch|timeout/i.test(error.message ?? "");
}
