"use client";

import { useSyncExternalStore } from "react";
import {
  initialState,
  legacyStorageKey,
  loadStoredState,
  storageKey,
  type DemoState,
} from "./energy";

let snapshot: DemoState | null = null;
const listeners = new Set<() => void>();

function readLegacy() {
  try {
    return window.localStorage.getItem(legacyStorageKey);
  } catch {
    return null;
  }
}

function readState() {
  if (snapshot) return snapshot;
  let saved: string | null;
  try {
    saved = window.localStorage.getItem(storageKey);
  } catch {
    snapshot = initialState;
    return snapshot;
  }
  const { state, migrated } = loadStoredState(
    saved,
    saved === null ? readLegacy() : null,
  );
  snapshot = state;
  if (migrated) {
    // Migrate once: the v2 store becomes the source of truth.
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
      window.localStorage.removeItem(legacyStorageKey);
    } catch {
      // The next session migrates again; the session itself still works.
    }
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
