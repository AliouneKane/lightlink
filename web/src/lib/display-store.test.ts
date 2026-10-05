import { describe, expect, it } from "vitest";
import { defaultDisplay, parseDisplay } from "./display-store";

describe("display preferences boundary", () => {
  it("restores defaults after corrupt or incomplete storage", () => {
    for (const value of [null, "{broken", "{}", "[]", "null"])
      expect(parseDisplay(value)).toEqual(defaultDisplay);
  });
  it("rejects unknown or duplicated sections", () => {
    for (const order of [
      ["offers", "offers", "network"],
      ["offers", "network", "unknown"],
    ])
      expect(
        parseDisplay(JSON.stringify({ ...defaultDisplay, order })),
      ).toEqual(defaultDisplay);
  });
  it("preserves a valid reordered and personalized dashboard", () => {
    const preferences = {
      theme: "light",
      collapsed: true,
      order: ["insights", "offers", "network"],
      visible: { offers: false, network: true, insights: true },
    };
    expect(parseDisplay(JSON.stringify(preferences))).toEqual(preferences);
  });
});
