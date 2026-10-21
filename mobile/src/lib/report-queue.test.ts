import { describe, expect, it, vi } from "vitest";
import {
  createReportQueue,
  queueKey,
  type QueuedReport,
  type SendResult,
} from "./report-queue";

function memoryStorage(saved: string | null = null) {
  let value = saved;
  return {
    getItem: vi.fn(async (key: string) => (key === queueKey ? value : null)),
    setItem: vi.fn(async (key: string, next: string) => {
      if (key === queueKey) value = next;
    }),
    read: () => (value ? (JSON.parse(value) as QueuedReport[]) : []),
  };
}

const report = (description: string): QueuedReport => ({
  neighborhoodId: "osu",
  status: "outage",
  description,
});
const offline: SendResult = { ok: false, retry: true, message: "offline" };
const refused: SendResult = {
  ok: false,
  retry: false,
  message: "Vous avez déjà envoyé 5 signalements en 10 minutes.",
};

describe("offline report queue", () => {
  it("sends at once when the network is there", async () => {
    const storage = memoryStorage();
    const send = vi.fn(async () => ({ ok: true }) as SendResult);
    const queue = createReportQueue(storage, send);
    await queue.load();
    await queue.submit(report("a"));
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.getSnapshot()).toEqual({ pending: 0, notice: null });
    expect(storage.read()).toEqual([]);
  });

  it("keeps reports offline, across a restart, then sends them in order", async () => {
    const storage = memoryStorage();
    let online = false;
    const sent: string[] = [];
    const send = vi.fn(async (item: QueuedReport) => {
      if (!online) return offline;
      sent.push(item.description);
      return { ok: true } as SendResult;
    });
    const first = createReportQueue(storage, send);
    await first.load();
    await first.submit(report("a"));
    await first.submit(report("b"));
    expect(first.getSnapshot().pending).toBe(2);
    expect(storage.read().map((item) => item.description)).toEqual(["a", "b"]);

    // The app restarts, then the network comes back.
    const second = createReportQueue(storage, send);
    await second.load();
    expect(second.getSnapshot().pending).toBe(2);
    online = true;
    await second.flush();
    expect(sent).toEqual(["a", "b"]);
    expect(second.getSnapshot().pending).toBe(0);
  });

  it("keeps the observation time and the same id on every retry (PAN's review)", async () => {
    const storage = memoryStorage();
    const attempts: QueuedReport[] = [];
    let online = false;
    const send = vi.fn(async (item: QueuedReport) => {
      attempts.push(item);
      return online ? ({ ok: true } as SendResult) : offline;
    });
    const first = createReportQueue(storage, send);
    await first.load();
    await first.submit({
      ...report("a"),
      observedAt: "2026-10-20T07:00:00.000Z",
    });
    await first.flush();
    // Restart, then the network comes back hours later.
    const second = createReportQueue(storage, send);
    await second.load();
    online = true;
    await second.flush();
    expect(attempts).toHaveLength(3);
    expect(new Set(attempts.map((item) => item.clientId)).size).toBe(1);
    expect(attempts[0].clientId).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      attempts.every((item) => item.observedAt === "2026-10-20T07:00:00.000Z"),
    ).toBe(true);
  });

  it("migrates a queue saved by an older version (PAN's second review)", async () => {
    // Saved before this version: no clientId, one item with and one without time.
    const storage = memoryStorage(
      JSON.stringify([
        { ...report("old-with-time"), observedAt: "2026-10-20T07:00:00.000Z" },
        report("old-without-time"),
      ]),
    );
    const attempts: QueuedReport[] = [];
    let answers = 0;
    // The insert succeeds but the first two answers are lost on the network.
    const send = vi.fn(async (item: QueuedReport) => {
      attempts.push(item);
      answers += 1;
      return answers <= 2 ? offline : ({ ok: true } as SendResult);
    });
    const first = createReportQueue(storage, send);
    await first.load();
    expect(first.getSnapshot().notice).toContain("sans heure");
    await first.flush();
    // The app restarts between retries.
    const second = createReportQueue(storage, send);
    await second.load();
    await second.flush();
    await second.flush();
    expect(attempts.map((item) => item.description)).toEqual([
      "old-with-time",
      "old-with-time",
      "old-with-time",
    ]);
    // Same id every time: the database stores the report once.
    expect(new Set(attempts.map((item) => item.clientId)).size).toBe(1);
    expect(attempts[0].clientId).toBeDefined();
    expect(second.getSnapshot().pending).toBe(0);
  });

  it("does not retry a refusal and tells why", async () => {
    const queue = createReportQueue(memoryStorage(), async () => refused);
    await queue.load();
    await queue.submit(report("a"));
    expect(queue.getSnapshot()).toEqual({
      pending: 0,
      notice: refused.message,
    });
  });

  it("runs one flush at a time", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const send = vi.fn(async () => {
      await gate;
      return { ok: true } as SendResult;
    });
    const queue = createReportQueue(memoryStorage(), send);
    await queue.load();
    const pending = queue.submit(report("a"));
    const again = queue.flush();
    release();
    await Promise.all([pending, again]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("ignores a corrupted store", async () => {
    const queue = createReportQueue(memoryStorage("{not json"), async () => ({
      ok: true,
    }));
    await queue.load();
    expect(queue.getSnapshot().pending).toBe(0);
  });
});
