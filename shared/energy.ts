/**
 * Local demonstration data. This module does not claim to report live outages.
 * Offer coordinates always identify a neighbourhood centre, never a host address.
 */
export type EnergyStatus = "powered" | "outage" | "unstable";
/** A neighbourhood is "unknown" in live mode while the database has not answered. */
export type NeighborhoodStatus = EnergyStatus | "unknown";
export type EnergySource = "solar" | "generator" | "battery";
export type OfferFilter = "all" | EnergySource;

export interface Neighborhood {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: NeighborhoodStatus;
  reports: number;
  restoration: string;
  /** End of the ECG outage announced right now in this zone (live mode, task 67). */
  plannedUntil?: string;
  risk: number;
  confidence: number;
}

export interface EnergyOffer {
  id: string;
  title: string;
  host: string;
  initials: string;
  neighborhoodId: string;
  lat: number;
  lng: number;
  source: EnergySource;
  available: boolean;
  capacity: string;
  /** Suggested contribution in GHS. No payment is collected in this demo. */
  price: number;
  slots: number;
  until: string;
  description: string;
}

export interface CommunityReport {
  id: string;
  neighborhoodId: string;
  status: EnergyStatus;
  author: string;
  createdAt: string;
  description: string;
}

export interface Booking {
  id: string;
  offerId: string;
  createdAt: string;
}

export interface DemoState {
  reports: CommunityReport[];
  offers: EnergyOffer[];
  bookings: Booking[];
  profile: { name: string; neighborhoodId: string };
  notificationsEnabled: boolean;
}

export const storageKey = "lightlink.demo.v1";
export const DEMO_TIMESTAMP = "2026-10-04T15:42:00.000Z";
export const DEMO_LABEL =
  "Données de démonstration · 4 octobre 2026, 15:42 GMT";

/** Risk and confidence are illustrative percentages, not model predictions. */
export const neighborhoods: Neighborhood[] = [
  {
    id: "osu",
    name: "Osu",
    lat: 5.556,
    lng: -0.182,
    status: "outage",
    reports: 24,
    restoration: "Estimation démo · 17:30",
    risk: 82,
    confidence: 92,
  },
  {
    id: "labone",
    name: "Labone",
    lat: 5.571,
    lng: -0.166,
    status: "powered",
    reports: 8,
    restoration: "Courant disponible",
    risk: 12,
    confidence: 88,
  },
  {
    id: "east-legon",
    name: "East Legon",
    lat: 5.635,
    lng: -0.158,
    status: "unstable",
    reports: 17,
    restoration: "Alimentation intermittente",
    risk: 61,
    confidence: 81,
  },
  {
    id: "adabraka",
    name: "Adabraka",
    lat: 5.57,
    lng: -0.213,
    status: "outage",
    reports: 19,
    restoration: "Estimation démo · 18:00",
    risk: 76,
    confidence: 86,
  },
  {
    id: "cantonments",
    name: "Cantonments",
    lat: 5.579,
    lng: -0.173,
    status: "powered",
    reports: 6,
    restoration: "Courant disponible",
    risk: 9,
    confidence: 90,
  },
  {
    id: "dansoman",
    name: "Dansoman",
    lat: 5.548,
    lng: -0.263,
    status: "unstable",
    reports: 13,
    restoration: "Alimentation intermittente",
    risk: 55,
    confidence: 78,
  },
  {
    id: "airport-residential",
    name: "Airport Residential",
    lat: 5.609,
    lng: -0.189,
    status: "powered",
    reports: 7,
    restoration: "Courant disponible",
    risk: 15,
    confidence: 85,
  },
  {
    id: "achimota",
    name: "Achimota",
    lat: 5.628,
    lng: -0.225,
    status: "outage",
    reports: 16,
    restoration: "Estimation démo · 18:30",
    risk: 72,
    confidence: 84,
  },
  {
    id: "madina",
    name: "Madina",
    lat: 5.671,
    lng: -0.165,
    status: "unstable",
    reports: 11,
    restoration: "Alimentation intermittente",
    risk: 58,
    confidence: 79,
  },
  {
    id: "tema-community-1",
    name: "Tema Community 1",
    lat: 5.642,
    lng: 0.004,
    status: "powered",
    reports: 9,
    restoration: "Courant disponible",
    risk: 18,
    confidence: 83,
  },
];

export const initialOffers: EnergyOffer[] = [
  {
    id: "offer-labone-solar",
    title: "Un bureau, du soleil et du Wi-Fi",
    host: "Esi A.",
    initials: "EA",
    neighborhoodId: "labone",
    lat: 5.571,
    lng: -0.166,
    source: "solar",
    available: true,
    capacity: "2 kW · ordinateurs et téléphones",
    price: 10,
    slots: 4,
    until: "19:00",
    description:
      "Espace de travail partagé alimenté par des panneaux solaires. Contribution conseillée pour l’accueil, sans paiement dans cette démo.",
  },
  {
    id: "offer-osu-battery",
    title: "Recharge express à Osu",
    host: "Kwame O.",
    initials: "KO",
    neighborhoodId: "osu",
    lat: 5.556,
    lng: -0.182,
    source: "battery",
    available: true,
    capacity: "1 kWh · petits appareils",
    price: 5,
    slots: 3,
    until: "18:00",
    description:
      "Batterie de secours pour recharger téléphones et ordinateurs. Point exact communiqué seulement après acceptation.",
  },
  {
    id: "offer-cantonments-solar",
    title: "Énergie solaire pour vos projets",
    host: "Akosua M.",
    initials: "AM",
    neighborhoodId: "cantonments",
    lat: 5.579,
    lng: -0.173,
    source: "solar",
    available: true,
    capacity: "3 kW · 6 prises disponibles",
    price: 15,
    slots: 6,
    until: "20:00",
    description:
      "Quelques places dans un espace convivial avec installation solaire et batterie de stockage.",
  },
  {
    id: "offer-adabraka-generator",
    title: "Un relais énergie à Adabraka",
    host: "Kofi B.",
    initials: "KB",
    neighborhoodId: "adabraka",
    lat: 5.57,
    lng: -0.213,
    source: "generator",
    available: true,
    capacity: "5 kVA · matériel léger",
    price: 20,
    slots: 2,
    until: "18:30",
    description:
      "Groupe électrogène avec places de recharge. La contribution conseillée aide à couvrir le carburant.",
  },
  {
    id: "offer-east-legon-battery",
    title: "Recharge au calme à East Legon",
    host: "Abena D.",
    initials: "AD",
    neighborhoodId: "east-legon",
    lat: 5.635,
    lng: -0.158,
    source: "battery",
    available: true,
    capacity: "2 kWh · ordinateurs et téléphones",
    price: 8,
    slots: 3,
    until: "19:30",
    description:
      "Batterie domestique et coin de travail pour continuer une session pendant une interruption.",
  },
];

export const seedReports: CommunityReport[] = [
  {
    id: "seed-osu",
    neighborhoodId: "osu",
    status: "outage",
    author: "Kwame O.",
    createdAt: "2026-10-04T15:38:00.000Z",
    description: "Coupure signalée dans le scénario de démonstration.",
  },
  {
    id: "seed-labone",
    neighborhoodId: "labone",
    status: "powered",
    author: "Esi A.",
    createdAt: "2026-10-04T15:34:00.000Z",
    description: "Courant revenu dans le scénario de démonstration.",
  },
  {
    id: "seed-east-legon",
    neighborhoodId: "east-legon",
    status: "unstable",
    author: "Abena D.",
    createdAt: "2026-10-04T15:31:00.000Z",
    description: "Interruption à confirmer dans le scénario de démonstration.",
  },
  {
    id: "seed-adabraka",
    neighborhoodId: "adabraka",
    status: "outage",
    author: "Kofi B.",
    createdAt: "2026-10-04T15:29:00.000Z",
    description: "Coupure signalée dans le scénario de démonstration.",
  },
  {
    id: "seed-dansoman",
    neighborhoodId: "dansoman",
    status: "unstable",
    author: "Nana S.",
    createdAt: "2026-10-04T15:25:00.000Z",
    description: "Interruption à confirmer dans le scénario de démonstration.",
  },
];

export const initialState: DemoState = {
  reports: seedReports.map((report) => ({ ...report })),
  offers: initialOffers.map((offer) => ({ ...offer })),
  bookings: [],
  profile: { name: "PAN", neighborhoodId: "osu" },
  notificationsEnabled: false,
};

const validStatuses: readonly string[] = ["powered", "outage", "unstable"];
const validSources: readonly string[] = ["solar", "generator", "battery"];
const seedIds = new Set(seedReports.map((report) => report.id));
const findNeighborhood = (id: unknown) =>
  neighborhoods.find((item) => item.id === id);

function freshInitialState(): DemoState {
  return {
    reports: initialState.reports.map((report) => ({ ...report })),
    offers: initialState.offers.map((offer) => ({ ...offer })),
    bookings: [],
    profile: { ...initialState.profile },
    notificationsEnabled: initialState.notificationsEnabled,
  };
}

/** Latest means chronological, independent of insertion order in local storage. */
export function getNeighborhoods(reports: CommunityReport[]): Neighborhood[] {
  return neighborhoods.map((neighborhood) => {
    const matching = reports.filter(
      (report) =>
        report.neighborhoodId === neighborhood.id &&
        validStatuses.includes(report.status) &&
        Number.isFinite(Date.parse(report.createdAt)),
    );
    const latest = matching.reduce<CommunityReport | undefined>(
      (previous, report) =>
        !previous ||
        Date.parse(report.createdAt) >= Date.parse(previous.createdAt)
          ? report
          : previous,
      undefined,
    );
    const status = latest?.status ?? neighborhood.status;
    return {
      ...neighborhood,
      status,
      reports:
        neighborhood.reports +
        new Set(
          matching
            .filter((report) => !seedIds.has(report.id))
            .map((report) => report.id),
        ).size,
      restoration:
        status === neighborhood.status
          ? neighborhood.restoration
          : status === "powered"
            ? "Courant revenu · signalement local"
            : status === "unstable"
              ? "Interruption à confirmer"
              : "Retour du courant à confirmer",
    };
  });
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite))
    return Number.POSITIVE_INFINITY;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lng2 - lng1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    6371 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export function getOffers(
  offers: EnergyOffer[],
  neighborhoodId: string,
  filter: OfferFilter,
  query: string,
): (EnergyOffer & { distance: number })[] {
  const origin = findNeighborhood(neighborhoodId) ?? neighborhoods[0];
  const search = normalizeSearch(query);
  return offers
    .filter(
      (offer) =>
        offer.available &&
        offer.slots > 0 &&
        (filter === "all" || offer.source === filter),
    )
    .filter(
      (offer) =>
        !search ||
        normalizeSearch(
          `${offer.title} ${offer.host} ${offer.description} ${findNeighborhood(offer.neighborhoodId)?.name ?? ""}`,
        ).includes(search),
    )
    .map((offer) => ({
      ...offer,
      distance: distanceKm(origin.lat, origin.lng, offer.lat, offer.lng),
    }))
    .sort(
      (first, second) =>
        first.distance - second.distance ||
        first.price - second.price ||
        first.id.localeCompare(second.id),
    );
}

export function validateReport(input: {
  neighborhoodId: string;
  status: string;
  description: string;
}): string | null {
  if (!findNeighborhood(input.neighborhoodId))
    return "Choisissez un quartier de la zone pilote.";
  if (!validStatuses.includes(input.status))
    return "Choisissez le statut du courant.";
  if (typeof input.description !== "string" || input.description.length > 500)
    return "La description doit contenir au maximum 500 caractères.";
  return null;
}

export function validateOffer(input: {
  title: string;
  neighborhoodId: string;
  source: string;
  capacity: string;
  price: number;
  slots: number;
  until: string;
  description: string;
}): string | null {
  if (
    typeof input.title !== "string" ||
    input.title.trim().length < 3 ||
    input.title.trim().length > 100
  )
    return "Le titre doit contenir entre 3 et 100 caractères.";
  if (!findNeighborhood(input.neighborhoodId))
    return "Choisissez un quartier de la zone pilote.";
  if (!validSources.includes(input.source))
    return "Choisissez une source d’énergie.";
  if (
    typeof input.capacity !== "string" ||
    !input.capacity.trim() ||
    input.capacity.length > 100
  )
    return "Précisez une capacité de 100 caractères maximum.";
  if (
    typeof input.price !== "number" ||
    !Number.isFinite(input.price) ||
    input.price < 0 ||
    input.price > 1000
  )
    return "La contribution conseillée doit être comprise entre 0 et 1 000 GHS.";
  if (
    typeof input.slots !== "number" ||
    !Number.isInteger(input.slots) ||
    input.slots < 1 ||
    input.slots > 50
  )
    return "Indiquez entre 1 et 50 places disponibles.";
  if (
    typeof input.until !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.until)
  )
    return "Indiquez une heure de fin valide au format HH:mm.";
  if (typeof input.description !== "string" || input.description.length > 600)
    return "La description doit contenir au maximum 600 caractères.";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value: unknown, min: number, max: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= min &&
    value.length <= max
  );
}

function isIsoDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  )
    return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const canonical = date.toISOString();
  return canonical === value || canonical.replace(".000Z", "Z") === value;
}

function parseReport(value: unknown): CommunityReport | null {
  if (
    !isRecord(value) ||
    !isText(value.id, 1, 120) ||
    !findNeighborhood(value.neighborhoodId) ||
    !validStatuses.includes(String(value.status)) ||
    !isText(value.author, 1, 60) ||
    !isIsoDate(value.createdAt) ||
    !isText(value.description, 0, 500)
  )
    return null;
  return {
    id: value.id,
    neighborhoodId: value.neighborhoodId as string,
    status: value.status as EnergyStatus,
    author: value.author.trim(),
    createdAt: value.createdAt,
    description: value.description,
  };
}

function parseOffer(value: unknown): EnergyOffer | null {
  if (!isRecord(value)) return null;
  const neighborhood = findNeighborhood(value.neighborhoodId);
  if (
    !neighborhood ||
    !isText(value.id, 1, 120) ||
    !isText(value.host, 1, 60) ||
    !isText(value.initials, 1, 4) ||
    typeof value.available !== "boolean" ||
    typeof value.lat !== "number" ||
    !Number.isFinite(value.lat) ||
    Math.abs(value.lat) > 90 ||
    typeof value.lng !== "number" ||
    !Number.isFinite(value.lng) ||
    Math.abs(value.lng) > 180
  )
    return null;
  if (
    !isText(value.title, 3, 100) ||
    !isText(value.capacity, 1, 100) ||
    !isText(value.description, 0, 600) ||
    typeof value.source !== "string" ||
    !validSources.includes(value.source) ||
    typeof value.price !== "number" ||
    !Number.isFinite(value.price) ||
    value.price < 0 ||
    value.price > 1000 ||
    typeof value.slots !== "number" ||
    !Number.isInteger(value.slots) ||
    value.slots < 0 ||
    value.slots > 50 ||
    typeof value.until !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.until)
  )
    return null;
  return {
    id: value.id,
    title: value.title.trim(),
    host: value.host.trim(),
    initials: value.initials.trim(),
    neighborhoodId: neighborhood.id,
    lat: neighborhood.lat,
    lng: neighborhood.lng,
    source: value.source as EnergySource,
    available: value.available,
    capacity: value.capacity.trim(),
    price: value.price,
    slots: value.slots,
    until: value.until,
    description: value.description,
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Only known, validated fields leave the persistence boundary. */
export function parseStoredState(value: string | null): DemoState {
  if (!value || value.length > 500_000) return freshInitialState();
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      !Array.isArray(parsed.reports) ||
      !Array.isArray(parsed.offers) ||
      !Array.isArray(parsed.bookings) ||
      !isRecord(parsed.profile) ||
      !isText(parsed.profile.name, 1, 60) ||
      !findNeighborhood(parsed.profile.neighborhoodId) ||
      typeof parsed.notificationsEnabled !== "boolean"
    )
      return freshInitialState();
    const reports = uniqueById(
      parsed.reports
        .slice(0, 200)
        .map(parseReport)
        .filter((report): report is CommunityReport => report !== null),
    );
    const offers = uniqueById(
      parsed.offers
        .slice(0, 100)
        .map(parseOffer)
        .filter((offer): offer is EnergyOffer => offer !== null),
    );
    const bookings = uniqueById(
      parsed.bookings.slice(0, 100).flatMap((booking): Booking[] => {
        if (
          !isRecord(booking) ||
          !isText(booking.id, 1, 120) ||
          typeof booking.offerId !== "string" ||
          !offers.some((offer) => offer.id === booking.offerId) ||
          !isIsoDate(booking.createdAt)
        )
          return [];
        return [
          {
            id: booking.id,
            offerId: booking.offerId,
            createdAt: booking.createdAt,
          },
        ];
      }),
    );
    return {
      reports,
      offers,
      bookings,
      profile: {
        name: parsed.profile.name.trim(),
        neighborhoodId: parsed.profile.neighborhoodId as string,
      },
      notificationsEnabled: parsed.notificationsEnabled,
    };
  } catch {
    return freshInitialState();
  }
}

/** Accra uses GMT all year; explicitly avoid the viewer's local timezone. */
export function formatTime(date: string | Date): string {
  const parsed = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  }).format(parsed);
}
