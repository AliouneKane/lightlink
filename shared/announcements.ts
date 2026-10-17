/**
 * Official ECG outage announcements and the "Avez-vous du courant ?" question.
 * During an announced window, residents of the zone answer with an ordinary report
 * ("powered" or "outage"). Those answers measure how often announcements are held,
 * which no public source reports (prediction/README.md).
 */
import type { CommunityReport, EnergyStatus } from "./energy";

export interface EcgAnnouncement {
  id: string;
  neighborhoodId: string;
  startsAt: string;
  endsAt: string;
  /** The ECG names only part of the neighbourhood ("Parts of Madina", a sub-locality). */
  partial: boolean;
  localities: string;
  sourceUrl: string;
  /** Scenario announcement for the demo, never an ECG publication. */
  demo: boolean;
}

/** Real ECG announcements for the pilot neighbourhoods (data/instagram, October 2026). */
export const ecgAnnouncements: EcgAnnouncement[] = [
  {
    id: "ecg-2026-10-16-madina",
    neighborhoodId: "madina",
    startsAt: "2026-10-16T09:00:00.000Z",
    endsAt: "2026-10-16T17:00:00.000Z",
    partial: true,
    localities: "Parts of Madina",
    sourceUrl: "https://www.instagram.com/p/DeTcGjGALAs/",
    demo: false,
  },
  {
    id: "ecg-2026-10-14-madina",
    neighborhoodId: "madina",
    startsAt: "2026-10-14T09:00:00.000Z",
    endsAt: "2026-10-14T17:00:00.000Z",
    partial: true,
    localities: "Madina Washington, UN Madina",
    sourceUrl: "https://www.instagram.com/p/DeTcGjGALAs/",
    demo: false,
  },
  {
    id: "ecg-2026-10-09-east-legon",
    neighborhoodId: "east-legon",
    startsAt: "2026-10-09T09:00:00.000Z",
    endsAt: "2026-10-09T17:00:00.000Z",
    partial: true,
    localities: "Parts of East Legon",
    sourceUrl: "https://www.instagram.com/p/DeFE0fdlm8l/",
    demo: false,
  },
  {
    id: "ecg-2026-10-08-madina",
    neighborhoodId: "madina",
    startsAt: "2026-10-08T09:00:00.000Z",
    endsAt: "2026-10-08T17:00:00.000Z",
    partial: false,
    localities: "Madina",
    sourceUrl: "https://www.instagram.com/p/DeFE0fdlm8l/",
    demo: false,
  },
];

const answerStatuses: readonly EnergyStatus[] = ["powered", "outage"];

/** Covers the whole current GMT day so the question stays visible during a demo. */
export function demoAnnouncement(
  neighborhoodId: string,
  at: Date,
): EcgAnnouncement {
  const start = new Date(at);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    id: `demo-${neighborhoodId}-${start.toISOString().slice(0, 10)}`,
    neighborhoodId,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    partial: false,
    localities: "Annonce de démonstration",
    sourceUrl: "",
    demo: true,
  };
}

export function isActive(announcement: EcgAnnouncement, at: Date): boolean {
  const time = at.getTime();
  return (
    Date.parse(announcement.startsAt) <= time &&
    time < Date.parse(announcement.endsAt)
  );
}

/**
 * Announcements of one neighbourhood, newest first. When no real announcement
 * is running, a labelled demo announcement comes first so the question can be shown.
 */
export function getZoneAnnouncements(
  neighborhoodId: string,
  at: Date,
): EcgAnnouncement[] {
  const real = ecgAnnouncements
    .filter((item) => item.neighborhoodId === neighborhoodId)
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return real.some((item) => isActive(item, at))
    ? real
    : [demoAnnouncement(neighborhoodId, at), ...real];
}

/**
 * The user's answer is any "powered" or "outage" report they made in the zone during
 * the window: the same rule as the announcement_outcomes view in the database.
 */
export function findAnswer(
  reports: CommunityReport[],
  announcement: EcgAnnouncement,
  author: string,
): CommunityReport | undefined {
  const start = Date.parse(announcement.startsAt);
  const end = Date.parse(announcement.endsAt);
  return reports
    .filter((report) => {
      const time = Date.parse(report.createdAt);
      return (
        report.neighborhoodId === announcement.neighborhoodId &&
        report.author === author &&
        answerStatuses.includes(report.status) &&
        time >= start &&
        time < end
      );
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

export function answerReport(
  announcement: EcgAnnouncement,
  hasPower: boolean,
): { neighborhoodId: string; status: EnergyStatus; description: string } {
  const label = announcement.demo
    ? "annonce de démonstration"
    : `annonce ECG du ${formatDay(announcement.startsAt)}`;
  return {
    neighborhoodId: announcement.neighborhoodId,
    status: hasPower ? "powered" : "outage",
    description: `Réponse à l'${label} : ${hasPower ? "courant disponible" : "coupure"}.`,
  };
}

/** Accra uses GMT all year. */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Accra",
  }).format(new Date(date));
}
