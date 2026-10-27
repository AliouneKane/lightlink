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
  /** Live mode: the signed-in resident hosts this offer. */
  own?: boolean;
}

export interface CommunityReport {
  id: string;
  neighborhoodId: string;
  status: EnergyStatus;
  author: string;
  createdAt: string;
  description: string;
}

export type RequestStatus =
  "pending" | "accepted" | "refused" | "cancelled" | "finished";

export interface Booking {
  id: string;
  offerId: string;
  createdAt: string;
  /** Live mode only; a demo request is simply "sent". */
  status?: RequestStatus;
  /** Exact place, shown once the host accepted (live mode, task 89). */
  address?: string;
}

export interface DemoState {
  reports: CommunityReport[];
  offers: EnergyOffer[];
  bookings: Booking[];
  profile: { name: string; neighborhoodId: string };
  notificationsEnabled: boolean;
}

// v2: demo content translated to English; a v1 store would show French offers.
export const storageKey = "lightlink.demo.v2";
/** Read only while no v2 store exists, to keep the resident's profile. */
export const legacyStorageKey = "lightlink.demo.v1";
export const DEMO_TIMESTAMP = "2026-10-04T15:42:00.000Z";
export const DEMO_LABEL = "Demo data · 4 October 2026, 15:42 GMT";

/** Risk and confidence are illustrative percentages, not model predictions. */
export const neighborhoods: Neighborhood[] = [
  {
    id: "osu",
    name: "Osu",
    lat: 5.556,
    lng: -0.182,
    status: "outage",
    reports: 24,
    restoration: "Demo estimate · 17:30",
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
    restoration: "Power available",
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
    restoration: "Intermittent supply",
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
    restoration: "Demo estimate · 18:00",
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
    restoration: "Power available",
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
    restoration: "Intermittent supply",
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
    restoration: "Power available",
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
    restoration: "Demo estimate · 18:30",
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
    restoration: "Intermittent supply",
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
    restoration: "Power available",
    risk: 18,
    confidence: 83,
  },
];

export const initialOffers: EnergyOffer[] = [
  {
    id: "offer-labone-solar",
    title: "A desk, sunshine and Wi-Fi",
    host: "Esi A.",
    initials: "EA",
    neighborhoodId: "labone",
    lat: 5.571,
    lng: -0.166,
    source: "solar",
    available: true,
    capacity: "2 kW · laptops and phones",
    price: 10,
    slots: 4,
    until: "19:00",
    description:
      "Shared workspace powered by solar panels. Suggested contribution for hosting, no payment in this demo.",
  },
  {
    id: "offer-osu-battery",
    title: "Quick charging in Osu",
    host: "Kwame O.",
    initials: "KO",
    neighborhoodId: "osu",
    lat: 5.556,
    lng: -0.182,
    source: "battery",
    available: true,
    capacity: "1 kWh · small devices",
    price: 5,
    slots: 3,
    until: "18:00",
    description:
      "Backup battery to charge phones and laptops. Exact place shared only after acceptance.",
  },
  {
    id: "offer-cantonments-solar",
    title: "Solar power for your projects",
    host: "Akosua M.",
    initials: "AM",
    neighborhoodId: "cantonments",
    lat: 5.579,
    lng: -0.173,
    source: "solar",
    available: true,
    capacity: "3 kW · 6 sockets available",
    price: 15,
    slots: 6,
    until: "20:00",
    description:
      "A few places in a friendly space with a solar installation and storage battery.",
  },
  {
    id: "offer-adabraka-generator",
    title: "An energy stop in Adabraka",
    host: "Kofi B.",
    initials: "KB",
    neighborhoodId: "adabraka",
    lat: 5.57,
    lng: -0.213,
    source: "generator",
    available: true,
    capacity: "5 kVA · light equipment",
    price: 20,
    slots: 2,
    until: "18:30",
    description:
      "Generator with charging places. The suggested contribution helps cover the fuel.",
  },
  {
    id: "offer-east-legon-battery",
    title: "Quiet charging in East Legon",
    host: "Abena D.",
    initials: "AD",
    neighborhoodId: "east-legon",
    lat: 5.635,
    lng: -0.158,
    source: "battery",
    available: true,
    capacity: "2 kWh · laptops and phones",
    price: 8,
    slots: 3,
    until: "19:30",
    description:
      "Home battery and a work corner to keep going during an outage.",
  },
];

export const seedReports: CommunityReport[] = [
  {
    id: "seed-osu",
    neighborhoodId: "osu",
    status: "outage",
    author: "Kwame O.",
    createdAt: "2026-10-04T15:38:00.000Z",
    description: "Outage reported in the demo scenario.",
  },
  {
    id: "seed-labone",
    neighborhoodId: "labone",
    status: "powered",
    author: "Esi A.",
    createdAt: "2026-10-04T15:34:00.000Z",
    description: "Power back in the demo scenario.",
  },
  {
    id: "seed-east-legon",
    neighborhoodId: "east-legon",
    status: "unstable",
    author: "Abena D.",
    createdAt: "2026-10-04T15:31:00.000Z",
    description: "Interruption to be confirmed in the demo scenario.",
  },
  {
    id: "seed-adabraka",
    neighborhoodId: "adabraka",
    status: "outage",
    author: "Kofi B.",
    createdAt: "2026-10-04T15:29:00.000Z",
    description: "Outage reported in the demo scenario.",
  },
  {
    id: "seed-dansoman",
    neighborhoodId: "dansoman",
    status: "unstable",
    author: "Nana S.",
    createdAt: "2026-10-04T15:25:00.000Z",
    description: "Interruption to be confirmed in the demo scenario.",
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
            ? "Power back · local report"
            : status === "unstable"
              ? "Interruption to be confirmed"
              : "Power return to be confirmed",
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
    .toLocaleLowerCase("en")
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
    return "Choose a neighbourhood in the pilot area.";
  if (!validStatuses.includes(input.status)) return "Choose the power status.";
  if (typeof input.description !== "string" || input.description.length > 500)
    return "The description must be 500 characters or fewer.";
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
    return "The title must be between 3 and 100 characters.";
  if (!findNeighborhood(input.neighborhoodId))
    return "Choose a neighbourhood in the pilot area.";
  if (!validSources.includes(input.source)) return "Choose an energy source.";
  if (
    typeof input.capacity !== "string" ||
    !input.capacity.trim() ||
    input.capacity.length > 100
  )
    return "Give a capacity of 100 characters or fewer.";
  if (
    typeof input.price !== "number" ||
    !Number.isFinite(input.price) ||
    input.price < 0 ||
    input.price > 1000
  )
    return "The suggested contribution must be between 0 and 1,000 GHS.";
  if (
    typeof input.slots !== "number" ||
    !Number.isInteger(input.slots) ||
    input.slots < 1 ||
    input.slots > 50
  )
    return "Enter between 1 and 50 available places.";
  if (
    typeof input.until !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.until)
  )
    return "Enter a valid end time in HH:mm format.";
  if (typeof input.description !== "string" || input.description.length > 600)
    return "The description must be 600 characters or fewer.";
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

/**
 * A v1 store holds French demo content. Its profile and alert preference carry
 * over, because live mode syncs the local neighbourhood to `profiles.zone_id`;
 * the reports and offers are regenerated in English.
 */
export function migrateLegacyState(value: string | null): DemoState {
  const { profile, notificationsEnabled } = parseStoredState(value);
  return { ...freshInitialState(), profile, notificationsEnabled };
}

/** Accra uses GMT all year; explicitly avoid the viewer's local timezone. */
export function formatTime(date: string | Date): string {
  const parsed = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  }).format(parsed);
}
