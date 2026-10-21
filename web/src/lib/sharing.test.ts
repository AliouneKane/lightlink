import { describe, expect, it } from "vitest";
import {
  endsAtFromUntil,
  initials,
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
