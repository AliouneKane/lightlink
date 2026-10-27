import { describe, expect, it } from "vitest";
import {
  distanceKm,
  formatTime,
  getNeighborhoods,
  getOffers,
  initialOffers,
  initialState,
  neighborhoods,
  parseStoredState,
  seedReports,
  validateOffer,
  validateReport,
} from "./energy";

describe("demonstration neighbourhood status", () => {
  it("covers ten distinct pilot zones and does not count seed reports twice", () => {
    expect(new Set(neighborhoods.map((zone) => zone.id)).size).toBe(10);
    expect(
      getNeighborhoods(seedReports).find((zone) => zone.id === "osu")?.reports,
    ).toBe(neighborhoods.find((zone) => zone.id === "osu")?.reports);
  });

  it("uses chronological report order and counts a new report only once", () => {
    const restored = {
      id: "new-restored",
      neighborhoodId: "osu",
      status: "powered" as const,
      author: "PAN",
      createdAt: "2026-10-04T16:00:00.000Z",
      description: "",
    };
    const older = {
      ...restored,
      id: "older-outage",
      status: "outage" as const,
      createdAt: "2026-10-04T15:45:00.000Z",
    };
    const zone = getNeighborhoods([
      restored,
      older,
      ...seedReports,
      restored,
    ]).find((item) => item.id === "osu");
    expect(zone?.status).toBe("powered");
    expect(zone?.reports).toBe(
      neighborhoods.find((item) => item.id === "osu")!.reports + 2,
    );
    expect(zone?.restoration).toContain("Power back");
    expect(neighborhoods.find((item) => item.id === "osu")?.status).toBe(
      "outage",
    );
  });
});

describe("nearby energy discovery", () => {
  it("computes a known great-circle distance and handles identical coordinates", () => {
    expect(distanceKm(0, 0, 0, 1)).toBeCloseTo(111.195, 2);
    expect(distanceKm(5.556, -0.182, 5.556, -0.182)).toBe(0);
    expect(distanceKm(0, 0, 0, 180)).toBeCloseTo(20015.087, 2);
  });

  it("filters source and accent-insensitive text, then sorts nearest first", () => {
    const results = getOffers(initialOffers, "osu", "all", "");
    expect(results[0].id).toBe("offer-osu-battery");
    expect(
      results.every(
        (offer, index) =>
          index === 0 || results[index - 1].distance <= offer.distance,
      ),
    ).toBe(true);
    expect(
      getOffers(initialOffers, "osu", "solar", "PRÓJECTS").map(
        (offer) => offer.id,
      ),
    ).toEqual(["offer-cantonments-solar"]);
    expect(
      getOffers(initialOffers, "osu", "battery", "Osu").map(
        (offer) => offer.id,
      ),
    ).toEqual(["offer-osu-battery"]);
  });

  it("excludes unavailable and exhausted offers without mutating input", () => {
    const offers = initialOffers.map((offer, index) => ({
      ...offer,
      available: index !== 0,
      slots: index === 1 ? 0 : offer.slots,
    }));
    expect(getOffers(offers, "osu", "all", "")).toHaveLength(3);
    expect("distance" in offers[0]).toBe(false);
  });
});

describe("forms", () => {
  const validOffer = {
    title: "Solar charging",
    neighborhoodId: "osu",
    source: "solar",
    capacity: "2 kW",
    price: 0,
    slots: 2,
    until: "19:30",
    description: "",
  };

  it("accepts a two-tap report with an optional description", () => {
    expect(
      validateReport({
        neighborhoodId: "osu",
        status: "powered",
        description: "",
      }),
    ).toBeNull();
    expect(
      validateReport({
        neighborhoodId: "unknown",
        status: "outage",
        description: "",
      }),
    ).not.toBeNull();
    expect(
      validateReport({
        neighborhoodId: "osu",
        status: "unexpected",
        description: "",
      }),
    ).not.toBeNull();
  });

  it("validates finite contributions, whole capacity slots and clock values", () => {
    expect(validateOffer(validOffer)).toBeNull();
    expect(validateOffer({ ...validOffer, price: Number.NaN })).not.toBeNull();
    expect(validateOffer({ ...validOffer, price: -1 })).not.toBeNull();
    expect(validateOffer({ ...validOffer, slots: 1.5 })).not.toBeNull();
    expect(validateOffer({ ...validOffer, until: "24:00" })).not.toBeNull();
    expect(validateOffer({ ...validOffer, until: "18:60" })).not.toBeNull();
  });
});

describe("local storage boundary", () => {
  it("falls back for broken JSON, missing schema and an unknown profile zone", () => {
    expect(parseStoredState("{ broken")).toEqual(initialState);
    expect(parseStoredState(JSON.stringify({ profile: null }))).toEqual(
      initialState,
    );
    expect(
      parseStoredState(
        JSON.stringify({
          ...initialState,
          profile: { name: "PAN", neighborhoodId: "not-a-zone" },
        }),
      ),
    ).toEqual(initialState);
    const first = parseStoredState(null);
    first.profile.name = "Edited";
    first.offers[0].slots = 0;
    expect(parseStoredState(null)).toEqual(initialState);
  });

  it("drops invalid entries, orphaned reservations and duplicate IDs", () => {
    const stored = {
      ...initialState,
      reports: [
        ...seedReports,
        { ...seedReports[0], id: "bad-zone", neighborhoodId: "unknown" },
        {
          ...seedReports[0],
          id: "bad-date",
          createdAt: "2026-02-31T15:00:00.000Z",
        },
      ],
      offers: [
        initialOffers[0],
        initialOffers[0],
        { ...initialOffers[1], price: "free" },
      ],
      bookings: [
        {
          id: "valid",
          offerId: initialOffers[0].id,
          createdAt: "2026-10-04T16:00:00.000Z",
        },
        {
          id: "orphan",
          offerId: "missing",
          createdAt: "2026-10-04T16:00:00.000Z",
        },
      ],
    };
    const parsed = parseStoredState(JSON.stringify(stored));
    expect(parsed.reports).toHaveLength(seedReports.length);
    expect(parsed.offers).toHaveLength(1);
    expect(parsed.bookings.map((booking) => booking.id)).toEqual(["valid"]);
  });

  it("whitelists fields and keeps stored offer locations at neighbourhood centres", () => {
    const offer = {
      ...initialOffers[0],
      lat: 5.572123,
      lng: -0.165456,
      exactAddress: "private address",
      injected: true,
    };
    const parsed = parseStoredState(
      JSON.stringify({
        ...initialState,
        offers: [offer],
        admin: true,
        profile: { ...initialState.profile, role: "admin" },
        __proto__: { polluted: true },
      }),
    );
    expect(parsed.offers[0].lat).toBe(
      neighborhoods.find((zone) => zone.id === "labone")!.lat,
    );
    expect(parsed.offers[0].lng).toBe(
      neighborhoods.find((zone) => zone.id === "labone")!.lng,
    );
    expect(Object.keys(parsed.offers[0])).not.toContain("exactAddress");
    expect(Object.keys(parsed.profile)).toEqual(["name", "neighborhoodId"]);
    expect(Object.keys(parsed)).not.toContain("admin");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("Ghana time formatting", () => {
  it("uses GMT regardless of an input offset and handles invalid dates", () => {
    expect(formatTime("2026-10-04T17:42:00+02:00")).toBe("15:42");
    expect(formatTime("not-a-date")).toBe("—");
  });
});
