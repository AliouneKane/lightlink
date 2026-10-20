import { describe, expect, it } from "vitest";
import {
  applyLiveStatus,
  getZoneAnnouncements,
  isRetryable,
  liveErrorMessage,
  neighborhoods,
  reportRow,
  scheduleRowsToAnnouncements,
  newClientId,
  withoutLiveData,
  type ZoneStatusRow,
} from "./energy";

const row = (overrides: Partial<ZoneStatusRow>): ZoneStatusRow => ({
  zone_id: "osu",
  status: "powered",
  outage_reports: 0,
  restored_reports: 0,
  powered_reports: 0,
  last_report_at: null,
  planned_now: false,
  planned_until: null,
  outage_origin: null,
  ...overrides,
});

describe("live neighbourhood state", () => {
  it("replaces the demo state with the database state", () => {
    const zones = applyLiveStatus(neighborhoods, [
      row({
        zone_id: "osu",
        status: "confirmed_outage",
        outage_reports: 3,
        outage_origin: "surprise",
      }),
      row({
        zone_id: "labone",
        status: "probable_outage",
        outage_reports: 1,
        outage_origin: "surprise",
      }),
      row({ zone_id: "madina", status: "powered", powered_reports: 2 }),
    ]);
    const byId = Object.fromEntries(zones.map((zone) => [zone.id, zone]));
    expect(byId.osu.status).toBe("outage");
    expect(byId.osu.reports).toBe(3);
    expect(byId.osu.restoration).toContain("non annoncée");
    expect(byId.labone.status).toBe("unstable");
    expect(byId.madina.status).toBe("powered");
    expect(byId.madina.reports).toBe(2);
    // Zones absent from the database keep their state.
    expect(byId.achimota).toEqual(
      neighborhoods.find((zone) => zone.id === "achimota"),
    );
  });

  it("separates ECG planned outages from surprises", () => {
    const [osu] = applyLiveStatus(neighborhoods, [
      row({
        status: "confirmed_outage",
        outage_reports: 4,
        planned_now: true,
        planned_until: "2026-10-17T17:00:00Z",
        outage_origin: "planned",
      }),
    ]);
    expect(osu.restoration).toBe(
      "Coupure prévue par l’ECG · fin annoncée 17:00",
    );
    const [announcedOnly] = applyLiveStatus(neighborhoods, [
      row({ planned_now: true, planned_until: "2026-10-17T17:00:00Z" }),
    ]);
    expect(announcedOnly.status).toBe("powered");
    expect(announcedOnly.restoration).toBe(
      "Coupure annoncée par l’ECG jusqu’à 17:00",
    );
  });
});

describe("live ECG schedules", () => {
  it("maps database rows and never adds a demo announcement", () => {
    const schedules = scheduleRowsToAnnouncements([
      {
        id: "s1",
        zone_id: "madina",
        starts_at: "2026-10-17T09:00:00+00:00",
        ends_at: "2026-10-17T17:00:00+00:00",
        partial: true,
        localities: "Parts of Madina",
        source_url: "https://example.org",
      },
    ]);
    expect(schedules[0]).toMatchObject({
      neighborhoodId: "madina",
      partial: true,
      demo: false,
    });
    const live = getZoneAnnouncements(
      "osu",
      new Date("2026-10-17T12:00:00Z"),
      schedules,
      false,
    );
    expect(live).toEqual([]);
  });
});

describe("live reports", () => {
  it("builds the database row, position only when complete", () => {
    expect(
      reportRow({
        neighborhoodId: "osu",
        status: "powered",
        description: "  ok  ",
      }),
    ).toEqual({
      zone_id: "osu",
      kind: "powered",
      description: "ok",
      lat: null,
      lng: null,
    });
    expect(
      reportRow({
        neighborhoodId: "osu",
        status: "outage",
        description: "",
        lat: 5.55,
        lng: Number.NaN,
      }).lat,
    ).toBeNull();
    expect(
      reportRow({
        neighborhoodId: "osu",
        status: "outage",
        description: "",
        lat: 5.55,
        lng: -0.18,
      }).lng,
    ).toBe(-0.18);
  });

  it("explains database refusals and keeps network failures for retry", () => {
    expect(
      liveErrorMessage({ message: "Too many reports, try again later" }),
    ).toContain("5 signalements");
    expect(
      liveErrorMessage({
        message: "Position too far from the reported neighbourhood",
      }),
    ).toContain("trop loin");
    expect(isRetryable({ message: "TypeError: Failed to fetch" })).toBe(true);
    expect(isRetryable({ message: "Too many reports, try again later" })).toBe(
      false,
    );
  });
});

describe("PAN's review of #6", () => {
  it("never shows a demo state while live data is missing", () => {
    for (const state of ["loading", "error"] as const) {
      const zones = withoutLiveData(neighborhoods, state);
      expect(zones.every((zone) => zone.reports === 0)).toBe(true);
      expect(zones.some((zone) => zone.status !== "powered")).toBe(false);
    }
    expect(withoutLiveData(neighborhoods, "error")[0].restoration).toBe(
      "Données en direct indisponibles",
    );
  });

  it("does not promise an automatic resend on the web", () => {
    const message = liveErrorMessage({ message: "TypeError: Failed to fetch" });
    expect(message).toContain("réessayez");
    expect(message).not.toContain("sera envoyé");
  });

  it("sends the observation time and a stable id only when given", () => {
    const clientId = newClientId();
    expect(clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(
      reportRow({
        neighborhoodId: "osu",
        status: "outage",
        description: "",
        observedAt: "2026-10-20T07:00:00.000Z",
        clientId,
      }),
    ).toMatchObject({
      observed_at: "2026-10-20T07:00:00.000Z",
      client_id: clientId,
    });
  });
});
