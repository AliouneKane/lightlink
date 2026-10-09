import {
  DEMO_TIMESTAMP,
  getNeighborhoods,
  getOffers,
  neighborhoods,
  parseStoredState,
  validateOffer,
  validateReport,
  type DemoState,
  type EnergySource,
  type EnergyStatus,
  type OfferFilter,
} from "./energy";

/** AsyncStorage and a small in-memory adapter both satisfy this boundary. */
export interface DemoStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface DemoSnapshot {
  state: DemoState;
  ready: boolean;
  storageError: string | null;
}

export interface ReportInput {
  neighborhoodId: string;
  status: EnergyStatus;
  description: string;
}

export interface OfferInput {
  title: string;
  neighborhoodId: string;
  source: EnergySource;
  capacity: string;
  price: number;
  slots: number;
  until: string;
  description: string;
}

interface RepositoryOptions {
  now?: () => Date;
  createId?: () => string;
}

const loadingError = "Vos données locales sont encore en cours de chargement.";
export const mobileStorageKey = "lightlink.mobile.demo.v1";
const storageWarning =
  "Le stockage local est indisponible. Vos changements restent utilisables pendant cette session, mais ne seront pas conservés après fermeture.";
const ownedOfferPrefix = "mobile-offer-";

/** Ownership belongs to this local installation, independently of its display name. */
export const isOwnedOffer = (offerId: string) =>
  offerId.startsWith(ownedOfferPrefix);

function parseMobileState(value: string | null): DemoState {
  const state = parseStoredState(value);
  const requested = new Set<string>();
  return {
    ...state,
    bookings: state.bookings.filter((booking) => {
      if (isOwnedOffer(booking.offerId) || requested.has(booking.offerId))
        return false;
      requested.add(booking.offerId);
      return true;
    }),
  };
}

/**
 * All mutations update the session synchronously after hydration. Disk writes run
 * one at a time; an unavailable store never prevents using the local demo.
 */
export function createDemoRepository(
  storage: DemoStorage,
  options: RepositoryOptions = {},
) {
  let snapshot: DemoSnapshot = {
    state: parseStoredState(null),
    ready: false,
    storageError: null,
  };
  const listeners = new Set<() => void>();
  let hydration: Promise<void> | undefined;
  let writes = Promise.resolve();
  let storageAvailable = true;
  let sequence = 0;
  const now = options.now ?? (() => new Date());
  const createId =
    options.createId ??
    (() =>
      `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function storageFailed() {
    storageAvailable = false;
    snapshot = { ...snapshot, storageError: storageWarning };
    notify();
  }

  function save(state: DemoState) {
    snapshot = { ...snapshot, state };
    // Capture the serialized snapshot now, before a subsequent mutation.
    const serialized = JSON.stringify(state);
    writes = writes.then(async () => {
      if (!storageAvailable) return;
      try {
        await storage.setItem(mobileStorageKey, serialized);
      } catch {
        storageFailed();
      }
    });
    notify();
  }

  function timestamp() {
    // Keep local reports after the dated demo, even on a device with an old clock.
    // Advancing by a millisecond also orders two consecutive taps unambiguously.
    const latestReport = snapshot.state.reports.reduce(
      (latest, report) => Math.max(latest, Date.parse(report.createdAt)),
      Date.parse(DEMO_TIMESTAMP),
    );
    return new Date(Math.max(now().getTime(), latestReport + 1)).toISOString();
  }

  const repository = {
    getSnapshot: () => snapshot,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    hydrate(): Promise<void> {
      if (hydration) return hydration;
      hydration = (async () => {
        try {
          const saved = await storage.getItem(mobileStorageKey);
          snapshot = { ...snapshot, state: parseMobileState(saved) };
        } catch {
          // Do not overwrite a store whose existing contents could not be read.
          storageFailed();
        }
        snapshot = { ...snapshot, ready: true };
        notify();
      })();
      return hydration;
    },

    /** Useful for deterministic tests and orderly shutdown; UI actions need no await. */
    flush: () => writes,

    getNeighborhoods: () => getNeighborhoods(snapshot.state.reports),

    getOffers(filter: OfferFilter = "all", query = "") {
      return getOffers(
        snapshot.state.offers,
        snapshot.state.profile.neighborhoodId,
        filter,
        query,
      );
    },

    report(input: ReportInput): string | null {
      if (!snapshot.ready) return loadingError;
      const error = validateReport(input);
      if (error) return error;
      const state = snapshot.state;
      save({
        ...state,
        reports: [
          {
            id: `mobile-report-${createId()}`,
            neighborhoodId: input.neighborhoodId,
            status: input.status,
            description: input.description.trim(),
            author: state.profile.name,
            createdAt: timestamp(),
          },
          ...state.reports,
        ].slice(0, 200),
      });
      return null;
    },

    createOffer(input: OfferInput): string | null {
      if (!snapshot.ready) return loadingError;
      const error = validateOffer(input);
      if (error) return error;
      const state = snapshot.state;
      if (state.offers.length >= 100)
        return "La démo contient déjà 100 offres. Réinitialisez les données pour en créer de nouvelles.";
      const neighborhood = neighborhoods.find(
        (item) => item.id === input.neighborhoodId,
      )!;
      const initials = state.profile.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toLocaleUpperCase("fr")
        .slice(0, 4);
      save({
        ...state,
        offers: [
          {
            id: `${ownedOfferPrefix}${createId()}`,
            title: input.title.trim(),
            host: state.profile.name,
            initials,
            neighborhoodId: neighborhood.id,
            lat: neighborhood.lat,
            lng: neighborhood.lng,
            source: input.source,
            available: true,
            capacity: input.capacity.trim(),
            price: input.price,
            slots: input.slots,
            until: input.until,
            description: input.description.trim(),
          },
          ...state.offers,
        ],
      });
      return null;
    },

    requestOffer(offerId: string): string | null {
      if (!snapshot.ready) return loadingError;
      const state = snapshot.state;
      const offer = state.offers.find((item) => item.id === offerId);
      if (!offer || !offer.available || offer.slots < 1)
        return "Cette offre n’est plus disponible.";
      // Ownership survives changing the display name, without persisting auth data.
      if (isOwnedOffer(offer.id))
        return "Vous ne pouvez pas demander votre propre offre.";
      if (state.bookings.some((booking) => booking.offerId === offerId))
        return "Vous avez déjà une demande en attente pour cette offre.";
      if (state.bookings.length >= 100)
        return "La démo contient déjà 100 demandes. Annulez une demande avant de continuer.";
      save({
        ...state,
        bookings: [
          {
            id: `mobile-request-${createId()}`,
            offerId,
            createdAt: timestamp(),
          },
          ...state.bookings,
        ],
      });
      // A pending local simulation neither reserves nor consumes a host's slots.
      return null;
    },

    setOfferAvailability(offerId: string, available: boolean): string | null {
      if (!snapshot.ready) return loadingError;
      const state = snapshot.state;
      const offer = state.offers.find((item) => item.id === offerId);
      if (!offer) return "Cette offre n’est plus sur cet appareil.";
      if (!isOwnedOffer(offer.id))
        return "Vous pouvez seulement gérer les offres que vous avez publiées.";
      if (typeof available !== "boolean")
        return "Choisissez si votre offre est disponible ou suspendue.";
      if (available && offer.slots < 1)
        return "Cette offre ne contient aucune place disponible.";
      if (offer.available === available) return null;
      save({
        ...state,
        offers: state.offers.map((item) =>
          item.id === offerId ? { ...item, available } : item,
        ),
      });
      return null;
    },

    cancelRequest(bookingId: string): void {
      if (!snapshot.ready) return;
      const state = snapshot.state;
      const bookings = state.bookings.filter((item) => item.id !== bookingId);
      if (bookings.length !== state.bookings.length)
        save({ ...state, bookings });
    },

    updateProfile(profile: DemoState["profile"]): string | null {
      if (!snapshot.ready) return loadingError;
      if (
        typeof profile.name !== "string" ||
        !profile.name.trim() ||
        profile.name.trim().length > 60
      )
        return "Votre nom doit contenir entre 1 et 60 caractères.";
      if (!neighborhoods.some((item) => item.id === profile.neighborhoodId))
        return "Choisissez un quartier de la zone pilote.";
      save({
        ...snapshot.state,
        profile: {
          name: profile.name.trim(),
          neighborhoodId: profile.neighborhoodId,
        },
      });
      return null;
    },

    setNotifications(enabled: boolean): void {
      if (!snapshot.ready || typeof enabled !== "boolean") return;
      if (snapshot.state.notificationsEnabled !== enabled)
        save({ ...snapshot.state, notificationsEnabled: enabled });
    },

    reset(): void {
      if (snapshot.ready) save(parseStoredState(null));
    },
  };

  return repository;
}

export type DemoRepository = ReturnType<typeof createDemoRepository>;
