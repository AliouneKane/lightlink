/**
 * Calls to Supabase for energy sharing and notifications (phase 3), shared by web and
 * mobile. Each app passes its own Supabase client; shared/ has no dependency of its own,
 * hence the structural client type below.
 */
import type { Booking, EnergyOffer, RequestStatus } from "./energy";
import {
  endsAtFromUntil,
  offerColumns,
  offerInsertRow,
  offerRowToOffer,
  requestColumns,
  requestRowToBooking,
  sharingErrorMessage,
  type OfferRow,
  type RequestRow,
} from "./sharing";

// The Supabase client of each app (web and mobile depend on @supabase/supabase-js, not shared/).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = any;

export interface IncomingRequest {
  id: string;
  offerId: string;
  offerTitle: string;
  status: RequestStatus;
  message: string;
  createdAt: string;
}

export interface SharingData {
  offers: EnergyOffer[];
  bookings: Booking[];
  incoming: IncomingRequest[];
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export const emptySharing: SharingData = {
  offers: [],
  bookings: [],
  incoming: [],
};

async function currentUser(db: Db): Promise<string | null> {
  const { data } = await db.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Offers around the neighbourhood, my requests and the requests on my offers. */
export async function loadSharing(
  db: Db,
  zoneId: string,
): Promise<SharingData | null> {
  const me = await currentUser(db);
  const nearby = await db.rpc("energy_options", { origin_zone: zoneId });
  if (nearby.error) return null;
  const options = (nearby.data ?? []) as {
    kind: string;
    id: string;
    places_left: number | null;
  }[];
  const placesLeft = new Map(
    options
      .filter((option) => option.kind === "offer")
      .map((option) => [option.id, option.places_left ?? 0]),
  );

  let mine: RequestRow[] = [];
  let hosted: OfferRow[] = [];
  if (me) {
    const [requests, own] = await Promise.all([
      db.from("offer_requests").select(requestColumns).eq("requester_id", me),
      db
        .from("offers")
        .select(offerColumns)
        .eq("host_id", me)
        .neq("status", "closed"),
    ]);
    mine = (requests.data ?? []) as RequestRow[];
    hosted = (own.data ?? []) as OfferRow[];
  }

  const ids = [
    ...new Set([...placesLeft.keys(), ...mine.map((row) => row.offer_id)]),
  ];
  const rows: OfferRow[] = ids.length
    ? (((await db.from("offers").select(offerColumns).in("id", ids)).data ??
        []) as OfferRow[])
    : [];

  let incoming: RequestRow[] = [];
  if (hosted.length) {
    const result = await db
      .from("offer_requests")
      .select(requestColumns)
      .in(
        "offer_id",
        hosted.map((row) => row.id),
      );
    incoming = (result.data ?? []) as RequestRow[];
  }

  const accepted = mine
    .filter((row) => row.status === "accepted" || row.status === "finished")
    .map((row) => row.offer_id);
  const addresses = new Map<string, string>();
  if (accepted.length) {
    const result = await db
      .from("offer_private_details")
      .select("offer_id, address")
      .in("offer_id", accepted);
    for (const row of (result.data ?? []) as {
      offer_id: string;
      address: string;
    }[])
      addresses.set(row.offer_id, row.address);
  }

  const takenOnMine = (offerId: string) =>
    incoming.filter(
      (row) => row.offer_id === offerId && row.status === "accepted",
    ).length;
  const byId = new Map<string, OfferRow>();
  for (const row of [...rows, ...hosted]) byId.set(row.id, row);
  const offers = [...byId.values()].map((row) =>
    offerRowToOffer(
      row,
      me,
      placesLeft.get(row.id) ??
        (row.host_id === me ? row.slots - takenOnMine(row.id) : row.slots),
    ),
  );
  return {
    offers,
    bookings: mine
      .filter((row) => row.status !== "cancelled")
      .map((row) => requestRowToBooking(row, addresses.get(row.offer_id))),
    incoming: incoming
      .filter((row) => row.status !== "cancelled")
      .map((row) => ({
        id: row.id,
        offerId: row.offer_id,
        offerTitle: byId.get(row.offer_id)?.title ?? "Offre",
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
      })),
  };
}

/** Returns null on success, otherwise a message for the resident. */
export async function createLiveOffer(
  db: Db,
  input: Parameters<typeof offerInsertRow>[0] & {
    until: string;
    address?: string;
  },
  hostName: string,
): Promise<string | null> {
  const endsAt = endsAtFromUntil(input.until);
  if (!endsAt)
    return "Une offre dure 12 heures au plus. Choisissez une heure de fin plus proche.";
  const { data, error } = await db
    .from("offers")
    .insert(offerInsertRow(input, hostName, endsAt))
    .select("id")
    .single();
  if (error) return sharingErrorMessage(error);
  if (input.address?.trim()) {
    const details = await db
      .from("offer_private_details")
      .insert({ offer_id: data.id, address: input.address.trim() });
    if (details.error) return sharingErrorMessage(details.error);
  }
  return null;
}

/** Suspend (closed) or reopen one of my offers. */
export async function setLiveOfferOpen(
  db: Db,
  offerId: string,
  open: boolean,
): Promise<string | null> {
  const { error } = await db
    .from("offers")
    .update({ status: open ? "available" : "closed" })
    .eq("id", offerId);
  return error ? sharingErrorMessage(error) : null;
}

export async function requestLiveOffer(
  db: Db,
  offerId: string,
  message = "",
): Promise<string | null> {
  const { error } = await db
    .from("offer_requests")
    .insert({ offer_id: offerId, message: message.trim().slice(0, 280) });
  return error ? sharingErrorMessage(error) : null;
}

/** Accept, refuse, finish (host) or cancel (requester): the database checks who may. */
export async function setLiveRequestStatus(
  db: Db,
  requestId: string,
  status: RequestStatus,
): Promise<string | null> {
  const { error } = await db.rpc("set_request_status", {
    request_id: requestId,
    new_status: status,
  });
  return error ? sharingErrorMessage(error) : null;
}

/** Task 90: residents report an abusive offer; only the team reads it. */
export async function reportLiveAbuse(
  db: Db,
  offerId: string,
  reason: string,
): Promise<string | null> {
  if (reason.trim().length < 3)
    return "Expliquez le problème en quelques mots.";
  const { error } = await db
    .from("abuse_reports")
    .insert({ offer_id: offerId, reason: reason.trim().slice(0, 500) });
  return error ? sharingErrorMessage(error) : null;
}

export async function loadNotifications(db: Db): Promise<Notification[]> {
  const { data, error } = await db
    .from("notifications")
    .select("id, kind, title, body, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return (
    data as {
      id: string;
      kind: string;
      title: string;
      body: string;
      created_at: string;
      read_at: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read_at !== null,
  }));
}

export async function markNotificationsRead(db: Db): Promise<void> {
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}
