import type { EnergyStatus } from "./energy";

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
      try {
        items = parse(await storage.getItem(queueKey));
      } catch {
        items = [];
      }
      publish();
    },
    /** Sends now, or keeps the report for later when the network is missing. */
    async submit(report: QueuedReport) {
      items = [...items, report].slice(-maxPending);
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
