/**
 * Energy sharing in live mode (phase 3): converts database rows into the offers and
 * requests the screens already show, and back. Pure functions, shared by web and mobile.
 * The rules themselves live in the database (docs/REGLES_PARTAGE.md).
 */
import {
  neighborhoods,
  type Booking,
  type EnergyOffer,
  type EnergySource,
  type RequestStatus,
} from "./energy";

/**
 * A row of public.offers, as the apps may read it: who hosts an offer (host_id) is not
 * readable; my own offers come from my_offers() (migration 13).
 */
export interface OfferRow {
  id: string;
  host_name: string;
  zone_id: string;
  title: string;
  source: EnergySource;
  capacity: string;
  price: number | string;
  slots: number;
  description: string;
  status: "available" | "full" | "closed";
  ends_at: string;
}

/** A row of public.offer_requests. */
export interface RequestRow {
  id: string;
  offer_id: string;
  requester_id: string;
  status: RequestStatus;
  message: string;
  created_at: string;
}

export const offerColumns =
  "id, host_name, zone_id, title, source, capacity, price, slots, description, status, ends_at";
export const requestColumns =
  "id, offer_id, requester_id, status, message, created_at";

export const requestStatusLabels: Record<RequestStatus, string> = {
  pending: "Waiting for the host",
  accepted: "Accepted",
  refused: "Declined",
  cancelled: "Cancelled",
  finished: "Finished",
};

/** Requests that still hold or may hold a place. */
export const activeRequestStatuses: RequestStatus[] = ["pending", "accepted"];

export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "LL";
}

/**
 * An offer as the screens expect it. Its position is the neighbourhood centre: the exact
 * place stays private until the host accepts (task 89).
 */
export function offerRowToOffer(
  row: OfferRow,
  own: boolean,
  placesLeft: number = row.slots,
  now: Date = new Date(),
): EnergyOffer {
  const zone =
    neighborhoods.find((item) => item.id === row.zone_id) ?? neighborhoods[0];
  return {
    id: row.id,
    title: row.title,
    host: row.host_name,
    initials: initials(row.host_name),
    neighborhoodId: row.zone_id,
    lat: zone.lat,
    lng: zone.lng,
    source: row.source,
    available:
      row.status === "available" && Date.parse(row.ends_at) > now.getTime(),
    capacity: row.capacity,
    price: Number(row.price),
    slots: Math.max(0, placesLeft),
    until: row.ends_at.slice(11, 16), // Accra is on GMT all year
    description: row.description,
    own,
  };
}

export function requestRowToBooking(
  row: RequestRow,
  address?: string,
): Booking {
  return {
    id: row.id,
    offerId: row.offer_id,
    createdAt: row.created_at,
    status: row.status,
    address,
  };
}

/**
 * The end of an offer from the "until" hour of the form (HH:mm, GMT). An hour already
 * passed means tomorrow. Returns null beyond the 12-hour limit of the sharing rules.
 */
export function endsAtFromUntil(
  until: string,
  now: Date = new Date(),
): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(until);
  if (!match) return null;
  const end = new Date(now);
  end.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  if (end.getTime() <= now.getTime()) end.setUTCDate(end.getUTCDate() + 1);
  return end.getTime() - now.getTime() > 12 * 3600 * 1000
    ? null
    : end.toISOString();
}

/** The row inserted in public.offers. The host is filled in by the database. */
export function offerInsertRow(
  input: {
    title: string;
    neighborhoodId: string;
    source: EnergySource;
    capacity: string;
    price: number;
    slots: number;
    description: string;
  },
  hostName: string,
  endsAt: string,
) {
  return {
    zone_id: input.neighborhoodId,
    host_name: hostName.trim().slice(0, 50) || "Neighbour",
    title: input.title.trim(),
    source: input.source,
    capacity: input.capacity.trim(),
    price: input.price,
    slots: input.slots,
    description: input.description.trim(),
    ends_at: endsAt,
  };
}

/** Refusals of the database, in words a resident understands. */
export function sharingErrorMessage(error: { message?: string }): string {
  const message = error.message ?? "";
  if (message.includes("your own offer"))
    return "You cannot request your own offer.";
  if (message.includes("no longer available"))
    return "This offer is no longer available.";
  if (message.includes("Too many pending requests"))
    return "You already have 3 pending requests. Cancel one to make another.";
  if (message.includes("already taken"))
    return "All the places of this offer are already taken.";
  if (message.includes("not allowed"))
    return "This action is not possible for this request.";
  if (/duplicate key|unique/i.test(message))
    return "You have already requested this offer.";
  if (/offers_check|12 hours|ends_at/i.test(message))
    return "An offer lasts 12 hours at most. Choose an earlier end time.";
  if (/offer_private_details_address_check|address/i.test(message))
    return "The exact address must be between 3 and 200 characters.";
  if (/fetch|network|timeout/i.test(message))
    return "No connection. Try again when the network is back.";
  return "The action could not be completed. Please try again in a moment.";
}
