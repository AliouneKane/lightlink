"use client";

import { useSyncExternalStore } from "react";
import {
  initialState,
  parseStoredState,
  storageKey,
  type DemoState,
} from "./energy";

let snapshot: DemoState | null = null;
const listeners = new Set<() => void>();

function readState() {
  if (snapshot) return snapshot;
  try {
    snapshot = parseStoredState(window.localStorage.getItem(storageKey));
  } catch {
    snapshot = initialState;
  }
  return snapshot;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      snapshot = null;
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns false when browser storage is unavailable; the session still works. */
export function updateDemoState(
  update: (state: DemoState) => DemoState,
): boolean {
  snapshot = update(readState());
  let persisted = true;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    persisted = false;
  }
  notify();
  return persisted;
}

export function useDemoState() {
  return useSyncExternalStore(subscribe, readState, () => initialState);
}
