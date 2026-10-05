"use client";

import { useSyncExternalStore } from "react";

export const sectionIds = ["offers", "network", "insights"] as const;
export type SectionId = (typeof sectionIds)[number];
export interface DisplayPreferences {
  theme: "dark" | "light";
  collapsed: boolean;
  neighborhoodsOpen: boolean;
  order: SectionId[];
  visible: Record<SectionId, boolean>;
}
export const displayKey = "lightlink.display.v1";
export const defaultDisplay: DisplayPreferences = {
  theme: "dark",
  collapsed: false,
  neighborhoodsOpen: true,
  order: [...sectionIds],
  visible: { offers: true, network: true, insights: true },
};

export function parseDisplay(value: string | null): DisplayPreferences {
  try {
    const raw: unknown = value ? JSON.parse(value) : null;
    if (!raw || typeof raw !== "object") return defaultDisplay;
    const data = raw as Record<string, unknown>;
    if (
      (data.theme !== "dark" && data.theme !== "light") ||
      typeof data.collapsed !== "boolean" ||
      (data.neighborhoodsOpen !== undefined &&
        typeof data.neighborhoodsOpen !== "boolean") ||
      !Array.isArray(data.order) ||
      data.order.length !== 3 ||
      new Set(data.order).size !== 3 ||
      !data.order.every((id) => sectionIds.includes(id)) ||
      !data.visible ||
      typeof data.visible !== "object"
    )
      return defaultDisplay;
    const visible = data.visible as Record<string, unknown>;
    if (!sectionIds.every((id) => typeof visible[id] === "boolean"))
      return defaultDisplay;
    return {
      theme: data.theme,
      collapsed: data.collapsed,
      neighborhoodsOpen:
        typeof data.neighborhoodsOpen === "boolean"
          ? data.neighborhoodsOpen
          : true,
      order: data.order as SectionId[],
      visible: {
        offers: visible.offers as boolean,
        network: visible.network as boolean,
        insights: visible.insights as boolean,
      },
    };
  } catch {
    return defaultDisplay;
  }
}

let snapshot: DisplayPreferences | null = null;
const listeners = new Set<() => void>();
function read() {
  if (snapshot) return snapshot;
  try {
    snapshot = parseDisplay(localStorage.getItem(displayKey));
  } catch {
    snapshot = defaultDisplay;
  }
  return snapshot;
}
function notify() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === displayKey || event.key === null) {
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
export function updateDisplay(
  update: (previous: DisplayPreferences) => DisplayPreferences,
) {
  snapshot = update(read());
  try {
    localStorage.setItem(displayKey, JSON.stringify(snapshot));
  } catch {
    /* Still usable for this session. */
  }
  notify();
}
export function useDisplay() {
  return useSyncExternalStore(subscribe, read, () => defaultDisplay);
}
