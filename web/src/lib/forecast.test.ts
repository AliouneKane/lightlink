import { describe, expect, it } from "vitest";
import {
  chartHours,
  durationLabel,
  forecastSourceLabel,
  getForecast,
  todayBounds,
  toForecast,
  type PredictionRow,
} from "../../../shared/forecast";
import {
  snapshotDay,
  snapshotPredictions,
} from "../../../shared/forecast-snapshot";
import { neighborhoods } from "./energy";

const row = (overrides: Partial<PredictionRow> = {}): PredictionRow => ({
  zone_id: "osu",
  window_start: "2026-10-20T17:00:00Z",
  window_end: "2026-10-20T19:30:00Z",
  probability: 60,
  confidence: 90,
  expected_duration_min: 150,
  hourly_risks: [0, 0, 5, 5, 10, 20, 40, 60, 50, 20, 5, 0],
  basis: "annonce ECG",
  ...overrides,
});

describe("model forecast", () => {
  it("covers every pilot zone with the real model output", () => {
    expect(snapshotDay).toBe("2026-10-16");
    expect(snapshotPredictions.map((item) => item.zone_id).sort()).toEqual(
      neighborhoods.map((zone) => zone.id).sort(),
    );
    for (const item of snapshotPredictions)
      expect(item.hourly_risks).toHaveLength(chartHours.length);
    // 16 Oct 2026: the ECG announced an outage in parts of Madina.
    const madina = getForecast("madina");
    expect(madina.announced).toBe(true);
    expect(madina.probability).toBe(45);
    expect(getForecast("osu").announced).toBe(false);
  });

  it("finds the peak, the highlighted bars and the window", () => {
    const forecast = toForecast(row(), "live");
    expect(forecast.peakIndex).toBe(7);
    expect(forecast.peakLabel).toBe("60 % vers 18 h");
    expect([forecast.peakStartIndex, forecast.peakEndIndex]).toEqual([6, 8]);
    expect([forecast.windowStart, forecast.windowEnd]).toEqual([
      "17:00",
      "19:30",
    ]);
    expect(forecast.durationLabel).toBe("2 h 30");
    expect(forecast.headline).toBe("Coupure probable");
    expect(forecast.insight).toContain("L’ECG a annoncé");
  });

  it("sums the forecast up with its confidence (tasks 105, 116, 119)", () => {
    const announced = toForecast(row(), "live");
    expect(announced.summary).toBe(
      "Coupure probable entre 17:00 et 19:30 (confiance 90 %)",
    );
    expect(announced.confidenceLevel).toBe("forte");
    expect(announced.lowData).toBe(false);
    const thin = toForecast(
      row({ probability: 30, confidence: 33, basis: "taux de base" }),
      "live",
    );
    expect(thin.confidenceLevel).toBe("faible");
    expect(thin.lowData).toBe(true);
    expect(thin.insight).toContain("pas assez de données");
    expect(
      toForecast(
        row({ probability: 5, confidence: 50, basis: "taux de base" }),
        "live",
      ).summary,
    ).toBe("Risque faible aujourd’hui (confiance 50 %)");
  });

  it("says when the risk is low and when no announcement exists", () => {
    const forecast = toForecast(
      row({
        probability: 3,
        basis: "taux de base",
        hourly_risks: Array(12).fill(0),
      }),
      "live",
    );
    expect(forecast.headline).toBe("Risque faible");
    expect(forecast.insight).toContain("Aucune annonce ECG");
    expect(forecast.peakStartIndex).toBe(forecast.peakEndIndex);
  });

  it("prefers today's live forecast and labels the demo with its day", () => {
    const live = getForecast("osu", [row()]);
    expect(live.source).toBe("live");
    expect(forecastSourceLabel(live)).toBe("Prévision du jour");
    const demo = getForecast("labone", [row()]);
    expect(demo.source).toBe("snapshot");
    expect(forecastSourceLabel(demo)).toBe("Démo · prévision du 16 oct. 2026");
  });

  it("formats durations and day bounds", () => {
    expect(durationLabel(480)).toBe("8 h");
    expect(durationLabel(45)).toBe("45 min");
    expect(todayBounds(new Date("2026-10-20T23:30:00Z"))).toEqual([
      "2026-10-20T00:00:00.000Z",
      "2026-10-21T00:00:00.000Z",
    ]);
  });
});
