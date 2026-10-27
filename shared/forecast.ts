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
export const hourLabels = ["06:00", "12:00", "18:00", "23:00"];

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
  /** Task 116: "Likely outage between X and Y (confidence Z%)". */
  summary: string;
  /** Task 105: high from 70 %, medium from 40 %, low below. */
  confidenceLevel: "high" | "medium" | "low";
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
  return rest
    ? `${hours} h ${String(rest).padStart(2, "0")} min`
    : `${hours} h`;
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
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
      ? "Likely outage"
      : probability >= 20
        ? "Possible outage"
        : "Low risk";
  const start = time(row.window_start);
  const end = time(row.window_end);
  const confidence = Math.round(row.confidence);
  const confidenceLevel =
    confidence >= 70 ? "high" : confidence >= 40 ? "medium" : "low";
  const lowData = !announced && confidence < 40;
  // Live rows are today's (todayBounds); a demo snapshot names its own day (PAN, #10).
  const day = source === "live" ? "today" : `on ${dayLabel(row.window_start)}`;
  const summary =
    probability < 20
      ? `Low risk ${day} (confidence ${confidence}%)`
      : `${headline} between ${start} and ${end} (confidence ${confidence}%)`;
  const insight = announced
    ? `The ECG announced an outage in the neighbourhood between ${start} and ${end}. Charge your devices before ${start} or look at the offers near you.`
    : lowData
      ? `Estimate: not enough data for this neighbourhood yet. Without an ECG announcement, the usual risk is ${probability}% at the peak of the day; confidence will grow with residents’ reports.`
      : `No ECG announcement: this is the neighbourhood’s usual risk, ${probability}% at the peak of the day. Residents’ reports refine this estimate.`;
  return {
    riskValues: values,
    hourLabels,
    peakIndex,
    peakStartIndex,
    peakEndIndex,
    peakLabel: `${max}% around ${String(chartHours[peakIndex]).padStart(2, "0")}:00`,
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
    chartDescription: `Outage risk from 06:00 to 23:00: highest at ${max}% around ${String(chartHours[peakIndex]).padStart(2, "0")}:00.`,
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
    ? "Today’s forecast"
    : `Demo · forecast for ${forecast.dayLabel}`;
}
