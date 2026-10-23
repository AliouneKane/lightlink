import { describe, expect, it } from "vitest";
import {
  endsAtFromUntil,
  createLatestGate,
  initials,
  loadSharing,
  openSession,
  offerInsertRow,
  offerRowToOffer,
  requestRowToBooking,
  sharingErrorMessage,
  validateOffer,
  type OfferRow,
} from "./energy";

const row = (overrides: Partial<OfferRow> = {}): OfferRow => ({
  id: "o1",
  host_id: "host",
  host_name: "Akosua Mensah",
  zone_id: "osu",
  title: "Générateur du soir",
  source: "generator",
  capacity: "3 prises",
  price: "12.50",
  slots: 3,
  description: "",
  status: "available",
  ends_at: "2026-10-22T20:30:00+00:00",
  ...overrides,
});
const now = new Date("2026-10-22T15:00:00Z");

describe("live offers", () => {
  it("shows the neighbourhood centre, never the exact place", () => {
    const offer = offerRowToOffer(row(), "someone", 2, now);
    expect(offer).toMatchObject({
      host: "Akosua Mensah",
      initials: "AM",
      neighborhoodId: "osu",
      price: 12.5,
      slots: 2,
      until: "20:30",
      available: true,
      own: false,
    });
    expect(offer.lat).toBe(5.556); // Osu centre
  });

  it("knows my offers, and full or ended offers are not available", () => {
    expect(offerRowToOffer(row(), "host", 3, now).own).toBe(true);
    expect(offerRowToOffer(row(), null, 3, now).own).toBe(false);
    expect(
      offerRowToOffer(row({ status: "full" }), null, 0, now).available,
    ).toBe(false);
    expect(
      offerRowToOffer(
        row({ ends_at: "2026-10-22T14:00:00+00:00" }),
        null,
        3,
        now,
      ).available,
    ).toBe(false);
  });

  it("turns the form's end hour into a date within 12 hours", () => {
    expect(endsAtFromUntil("20:30", now)).toBe("2026-10-22T20:30:00.000Z");
    // An hour already passed means tomorrow, if still within 12 hours.
    expect(endsAtFromUntil("02:00", now)).toBe("2026-10-23T02:00:00.000Z");
    expect(endsAtFromUntil("14:00", now)).toBeNull(); // 23 hours away
    expect(endsAtFromUntil("25:00", now)).toBeNull();
  });

  it("builds the inserted row from a valid form", () => {
    const input = {
      title: "  Recharge solaire ",
      neighborhoodId: "labone",
      source: "solar" as const,
      capacity: "2 prises",
      price: 5,
      slots: 2,
      until: "20:30",
      description: "",
    };
    expect(validateOffer(input)).toBeNull();
    expect(
      offerInsertRow(input, "  ", "2026-10-22T20:30:00.000Z"),
    ).toMatchObject({
      zone_id: "labone",
      host_name: "Voisin",
      title: "Recharge solaire",
    });
  });

  it("keeps the exact place on an accepted request only", () => {
    const booking = requestRowToBooking(
      {
        id: "r1",
        offer_id: "o1",
        requester_id: "me",
        status: "accepted",
        message: "",
        created_at: "2026-10-22T15:00:00Z",
      },
      "Maison bleue",
    );
    expect(booking).toMatchObject({
      status: "accepted",
      address: "Maison bleue",
    });
  });

  it("explains the database's refusals", () => {
    expect(
      sharingErrorMessage({ message: "Too many pending requests" }),
    ).toContain("3 demandes");
    expect(
      sharingErrorMessage({ message: "You cannot request your own offer" }),
    ).toContain("propre offre");
    expect(
      sharingErrorMessage({ message: "Every place is already taken" }),
    ).toContain("places");
    expect(initials("")).toBe("LL");
  });
});

/** A tiny stand-in for the Supabase client: tables, filters and RPC results. */
function fakeDb(
  me: string | null,
  tables: Record<string, object[]>,
  options: Record<string, unknown>[],
) {
  const query = (rows: object[]) => {
    let result = rows as Record<string, unknown>[];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        result = result.filter((row) => row[column] === value);
        return builder;
      },
      gt: (column: string, value: string) => {
        result = result.filter((row) => String(row[column]) > value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        result = result.filter((row) => values.includes(row[column]));
        return builder;
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: result, error: null }),
    };
    return builder;
  };
  return {
    auth: {
      getSession: async () => ({
        data: { session: me ? { user: { id: me } } : null },
      }),
    },
    rpc: async () => ({ data: options, error: null }),
    from: (table: string) => query(tables[table] ?? []),
  };
}

describe("loading sharing data (PAN's review of #9)", () => {
  const future = new Date(Date.now() + 3600 * 1000).toISOString();

  it("keeps a suspended offer and its requests for its host (point 2)", async () => {
    const db = fakeDb(
      "host",
      {
        offers: [row({ status: "closed", ends_at: future })],
        offer_requests: [
          {
            id: "r1",
            offer_id: "o1",
            requester_id: "n",
            status: "pending",
            message: "",
            created_at: future,
          },
        ],
      },
      [],
    );
    const data = await loadSharing(db, "osu");
    expect(data?.offers).toHaveLength(1);
    expect(data?.offers[0]).toMatchObject({ own: true, available: false });
    expect(data?.incoming).toHaveLength(1);
  });

  it("passes the fixed energy places to the screens (point 5)", async () => {
    const db = fakeDb(null, {}, [
      {
        kind: "place",
        id: "p1",
        title: "Solar hub",
        source: "solar_hub",
        zone_id: "airport-residential",
        distance_km: 12.4,
        places_left: null,
      },
    ]);
    const data = await loadSharing(db, "tema-community-1");
    expect(data?.places).toEqual([
      {
        id: "p1",
        name: "Solar hub",
        kind: "solar_hub",
        zoneId: "airport-residential",
        distanceKm: 12.4,
      },
    ]);
  });
});

describe("PAN's second review of #9", () => {
  it("drops a slow read started under the previous account (point 1)", async () => {
    const gate = createLatestGate();
    const shown: string[] = [];
    let releaseA!: () => void;
    const slowA = new Promise<string>((resolve) => {
      releaseA = () => resolve("adresse privée de A");
    });
    // Same steps as the hook: take a ticket, read, apply only if still current.
    const read = async (answer: Promise<string>) => {
      const ticket = gate.take();
      const data = await answer;
      if (gate.isCurrent(ticket)) shown.push(data);
    };
    const pendingA = read(slowA); // started while A is signed in
    gate.invalidate(); // A signs out, B signs in
    await read(Promise.resolve("données de B"));
    releaseA(); // A's answer arrives last
    await pendingA;
    expect(shown).toEqual(["données de B"]);
  });

  it("saves the neighbourhood when an action opens an anonymous session (point 2)", async () => {
    const updates: unknown[] = [];
    let session: { user: { id: string } } | null = null;
    const db = {
      auth: {
        getSession: async () => ({ data: { session } }),
        signInAnonymously: async () => {
          session = { user: { id: "anon" } };
          return { error: null };
        },
      },
      from: () => ({
        update: (values: unknown) => ({
          eq: async (_column: string, id: string) => {
            updates.push({ values, id });
            return { error: null };
          },
        }),
      }),
    };
    expect(await openSession(db, "madina")).toEqual({
      error: null,
      created: true,
    });
    expect(updates).toEqual([{ values: { zone_id: "madina" }, id: "anon" }]);
    // An existing session is left as it is.
    expect(await openSession(db, "osu")).toEqual({
      error: null,
      created: false,
    });
    expect(updates).toHaveLength(1);
  });
});
