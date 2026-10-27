import { newClientId, type EnergyStatus } from "./energy";

/**
 * Task 56: reports made without network wait on the phone and leave when it comes back.
 * The queue survives an app restart (AsyncStorage). A refusal by the database
 * (rate limit, position too far) is not retried: the resident is told why.
 */
export interface QueuedReport {
  neighborhoodId: string;
  status: EnergyStatus;
  description: string;
  lat?: number;
  lng?: number;
  /** When the resident saw it, kept while the report waits for the network. */
  observedAt?: string;
  /** Fixed when queued and sent on every retry, so the database stores it once. */
  clientId?: string;
}

export type SendResult =
  { ok: true } | { ok: false; retry: boolean; message: string };

interface QueueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface QueueSnapshot {
  pending: number;
  notice: string | null;
}

export const queueKey = "lightlink.mobile.pending-reports.v1";
const maxPending = 50;

function parse(value: string | null): QueuedReport[] {
  try {
    const items: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(items)
      ? items
          .filter(
            (item): item is QueuedReport =>
              typeof item === "object" &&
              item !== null &&
              typeof item.neighborhoodId === "string" &&
              typeof item.status === "string" &&
              typeof item.description === "string",
          )
          .slice(-maxPending)
      : [];
  } catch {
    return [];
  }
}

export function createReportQueue(
  storage: QueueStorage,
  send: (report: QueuedReport) => Promise<SendResult>,
) {
  let items: QueuedReport[] = [];
  let snapshot: QueueSnapshot = { pending: 0, notice: null };
  let flushing: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function publish(notice: string | null = snapshot.notice) {
    snapshot = { pending: items.length, notice };
    listeners.forEach((listener) => listener());
  }

  async function persist() {
    try {
      await storage.setItem(queueKey, JSON.stringify(items));
    } catch {
      // The queue still works for this session.
    }
  }

  async function flushOnce() {
    while (items.length > 0) {
      const result = await send(items[0]);
      if (!result.ok && result.retry) {
        publish();
        return; // Still offline: keep the order, try again later.
      }
      items = items.slice(1);
      await persist();
      publish(result.ok ? null : result.message);
    }
  }

  const queue = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async load() {
      let loaded: QueuedReport[];
      try {
        loaded = parse(await storage.getItem(queueKey));
      } catch {
        loaded = [];
      }
      // Reports queued by an older version have no observation time nor id
      // (PAN's review of #6). Without a time we cannot tell a current outage from
      // one hours old, so they are not sent and the resident is told.
      const unknownTime = loaded.filter((item) => !item.observedAt).length;
      items = loaded
        .filter((item) => item.observedAt)
        .map((item) =>
          item.clientId ? item : { ...item, clientId: newClientId() },
        );
      // Store the new ids at once, so every retry, even after a restart, uses the same one.
      if (unknownTime > 0 || loaded.some((item) => !item.clientId))
        await persist();
      publish(
        unknownTime === 0
          ? null
          : unknownTime === 1
            ? "An old report without a time was not sent. Report again if the outage continues."
            : `${unknownTime} old reports without a time were not sent. Report again if the outage continues.`,
      );
    },
    /** Sends now, or keeps the report for later when the network is missing. */
    async submit(report: QueuedReport) {
      items = [
        ...items,
        {
          ...report,
          observedAt: report.observedAt ?? new Date().toISOString(),
          clientId: report.clientId ?? newClientId(),
        },
      ].slice(-maxPending);
      await persist();
      publish(null);
      await queue.flush();
    },
    /** Sends waiting reports in order; one flush at a time. */
    flush(): Promise<void> {
      flushing ??= flushOnce().finally(() => {
        flushing = null;
      });
      return flushing;
    },
  };
  return queue;
}

export type ReportQueue = ReturnType<typeof createReportQueue>;
