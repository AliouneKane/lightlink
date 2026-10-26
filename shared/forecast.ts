/**
 * Outage forecast shown by the apps. It comes from the rules model of prediction/
 * (real ECG announcements + per-neighbourhood base rate), never from invented numbers:
 * live mode reads the predictions table, demo mode a snapshot of the model for a real day.
 */
import { snapshotDay, snapshotPredictions } from "./forecast-snapshot";

/** A row of the predictions table (backend/supabase/migrations). */
export interface PredictionRow {
  zone_id: string;
  window_start: string;
  window_end: string;
  probability: number;
  confidence: number;
  expected_duration_min: number;
  /** Risk in % at the hours of chartHours. */
  hourly_risks: number[];
  basis: string;
}

/** Hours (GMT) of the twelve bars, as computed by prediction/lightlink_model.py. */
export const chartHours = [6, 8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 23];
export const hourLabels = ["06 h", "12 h", "18 h", "23 h"];

export interface ZoneForecast {
  riskValues: number[];
  hourLabels: string[];
  peakIndex: number;
  peakStartIndex: number;
  peakEndIndex: number;
  peakLabel: string;
  windowStart: string;
  windowEnd: string;
  durationLabel: string;
  probability: number;
  confidence: number;
  headline: string;
  /** Task 116: "Coupure probable entre X et Y (confiance Z %)". */
  summary: string;
  /** Task 105: forte from 70 %, moyenne from 40 %, faible below. */
  confidenceLevel: "forte" | "moyenne" | "faible";
  /** Task 119: no ECG announcement and too few observed days to be confident. */
  lowData: boolean;
  insight: string;
  chartDescription: string;
  announced: boolean;
  /** "live": today's forecast from the database; "snapshot": model output for a past day (demo). */
  source: "live" | "snapshot";
  dayLabel: string;
}

const time = (iso: string) => iso.slice(11, 16); // Accra is on GMT all year.

export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Accra",
  }).format(new Date(iso));
}

export function toForecast(
  row: PredictionRow,
  source: ZoneForecast["source"],
): ZoneForecast {
  const values = chartHours.map((_, index) =>
    Math.max(0, Math.min(100, Math.round(row.hourly_risks[index] ?? 0))),
  );
  const max = Math.max(...values);
  const peakIndex = values.indexOf(max);
  // Bars at half of the peak or more, around the peak, are highlighted.
  let peakStartIndex = peakIndex;
  let peakEndIndex = peakIndex;
  if (max > 0) {
    while (peakStartIndex > 0 && values[peakStartIndex - 1] >= max / 2)
      peakStartIndex--;
    while (
      peakEndIndex < values.length - 1 &&
      values[peakEndIndex + 1] >= max / 2
    )
      peakEndIndex++;
  }
  const announced = row.basis.startsWith("annonce ECG");
  const probability = Math.round(row.probability);
  const headline =
    probability >= 50
      ? "Coupure probable"
      : probability >= 20
        ? "Coupure possible"
        : "Risque faible";
  const start = time(row.window_start);
  const end = time(row.window_end);
  const confidence = Math.round(row.confidence);
  const confidenceLevel =
    confidence >= 70 ? "forte" : confidence >= 40 ? "moyenne" : "faible";
  const lowData = !announced && confidence < 40;
  // Live rows are today's (todayBounds); a demo snapshot names its own day (PAN, #10).
  const day =
    source === "live" ? "aujourd’hui" : `le ${dayLabel(row.window_start)}`;
  const summary =
    probability < 20
      ? `Risque faible ${day} (confiance ${confidence} %)`
      : `${headline} entre ${start} et ${end} (confiance ${confidence} %)`;
  const insight = announced
    ? `L’ECG a annoncé une coupure dans le quartier entre ${start} et ${end}. Rechargez vos appareils avant ${start} ou explorez les offres de votre quartier.`
    : lowData
      ? `Estimation : pas assez de données pour ce quartier. Sans annonce ECG, le risque habituel est de ${probability} % au plus fort de la journée ; la confiance montera avec les signalements des habitants.`
      : `Aucune annonce ECG : c’est le risque habituel du quartier, ${probability} % au plus fort de la journée. Les signalements des habitants affinent cette estimation.`;
  return {
    riskValues: values,
    hourLabels,
    peakIndex,
    peakStartIndex,
    peakEndIndex,
    peakLabel: `${max} % vers ${chartHours[peakIndex]} h`,
    windowStart: start,
    windowEnd: end,
    durationLabel: durationLabel(row.expected_duration_min),
    probability,
    confidence,
    headline,
    summary,
    confidenceLevel,
    lowData,
    insight,
    chartDescription: `Risque de coupure de 06 h à 23 h : au plus haut ${max} % vers ${chartHours[peakIndex]} h.`,
    announced,
    source,
    dayLabel: dayLabel(row.window_start),
  };
}

/**
 * The forecast of a neighbourhood: today's live forecast when the database has one,
 * otherwise the model's output for the snapshot day (demo mode, labelled with its date).
 */
export function getForecast(
  zoneId: string,
  liveRows: PredictionRow[] = [],
): ZoneForecast {
  const live = liveRows.find((row) => row.zone_id === zoneId);
  if (live) return toForecast(live, "live");
  const snapshot =
    snapshotPredictions.find((row) => row.zone_id === zoneId) ??
    snapshotPredictions[0];
  return toForecast(snapshot, "snapshot");
}

export { snapshotDay };

/** Start and end (exclusive) of the current day in Accra (GMT), for the predictions query. */
export function todayBounds(now: Date = new Date()): [string, string] {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return [start.toISOString(), end.toISOString()];
}

export const predictionColumns =
  "zone_id, window_start, window_end, probability, confidence, expected_duration_min, hourly_risks, basis";

/** Short label telling where the numbers come from. */
export function forecastSourceLabel(forecast: ZoneForecast): string {
  return forecast.source === "live"
    ? "Prévision du jour"
    : `Démo · prévision du ${forecast.dayLabel}`;
}
