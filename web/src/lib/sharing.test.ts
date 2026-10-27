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
  host_name: "Akosua Mensah",
  zone_id: "osu",
  title: "Evening generator",
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
    const offer = offerRowToOffer(row(), false, 2, now);
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
    expect(offerRowToOffer(row(), true, 3, now).own).toBe(true);
    expect(offerRowToOffer(row(), false, 3, now).own).toBe(false);
    expect(
      offerRowToOffer(row({ status: "full" }), false, 0, now).available,
    ).toBe(false);
    expect(
      offerRowToOffer(
        row({ ends_at: "2026-10-22T14:00:00+00:00" }),
        false,
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
      title: "  Solar charging ",
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
      host_name: "Neighbour",
      title: "Solar charging",
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
      "Blue house",
    );
    expect(booking).toMatchObject({
      status: "accepted",
      address: "Blue house",
    });
  });

  it("explains the database's refusals", () => {
    expect(
      sharingErrorMessage({ message: "Too many pending requests" }),
    ).toContain("3 pending requests");
    expect(
      sharingErrorMessage({ message: "You cannot request your own offer" }),
    ).toContain("your own offer");
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
    // my_offers() returns the signed-in host's offers (migration 13), like a table.
    rpc: (name: string) =>
      name === "my_offers"
        ? query(me ? (tables.my_offers ?? []) : [])
        : Promise.resolve({ data: options, error: null }),
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
        my_offers: [row({ status: "closed", ends_at: future })],
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
      releaseA = () => resolve("A's private address");
    });
    // Same steps as the hook: take a ticket, read, apply only if still current.
    const read = async (answer: Promise<string>) => {
      const ticket = gate.take();
      const data = await answer;
      if (gate.isCurrent(ticket)) shown.push(data);
    };
    const pendingA = read(slowA); // started while A is signed in
    gate.invalidate(); // A signs out, B signs in
    await read(Promise.resolve("B's data"));
    releaseA(); // A's answer arrives last
    await pendingA;
    expect(shown).toEqual(["B's data"]);
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
          eq: (_column: string, id: string) => ({
            select: async () => {
              updates.push({ values, id });
              return { data: [{ id }], error: null };
            },
          }),
        }),
      }),
    };
    expect(await openSession(db, "madina")).toEqual({
      error: null,
      created: true,
    });
    expect(updates).toEqual([{ values: { zone_id: "madina" }, id: "anon" }]);
    // An existing session is kept, and a zone already saved is not written again.
    expect(await openSession(db, "madina")).toEqual({
      error: null,
      created: false,
    });
    expect(updates).toHaveLength(1);
  });
});

describe("PAN's third review of #9", () => {
  // A client whose profile UPDATE answers from a script: an error, or the rows changed.
  const scriptedDb = (
    answers: {
      data: { id: string }[] | null;
      error: { message: string } | null;
    }[],
  ) => {
    const attempts: string[] = [];
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
        update: (values: { zone_id: string }) => ({
          eq: () => ({
            select: async () => {
              attempts.push(values.zone_id);
              return answers.shift() ?? { data: [{ id: "anon" }], error: null };
            },
          }),
        }),
      }),
    };
    return { db, attempts };
  };

  it("retries the neighbourhood when the first PATCH was refused", async () => {
    const { db, attempts } = scriptedDb([
      { data: null, error: { message: "Failed to fetch" } },
    ]);
    // The session opens even though the profile could not be written.
    expect(await openSession(db, "madina")).toEqual({
      error: null,
      created: true,
    });
    // Network back: the next report reuses the session and writes the zone.
    expect(await openSession(db, "madina")).toEqual({
      error: null,
      created: false,
    });
    expect(attempts).toEqual(["madina", "madina"]);
    // Written once: no third attempt.
    await openSession(db, "madina");
    expect(attempts).toHaveLength(2);
  });

  it("treats an UPDATE that changed no row as a failure", async () => {
    const { db, attempts } = scriptedDb([{ data: [], error: null }]);
    await openSession(db, "osu");
    await openSession(db, "osu");
    expect(attempts).toEqual(["osu", "osu"]);
  });

  it("writes a new neighbourhood chosen after the session opened", async () => {
    const { db, attempts } = scriptedDb([]);
    await openSession(db, "madina");
    await openSession(db, "osu");
    expect(attempts).toEqual(["madina", "osu"]);
  });
});
