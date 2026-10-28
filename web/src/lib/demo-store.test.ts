import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialState,
  legacyStorageKey,
  migrateLegacyState,
  parseStoredState,
  storageKey,
  syncProfileZone,
  type DemoState,
} from "./energy";

// A store written by the French interface, before the v2 key.
const ownReport = {
  ...initialState.reports[0],
  id: "report-fr",
  description: "Coupure observée à Madina.",
};
const ownOffer = {
  ...initialState.offers[0],
  id: "offer-own",
  title: "Mon panneau solaire",
};
const legacyState = {
  ...initialState,
  reports: [
    ownReport,
    // A seed report as the French interface wrote it.
    { ...initialState.reports[0], description: "Coupure confirmée." },
  ],
  offers: [ownOffer, initialState.offers[0]],
  bookings: [
    {
      id: "booking-seed",
      offerId: initialState.offers[0].id,
      createdAt: "2026-10-05T10:00:00.000Z",
    },
  ],
  profile: { name: "Madina resident", neighborhoodId: "madina" },
  notificationsEnabled: true,
};

/** The Supabase boundary with a session already open, recording profile writes. */
function sessionDb() {
  const zoneWrites: string[] = [];
  return {
    zoneWrites,
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "user-1" } } },
      }),
    },
    from: () => ({
      update: (row: { zone_id: string }) => ({
        eq: () => ({
          select: async () => {
            zoneWrites.push(row.zone_id);
            return { data: [{ id: "user-1" }], error: null };
          },
        }),
      }),
    }),
  };
}

function stubBrowserStorage(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    },
  });
  return values;
}

/** The store keeps its snapshot in module scope: each test loads it afresh. */
async function readStore(): Promise<DemoState> {
  vi.resetModules();
  const { updateDemoState } = await import("./demo-store");
  let state!: DemoState;
  updateDemoState((current) => (state = current));
  return state;
}

describe("English store upgrade (PAN's review of #16)", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the resident's v1 content, with English demo content", () => {
    const migrated = migrateLegacyState(JSON.stringify(legacyState));
    expect(migrated.profile).toEqual(legacyState.profile);
    expect(migrated.notificationsEnabled).toBe(true);
    expect(migrated.reports).toEqual([ownReport, ...initialState.reports]);
    expect(migrated.offers).toEqual([ownOffer, ...initialState.offers]);
    expect(migrated.bookings).toEqual(legacyState.bookings);
    expect(migrateLegacyState(null)).toEqual(initialState);
    expect(migrateLegacyState("{ broken")).toEqual(initialState);
  });

  it("syncs the existing neighbourhood, not the demo one, for an open session", async () => {
    const values = stubBrowserStorage({
      [legacyStorageKey]: JSON.stringify(legacyState),
    });
    const state = await readStore();
    expect(state.profile).toEqual(legacyState.profile);
    // The first live refresh writes the local neighbourhood to the profile.
    const db = sessionDb();
    expect(await syncProfileZone(db, state.profile.neighborhoodId)).toBeNull();
    expect(db.zoneWrites).toEqual(["madina"]);
    // The v2 store now exists, in English, with the same resident.
    const saved = parseStoredState(values.get(storageKey) ?? null);
    expect(saved.profile).toEqual(legacyState.profile);
    expect(saved.reports).toEqual([ownReport, ...initialState.reports]);
  });

  it("migrates once: deletes the v1 store after saving v2", async () => {
    const values = stubBrowserStorage({
      [legacyStorageKey]: JSON.stringify(legacyState),
    });
    await readStore();
    expect(values.has(legacyStorageKey)).toBe(false);
    expect(parseStoredState(values.get(storageKey) ?? null).offers[0]).toEqual(
      ownOffer,
    );
  });

  it("ignores the v1 store once a v2 store exists", async () => {
    stubBrowserStorage({
      [legacyStorageKey]: JSON.stringify(legacyState),
      [storageKey]: JSON.stringify({
        ...initialState,
        profile: { name: "Ama", neighborhoodId: "labone" },
      }),
    });
    const state = await readStore();
    expect(state.profile).toEqual({ name: "Ama", neighborhoodId: "labone" });
  });
});
