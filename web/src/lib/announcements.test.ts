import { describe, expect, it } from "vitest";
import {
  answerReport,
  demoAnnouncement,
  ecgAnnouncements,
  findAnswer,
  getZoneAnnouncements,
  isActive,
  neighborhoods,
  validateReport,
  type CommunityReport,
} from "./energy";

const madina8 = ecgAnnouncements.find(
  (item) => item.id === "ecg-2026-10-08-madina",
)!;

function report(overrides: Partial<CommunityReport>): CommunityReport {
  return {
    id: "r1",
    neighborhoodId: "madina",
    status: "outage",
    author: "PAN",
    createdAt: "2026-10-08T10:00:00.000Z",
    description: "",
    ...overrides,
  };
}

describe("ECG announcements", () => {
  it("only reference pilot neighbourhoods and valid windows", () => {
    const ids = new Set(neighborhoods.map((zone) => zone.id));
    for (const item of ecgAnnouncements) {
      expect(ids.has(item.neighborhoodId)).toBe(true);
      expect(Date.parse(item.endsAt)).toBeGreaterThan(
        Date.parse(item.startsAt),
      );
      expect(item.demo).toBe(false);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("is active from its start, inclusive, to its end, exclusive", () => {
    expect(isActive(madina8, new Date("2026-10-08T09:00:00Z"))).toBe(true);
    expect(isActive(madina8, new Date("2026-10-08T16:59:59Z"))).toBe(true);
    expect(isActive(madina8, new Date("2026-10-08T17:00:00Z"))).toBe(false);
  });

  it("adds a labelled demo announcement only when no real one is running", () => {
    const later = getZoneAnnouncements(
      "madina",
      new Date("2026-10-17T12:00:00Z"),
    );
    expect(later[0].demo).toBe(true);
    expect(isActive(later[0], new Date("2026-10-17T23:59:00Z"))).toBe(true);
    expect(later.slice(1).map((item) => item.startsAt)).toEqual([
      "2026-10-16T09:00:00.000Z",
      "2026-10-14T09:00:00.000Z",
      "2026-10-08T09:00:00.000Z",
    ]);
    const during = getZoneAnnouncements(
      "madina",
      new Date("2026-10-08T12:00:00Z"),
    );
    expect(during.some((item) => item.demo)).toBe(false);
    expect(getZoneAnnouncements("osu", new Date())).toHaveLength(1);
  });

  it("keeps the demo announcement stable across the day", () => {
    const morning = demoAnnouncement("osu", new Date("2026-10-17T00:30:00Z"));
    const evening = demoAnnouncement("osu", new Date("2026-10-17T22:30:00Z"));
    expect(morning).toEqual(evening);
  });
});

describe("Do you have power?", () => {
  it("builds a valid powered or outage report", () => {
    const yes = answerReport(madina8, true);
    const no = answerReport(madina8, false);
    expect(yes.status).toBe("powered");
    expect(no.status).toBe("outage");
    expect(validateReport(yes)).toBeNull();
    expect(yes.description).toContain("ECG announcement of 8 Oct");
    expect(
      answerReport(demoAnnouncement("osu", new Date()), true).description,
    ).toContain("demo");
  });

  it("finds the latest answer of this user, in this zone, during the window", () => {
    const answer = findAnswer(
      [
        report({ id: "first", status: "outage" }),
        report({
          id: "latest",
          status: "powered",
          createdAt: "2026-10-08T11:00:00.000Z",
        }),
        report({
          id: "other-user",
          author: "Ama",
          createdAt: "2026-10-08T12:00:00.000Z",
        }),
        report({
          id: "other-zone",
          neighborhoodId: "osu",
          createdAt: "2026-10-08T12:00:00.000Z",
        }),
        report({ id: "after", createdAt: "2026-10-08T17:00:00.000Z" }),
        report({
          id: "unstable",
          status: "unstable",
          createdAt: "2026-10-08T12:30:00.000Z",
        }),
      ],
      madina8,
      "PAN",
    );
    expect(answer?.id).toBe("latest");
  });

  it("reports no answer when there is none", () => {
    expect(findAnswer([], madina8, "PAN")).toBeUndefined();
  });
});
