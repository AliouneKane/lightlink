import { describe, expect, it, vi } from "vitest";
import {
  createDemoRepository,
  mobileStorageKey as storageKey,
  type DemoStorage,
} from "./demo-repository";
import { initialState, neighborhoods, parseStoredState } from "./energy";

function memoryStorage(saved: string | null = null) {
  let value = saved;
  return {
    getItem: vi.fn(async (key: string) => (key === storageKey ? value : null)),
    setItem: vi.fn(async (key: string, next: string) => {
      if (key === storageKey) value = next;
    }),
    read: () => value,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

const report = {
  neighborhoodId: "labone",
  status: "outage" as const,
  description: "Outage observed during the demo.",
};

const offer = {
  title: "Recharge solaire du quartier",
  neighborhoodId: "madina",
  source: "solar" as const,
  capacity: "Phones and laptops",
  price: 0,
  slots: 3,
  until: "21:00",
  description: "Simulated local offer.",
};

function testOptions() {
  let id = 0;
  return {
    now: () => new Date("2026-10-07T12:00:00.000Z"),
    createId: () => `test-${++id}`,
  };
}

describe("mobile local persistence", () => {
  it("reads and validates saved state before allowing any write", async () => {
    const pendingRead = deferred<string | null>();
    const storage = {
      getItem: vi.fn(() => pendingRead.promise),
      setItem: vi.fn(async (key: string, value: string) => {
        expect(key).toBe(storageKey);
        expect(value).toEqual(expect.any(String));
      }),
    };
    const repository = createDemoRepository(storage, testOptions());
    const hydration = repository.hydrate();
    expect(repository.hydrate()).toBe(hydration);
    expect(repository.report(report)).toMatch(/loading/);
    expect(repository.createOffer(offer)).toMatch(/loading/);
    expect(repository.requestOffer("offer-osu-battery")).toMatch(/loading/);
    expect(repository.setOfferAvailability("offer-osu-battery", false)).toMatch(
      /loading/,
    );
    repository.setNotifications(true);
    repository.reset();
    expect(storage.setItem).not.toHaveBeenCalled();
    const saved = {
      ...initialState,
      password: "not-persisted",
      profile: { name: "Ama", neighborhoodId: "madina", role: "admin" },
      reports: [
        ...initialState.reports,
        { ...initialState.reports[0], neighborhoodId: "unknown" },
      ],
    };
    pendingRead.resolve(JSON.stringify(saved));
    await hydration;
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(storageKey);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(repository.getSnapshot().ready).toBe(true);
    expect(repository.getSnapshot().state.profile).toEqual({
      name: "Ama",
      neighborhoodId: "madina",
    });
    expect(repository.getSnapshot().state.reports).toHaveLength(
      initialState.reports.length,
    );
    repository.setNotifications(true);
    await repository.flush();
    const persisted = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(persisted).not.toHaveProperty("password");
    expect(persisted.profile).not.toHaveProperty("role");
    expect(persisted.profile.name).toBe("Ama");
  });

  it("serializes writes so a slower previous save cannot replace a newer one", async () => {
    const firstWrite = deferred<void>();
    let value: string | null = null;
    let writeIndex = 0;
    const storage: DemoStorage = {
      getItem: async () => null,
      setItem: vi.fn(async (key, next) => {
        expect(key).toBe(storageKey);
        if (++writeIndex === 1) await firstWrite.promise;
        value = next;
      }),
    };
    const repository = createDemoRepository(storage);
    await repository.hydrate();
    repository.updateProfile({ name: "Ama", neighborhoodId: "osu" });
    repository.updateProfile({ name: "Amadou", neighborhoodId: "madina" });
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(repository.getSnapshot().state.profile.name).toBe("Amadou");
    firstWrite.resolve();
    await repository.flush();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(parseStoredState(value).profile).toEqual({
      name: "Amadou",
      neighborhoodId: "madina",
    });
  });

  it("preserves write order when a subscriber synchronously changes the state", async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage);
    await repository.hydrate();
    let changed = false;
    const unsubscribe = repository.subscribe(() => {
      if (!changed) {
        changed = true;
        repository.setNotifications(true);
      }
    });
    repository.updateProfile({ name: "Ama", neighborhoodId: "madina" });
    await repository.flush();
    unsubscribe();
    expect(parseStoredState(storage.read())).toMatchObject({
      profile: { name: "Ama", neighborhoodId: "madina" },
      notificationsEnabled: true,
    });
  });

  it("keeps a usable session after a read error without overwriting unread data", async () => {
    const storage = {
      getItem: vi.fn(async () => {
        throw new Error("Access denied");
      }),
      setItem: vi.fn(async () => {}),
    };
    const repository = createDemoRepository(storage, testOptions());
    await repository.hydrate();
    expect(repository.getSnapshot().ready).toBe(true);
    expect(repository.getSnapshot().storageError).toMatch(/session/);
    expect(repository.report(report)).toBeNull();
    await repository.flush();
    expect(
      repository.getNeighborhoods().find((zone) => zone.id === "labone")
        ?.status,
    ).toBe("outage");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("absorbs a write failure, exposes a warning and retains subsequent edits", async () => {
    const storage = {
      getItem: vi.fn(async () => null),
      setItem: vi.fn(async () => {
        throw new Error("Storage full");
      }),
    };
    const repository = createDemoRepository(storage, testOptions());
    await repository.hydrate();
    repository.report(report);
    repository.createOffer(offer);
    await repository.flush();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(repository.getSnapshot().storageError).toMatch(/Local storage/);
    expect(repository.getSnapshot().state.offers).toHaveLength(6);
    repository.updateProfile({ name: "Ama", neighborhoodId: "madina" });
    await repository.flush();
    expect(repository.getSnapshot().state.profile.name).toBe("Ama");
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("falls back safely for malformed saved JSON and persists valid changes", async () => {
    const storage = memoryStorage("{broken");
    const repository = createDemoRepository(storage);
    await repository.hydrate();
    expect(repository.getSnapshot().state).toEqual(initialState);
    expect(repository.getSnapshot().storageError).toBeNull();
    repository.setNotifications(true);
    await repository.flush();
    expect(parseStoredState(storage.read()).notificationsEnabled).toBe(true);
  });
});

describe("mobile neighborhood and sharing journeys", () => {
  it("reports outage and restoration with profile attribution, UTC ordering and reload", async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage, testOptions());
    await repository.hydrate();
    repository.updateProfile({ name: " Ama ", neighborhoodId: "labone" });
    expect(repository.report(report)).toBeNull();
    expect(
      repository.getNeighborhoods().find((zone) => zone.id === "labone")
        ?.status,
    ).toBe("outage");
    expect(repository.report({ ...report, status: "powered" })).toBeNull();
    const reports = repository.getSnapshot().state.reports;
    expect(reports[0]).toMatchObject({
      author: "Ama",
      status: "powered",
      createdAt: "2026-10-07T12:00:00.001Z",
    });
    expect(Date.parse(reports[0].createdAt)).toBeGreaterThan(
      Date.parse(reports[1].createdAt),
    );
    await repository.flush();
    const reopened = createDemoRepository(storage);
    await reopened.hydrate();
    expect(
      reopened.getNeighborhoods().find((zone) => zone.id === "labone"),
    ).toMatchObject({ status: "powered", reports: 10 });
  });

  it("validates publishing, fixes locations to centers and retains local ownership after renaming", async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage, testOptions());
    await repository.hydrate();
    const before = repository.getSnapshot().state;
    expect(
      repository.createOffer({ ...offer, price: Number.NaN }),
    ).not.toBeNull();
    expect(repository.createOffer({ ...offer, slots: 1.5 })).not.toBeNull();
    expect(repository.createOffer({ ...offer, until: "24:00" })).not.toBeNull();
    expect(repository.getSnapshot().state).toBe(before);
    expect(repository.createOffer(offer)).toBeNull();
    const published = repository.getSnapshot().state.offers[0];
    const neighborhood = neighborhoods.find((zone) => zone.id === "madina")!;
    expect(published).toMatchObject({
      host: "PAN",
      initials: "P",
      lat: neighborhood.lat,
      lng: neighborhood.lng,
      price: 0,
    });
    repository.updateProfile({ name: "Kwame", neighborhoodId: "madina" });
    expect(repository.requestOffer(published.id)).toMatch(/your own offer/);
    expect(
      repository.getOffers("solar", "Recharge solaire du quartier")[0].id,
    ).toBe(published.id);
    await repository.flush();
    const reopened = createDemoRepository(storage);
    await reopened.hydrate();
    expect(reopened.requestOffer(published.id)).toMatch(/your own offer/);
  });

  it("creates one pending request without consuming slots, survives reload and cancels", async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage, testOptions());
    await repository.hydrate();
    expect(repository.requestOffer("missing")).toMatch(/available/);
    const available = repository.getOffers()[0];
    expect(repository.requestOffer(available.id)).toBeNull();
    expect(repository.requestOffer(available.id)).toMatch(/already/);
    expect(
      repository
        .getSnapshot()
        .state.offers.find((item) => item.id === available.id)?.slots,
    ).toBe(available.slots);
    await repository.flush();
    const reopened = createDemoRepository(storage);
    await reopened.hydrate();
    const pending = reopened.getSnapshot().state.bookings[0];
    expect(pending.offerId).toBe(available.id);
    reopened.cancelRequest(pending.id);
    await reopened.flush();
    expect(parseStoredState(storage.read()).bookings).toEqual([]);
    expect(reopened.requestOffer(available.id)).toBeNull();
    await reopened.flush();
  });

  it("only suspends and reactivates locally owned offers, including after a restart", async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage, testOptions());
    await repository.hydrate();
    expect(repository.setOfferAvailability("missing", false)).toMatch(/device/);
    expect(
      repository.setOfferAvailability(initialState.offers[0].id, false),
    ).toMatch(/only manage/);
    expect(storage.setItem).not.toHaveBeenCalled();
    repository.createOffer(offer);
    const published = repository.getSnapshot().state.offers[0];
    expect(repository.setOfferAvailability(published.id, false)).toBeNull();
    expect(
      repository.getOffers().some((item) => item.id === published.id),
    ).toBe(false);
    expect(repository.getSnapshot().state.offers[0]).toMatchObject({
      available: false,
      slots: offer.slots,
    });
    await repository.flush();
    const writeCount = storage.setItem.mock.calls.length;
    expect(repository.setOfferAvailability(published.id, false)).toBeNull();
    await repository.flush();
    expect(storage.setItem).toHaveBeenCalledTimes(writeCount);
    const reopened = createDemoRepository(storage);
    await reopened.hydrate();
    reopened.updateProfile({ name: "Ama", neighborhoodId: "osu" });
    expect(reopened.getSnapshot().state.offers[0].available).toBe(false);
    expect(reopened.setOfferAvailability(published.id, true)).toBeNull();
    expect(reopened.getOffers().some((item) => item.id === published.id)).toBe(
      true,
    );
    expect(reopened.requestOffer(published.id)).toMatch(/your own offer/);
    await reopened.flush();
    const nextSession = createDemoRepository(storage);
    await nextSession.hydrate();
    expect(nextSession.getSnapshot().state.offers[0].available).toBe(true);
  });

  it("drops duplicate and self requests at hydration without changing shared parsing", async () => {
    const owned = {
      ...initialState.offers[0],
      id: "mobile-offer-old",
      slots: 0,
    };
    const createdAt = "2026-10-07T12:00:00.000Z";
    const storage = memoryStorage(
      JSON.stringify({
        ...initialState,
        offers: [owned, ...initialState.offers],
        bookings: [
          { id: "first", offerId: initialState.offers[0].id, createdAt },
          { id: "duplicate", offerId: initialState.offers[0].id, createdAt },
          { id: "self", offerId: owned.id, createdAt },
        ],
      }),
    );
    const repository = createDemoRepository(storage);
    await repository.hydrate();
    expect(
      repository.getSnapshot().state.bookings.map((item) => item.id),
    ).toEqual(["first"]);
    expect(repository.setOfferAvailability(owned.id, true)).toMatch(
      /no available place/,
    );
    expect(
      repository.setOfferAvailability(owned.id, "yes" as unknown as boolean),
    ).toMatch(/available or paused/);
    expect(storage.setItem).not.toHaveBeenCalled();
    repository.setNotifications(true);
    await repository.flush();
    expect(parseStoredState(storage.read()).bookings).toHaveLength(1);
  });

  it("caps reports at the persistence limit and resets the entire local scenario", async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage, testOptions());
    await repository.hydrate();
    for (let index = 0; index < 205; index++)
      expect(
        repository.report({ ...report, description: `Rapport ${index}` }),
      ).toBeNull();
    expect(repository.getSnapshot().state.reports).toHaveLength(200);
    expect(repository.getSnapshot().state.reports[0].description).toBe(
      "Rapport 204",
    );
    repository.createOffer(offer);
    repository.requestOffer("offer-osu-battery");
    repository.setNotifications(true);
    repository.updateProfile({ name: "Ama", neighborhoodId: "madina" });
    repository.reset();
    await repository.flush();
    expect(repository.getSnapshot().state).toEqual(initialState);
    expect(parseStoredState(storage.read())).toEqual(initialState);
  });

  it("rejects invalid profile and report inputs without saving", async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage);
    await repository.hydrate();
    expect(
      repository.updateProfile({ name: " ", neighborhoodId: "osu" }),
    ).not.toBeNull();
    expect(
      repository.updateProfile({ name: "Ama", neighborhoodId: "unknown" }),
    ).not.toBeNull();
    expect(
      repository.report({ ...report, neighborhoodId: "unknown" }),
    ).not.toBeNull();
    expect(
      repository.report({ ...report, description: "a".repeat(501) }),
    ).not.toBeNull();
    await repository.flush();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("protects exhausted offers and enforces offer and request storage limits", async () => {
    const offers = Array.from({ length: 100 }, (_, index) => ({
      ...initialState.offers[0],
      id: `full-demo-offer-${index}`,
      available: index !== 1,
      slots: index === 2 ? 0 : 3,
    }));
    const bookings = Array.from({ length: 100 }, (_, index) => ({
      id: `full-demo-request-${index}`,
      offerId: offers[index].id,
      createdAt: "2026-10-07T12:00:00.000Z",
    }));
    const storage = memoryStorage(
      JSON.stringify({ ...initialState, offers, bookings }),
    );
    const repository = createDemoRepository(storage);
    await repository.hydrate();
    expect(repository.createOffer(offer)).toMatch(/100 offers/);
    expect(repository.requestOffer(offers[1].id)).toMatch(/available/);
    expect(repository.requestOffer(offers[2].id)).toMatch(/available/);
    expect(repository.getSnapshot().state.bookings).toHaveLength(100);
    expect(repository.requestOffer(offers[3].id)).toMatch(/already/);
    await repository.flush();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
