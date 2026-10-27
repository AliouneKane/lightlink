import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useSyncExternalStore } from "react";
import { neighborhoods } from "@/lib/energy";

export const formDraftKeys = {
  report: "lightlink.mobile.draft.report.v1",
  offer: "lightlink.mobile.draft.offer.v1",
};

export function reportDraftKey(neighborhoodId: string) {
  const zone =
    neighborhoods.find((item) => item.id === neighborhoodId) ??
    neighborhoods[0];
  return `${formDraftKeys.report}.${zone.id}`;
}

type Snapshot = {
  value: unknown;
  ready: boolean;
  hasDraft: boolean;
  storageError: string | null;
};
type DraftRecord = ReturnType<typeof createRecord>;
const records = new Map<string, DraftRecord>();

function createRecord(
  key: string,
  initial: unknown,
  parse: (value: unknown) => unknown | null,
) {
  let baseline = initial;
  let snapshot: Snapshot = {
    value: initial,
    ready: false,
    hasDraft: false,
    storageError: null,
  };
  let hydrated = false;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = (next: Snapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const enqueue = (value: unknown | null, expectedRevision: number) => {
    writes = writes
      .then(async () => {
        if (revision !== expectedRevision) return;
        if (value === null) await AsyncStorage.removeItem(key);
        else
          await AsyncStorage.setItem(
            key,
            JSON.stringify({ version: 1, value }),
          );
      })
      .catch(() => {
        if (revision === expectedRevision)
          emit({
            ...snapshot,
            storageError:
              "Draft saving unavailable. Your input is kept for this session.",
          });
      });
    return writes;
  };
  const flush = () => {
    if (timer === undefined) return writes;
    clearTimeout(timer);
    timer = undefined;
    return enqueue(snapshot.hasDraft ? snapshot.value : null, revision);
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(value: unknown) {
      if (snapshot.hasDraft || listeners.size > 0) return;
      baseline = value;
      snapshot = { ...snapshot, value };
    },
    async hydrate() {
      if (hydrated) return;
      hydrated = true;
      const expectedRevision = revision;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (revision !== expectedRevision) return;
        let restored: unknown | null = null;
        if (raw && raw.length < 12_000) {
          try {
            const decoded: unknown = JSON.parse(raw);
            if (
              decoded &&
              typeof decoded === "object" &&
              "version" in decoded &&
              decoded.version === 1 &&
              "value" in decoded
            )
              restored = parse(decoded.value);
          } catch {
            /* Invalid stored drafts never enter a form. */
          }
        }
        emit({
          value: restored ?? baseline,
          ready: true,
          hasDraft:
            restored !== null &&
            JSON.stringify(restored) !== JSON.stringify(baseline),
          storageError: null,
        });
      } catch {
        if (revision === expectedRevision)
          emit({
            ...snapshot,
            ready: true,
            storageError:
              "Draft saving unavailable. Your input is kept for this session.",
          });
      }
    },
    set(value: unknown) {
      revision += 1;
      emit({
        ...snapshot,
        value,
        ready: true,
        hasDraft: JSON.stringify(value) !== JSON.stringify(baseline),
      });
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, 180);
    },
    clear() {
      revision += 1;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      emit({
        value: baseline,
        ready: true,
        hasDraft: false,
        storageError: null,
      });
      return enqueue(null, revision);
    },
    flush,
  };
}

/** Draft edits write only through explicit events, so a reset cannot resurrect stale values. */
export function useFormDraft<T extends object>(
  key: string,
  initial: T,
  parse: (value: unknown) => T | null,
) {
  const [record] = useState(() => {
    const cached = records.get(key);
    if (cached) {
      cached.configure(initial);
      return cached;
    }
    const created = createRecord(key, initial, parse);
    records.set(key, created);
    return created;
  });
  const snapshot = useSyncExternalStore(
    record.subscribe,
    record.getSnapshot,
    record.getSnapshot,
  );
  useEffect(() => {
    void record.hydrate();
    return () => {
      void record.flush();
    };
  }, [record]);
  return {
    ...snapshot,
    value: snapshot.value as T,
    patch: (patch: Partial<T>) =>
      record.set({ ...(record.getSnapshot().value as T), ...patch }),
    clear: () => {
      void record.clear();
    },
  };
}

/** Also notifies any form still mounted behind the profile screen. */
export async function clearFormDrafts() {
  const known = new Set(records.keys());
  await Promise.all([
    ...Array.from(records.values(), (record) => record.clear()),
    ...[
      ...Object.values(formDraftKeys),
      ...neighborhoods.map((zone) => reportDraftKey(zone.id)),
    ]
      .filter((key) => !known.has(key))
      .map((key) => AsyncStorage.removeItem(key)),
  ]);
}
