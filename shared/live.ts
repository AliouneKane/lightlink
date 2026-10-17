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
}) {
  const hasPosition = Number.isFinite(input.lat) && Number.isFinite(input.lng);
  return {
    zone_id: input.neighborhoodId,
    kind: input.status,
    description: input.description.trim().slice(0, 280),
    lat: hasPosition ? input.lat! : null,
    lng: hasPosition ? input.lng! : null,
  };
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
  if (message.includes("row-level security"))
    return "Connectez-vous pour envoyer un signalement.";
  if (/fetch|network|Failed to fetch|timeout/i.test(message))
    return "Pas de connexion. Votre signalement sera envoyé dès le retour du réseau.";
  return "Le signalement n’a pas pu être envoyé. Réessayez dans un instant.";
}

/** Network failures can be retried later; refusals by the database cannot. */
export function isRetryable(error: { message?: string }): boolean {
  return /fetch|network|Failed to fetch|timeout/i.test(error.message ?? "");
}
