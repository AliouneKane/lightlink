import { expect, test, type Locator, type Page } from "@playwright/test";
import { initialState, storageKey } from "../src/lib/energy";
import { defaultDisplay, displayKey } from "../src/lib/display-store";

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      /hydration|hydrated|Minified React error|uncaught/i.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page), "No runtime or hydration errors").toEqual([]);
});

function stat(page: Page, name: string): Locator {
  return page
    .getByLabel("Demo indicators")
    .getByRole("article")
    .filter({ has: page.getByText(name, { exact: true }) })
    .locator(".stat-copy strong")
    .first();
}

async function revealSidebarControl(page: Page, control: Locator) {
  const menu = page.getByRole("button", {
    name: "Open menu",
    exact: true,
  });
  if (await menu.isVisible()) {
    // A hidden sidebar leaves the accessibility tree between locator calls.
    // Open the drawer before resolving or measuring any of its controls.
    if ((await menu.getAttribute("aria-expanded")) !== "true") {
      await menu.click();
    }
    await expect(menu).toHaveAttribute("aria-expanded", "true");
  }
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
}

async function closeMobileMenu(page: Page) {
  const menu = page.getByRole("button", {
    name: "Open menu",
    exact: true,
  });
  if (
    (await menu.isVisible()) &&
    (await menu.getAttribute("aria-expanded")) === "true"
  ) {
    await page.getByRole("button", { name: "Close menu", exact: true }).click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("complementary", {
        name: "Main navigation",
        includeHidden: true,
      }),
    ).toBeHidden();
  }
}

async function search(page: Page, value: string) {
  const field = page.getByRole("textbox", {
    name: "Search a neighbourhood or an offer",
    exact: true,
  });
  await revealSidebarControl(page, field);
  await field.fill(value);
  await closeMobileMenu(page);
}

async function report(
  page: Page,
  status: "outage" | "powered",
  description: string,
) {
  const trigger = page.getByRole("button", {
    name: "Report an outage",
    exact: true,
  });
  await revealSidebarControl(page, trigger);
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Your neighbourhood has something to say.",
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("combobox", { name: "Neighbourhood", exact: true })
    .selectOption("labone");
  if (status === "powered") {
    await dialog.getByRole("button", { name: /Power is back/ }).click();
  }
  await dialog.getByLabel(/Any detail/).fill(description);
  await dialog.getByRole("button", { name: "Confirm report" }).click();
  await expect(dialog).not.toBeVisible();
  await closeMobileMenu(page);
}

async function openProfile(page: Page) {
  const profileButton = page.getByRole("button", {
    name: "My profile",
    exact: true,
  });
  if (await profileButton.isVisible()) {
    await profileButton.click();
  } else {
    const sidebarProfile = page.getByRole("button", {
      name: /Demo profile/,
    });
    await revealSidebarControl(page, sidebarProfile);
    await sidebarProfile.click();
  }
  return page.getByRole("dialog", { name: "Welcome to the neighbourhood." });
}

test("dashboard displays the demo and produces a review screenshot", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expect(
    page.getByText(/Interactive prototype · simulated data in Accra/),
  ).toBeVisible();
  await expect(stat(page, "Neighbourhoods without power")).toHaveText(
    /3\s*\/\s*10/,
  );
  await expect(stat(page, "Contributions")).toHaveText(/5\s*reports/);
  await expect(stat(page, "Energy nearby")).toHaveText(/5\s*offers/);
  await expect(stat(page, "Your neighbourhood")).toHaveText("Osu");
  await expect(
    page.getByLabel(/Interactive map of neighbourhoods/),
  ).toBeVisible();
  await expect(
    page.getByText("Loading the map…", { exact: true }),
  ).not.toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath(`dashboard-${testInfo.project.name}.png`),
    fullPage: true,
    animations: "disabled",
  });
});

test("outage and restoration update counters and survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await report(page, "outage", "Test outage in the Labone neighbourhood.");
  await expect(stat(page, "Neighbourhoods without power")).toHaveText(
    /4\s*\/\s*10/,
  );
  await expect(stat(page, "Contributions")).toHaveText(/6\s*reports/);
  await expect(page.locator(".neighborhood-detail")).toContainText("9 reports");
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Outage reported",
  );
  await report(page, "powered", "Power return confirmed for this test.");
  await expect(stat(page, "Neighbourhoods without power")).toHaveText(
    /3\s*\/\s*10/,
  );
  await expect(stat(page, "Contributions")).toHaveText(/7\s*reports/);
  await page.reload();
  await expect(stat(page, "Contributions")).toHaveText(/7\s*reports/);
  await expect(stat(page, "Neighbourhoods without power")).toHaveText(
    /3\s*\/\s*10/,
  );
  await page.goto("/map");
  await page
    .getByLabel("Pilot neighbourhoods")
    .getByRole("button", { name: /^Labone\b/ })
    .click();
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "10 reports",
  );
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Power available",
  );
});

test("the map lists ten pilot neighborhoods and filters layers and search", async ({
  page,
}) => {
  await page.goto("/map");
  const zones = page.getByLabel("Pilot neighbourhoods");
  await expect(zones.getByRole("button")).toHaveCount(10);
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(10);
  await zones.getByRole("button", { name: /^Tema Community 1\b/ }).click();
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Tema Community 1",
  );
  await page.getByRole("button", { name: "Outages", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Outages", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(6);
  await expect(page.locator(".map-pin")).toHaveCount(0);
  await page.getByRole("button", { name: "Energy", exact: true }).click();
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(0);
  await expect(page.locator(".map-pin")).toHaveCount(5);
  await page.getByRole("button", { name: "Show all", exact: true }).click();
  await search(page, "Osu");
  await expect(zones.getByRole("button")).toHaveCount(1);
  await expect(zones.getByRole("button", { name: /^Osu\b/ })).toBeVisible();
  await search(page, "");
  await expect(zones.getByRole("button")).toHaveCount(10);
});

test("energy filters, publishing, simulated requests and cancellation work", async ({
  page,
}) => {
  await page.goto("/sharing");
  const cards = page.locator("#main-content .offer-card");
  await expect(cards).toHaveCount(5);
  await page.getByRole("button", { name: "Solar", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await search(page, "Labone");
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText(
    "A desk, sunshine and Wi-Fi",
  );
  await search(page, "zzzz not found");
  await expect(
    page.getByRole("heading", { name: "No matching offer" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByRole("button", { name: "Generator", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "Battery", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await page.getByRole("button", { name: "All energy", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish an offer", exact: true })
    .click();
  const form = page.getByRole("dialog", {
    name: "Energy starts with you.",
  });
  await form
    .getByLabel("Title of your offer")
    .fill("Recharge solaire PAN test");
  await form
    .getByRole("combobox", { name: "Source", exact: true })
    .selectOption("solar");
  await form
    .getByRole("combobox", { name: "Neighbourhood", exact: true })
    .selectOption("osu");
  await form.getByLabel("Devices welcome").fill("Phones and laptops");
  await form.getByLabel("Contribution (GHS)").fill("0");
  await form.getByLabel("Available places").fill("3");
  await form.getByLabel("Available until").fill("21:00");
  await form
    .getByLabel(/Details/)
    .fill("Offre locale de test, sans adresse exacte.");
  await form.getByRole("button", { name: "Publish the demo offer" }).click();
  await expect(form).not.toBeVisible();
  await expect(cards).toHaveCount(6);
  const card = cards.filter({
    has: page.getByRole("heading", {
      name: "Recharge solaire PAN test",
      exact: true,
    }),
  });
  await card.getByRole("button", { name: "View offer" }).click();
  const detail = page.getByRole("dialog", {
    name: "Recharge solaire PAN test",
  });
  await detail
    .getByRole("button", { name: "Simulate an energy request" })
    .click();
  await expect(
    page.getByRole("heading", { name: "My simulated requests" }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Request sent" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My simulated requests" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My simulated requests" }),
  ).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My simulated requests" }),
  ).not.toBeVisible();
  await expect(cards).toHaveCount(6);
});

test("demo authentication saves a profile without persisting email or password", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = await openProfile(page);
  await dialog.getByLabel("Your name", { exact: true }).fill("PAN Test");
  await dialog.getByLabel("Email address").fill("pan.qa@example.com");
  const password = dialog.getByLabel("Password", { exact: true });
  await password.fill("SecretTest-2026!");
  await dialog.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await dialog.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await dialog
    .getByRole("combobox", { name: "Your neighbourhood", exact: true })
    .selectOption("labone");
  await dialog.getByRole("button", { name: "Try sign-up" }).click();
  await expect(dialog).not.toBeVisible();
  await closeMobileMenu(page);
  await page.goto("/settings");
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "PAN Test",
  );
  await expect(
    page.getByRole("combobox", { name: "Your neighbourhood", exact: true }),
  ).toHaveValue("labone");
  const storage = await page.evaluate(() =>
    Object.values(localStorage).join(" "),
  );
  expect(storage).not.toContain("SecretTest-2026!");
  expect(storage).not.toContain("pan.qa@example.com");
  expect(storage).toContain("PAN Test");
  await page.reload();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "PAN Test",
  );
});

test("preferences and reset restore the initial demo state", async ({
  page,
}) => {
  const customOffer = {
    ...initialState.offers[0],
    id: "offer-before-reset",
    title: "Offer created before reset",
  };
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
    },
    {
      key: storageKey,
      state: {
        ...initialState,
        reports: [
          {
            id: "report-before-reset",
            neighborhoodId: "labone",
            status: "outage",
            author: "PAN",
            createdAt: "2026-10-04T16:00:00.000Z",
            description: "Local report to delete.",
          },
          ...initialState.reports,
        ],
        offers: [customOffer, ...initialState.offers],
        bookings: [
          {
            id: "booking-before-reset",
            offerId: customOffer.id,
            createdAt: "2026-10-04T16:00:00.000Z",
          },
        ],
      },
    },
  );
  await page.goto("/settings");
  await page.getByLabel("Your name", { exact: true }).fill("PAN Reset Test");
  await page
    .getByRole("combobox", { name: "Your neighbourhood", exact: true })
    .selectOption("labone");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "Alerts in the demo" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "PAN Reset Test",
  );
  await page.getByRole("button", { name: "Reset local data" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Reset your demo?",
  });
  await dialog.getByRole("button", { name: "Keep my data" }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Reset local data" }).click();
  await dialog.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "PAN",
  );
  await expect(
    page.getByRole("combobox", { name: "Your neighbourhood", exact: true }),
  ).toHaveValue("osu");
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    storageKey,
  );
  expect(persisted).toEqual(initialState);
});

test("keyboard closes a modal with Escape and restores the trigger focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Report an outage",
    exact: true,
  });
  await revealSidebarControl(page, trigger);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(document.activeElement?.closest("dialog"))),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await closeMobileMenu(page);
});

test("mobile navigation opens, navigates and closes", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer interaction");
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page
    .getByLabel("Main navigation")
    .getByRole("link", { name: "Network map", exact: true })
    .click();
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Network map",
  );
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("sidebar neighborhood and source links open the matching selection", async ({
  page,
}) => {
  await page.goto("/");
  const sidebar = page.getByRole("complementary", {
    name: "Main navigation",
  });
  const madina = sidebar
    .locator(".sidebar-zone-links")
    .getByRole("link", { name: /^Madina\b/ });
  await revealSidebarControl(page, madina);
  await expect(madina).toHaveAttribute("href", "/map?zone=madina");
  await madina.click();
  await expect(page).toHaveURL(/\/map\?zone=madina$/);
  await expect(page.locator(".neighborhood-detail strong")).toHaveText(
    "Madina",
  );
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "11 reports",
  );
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Likely outage",
  );
  await expect(
    page
      .getByLabel("Pilot neighbourhoods")
      .getByRole("button", { name: /^Madina\b/ }),
  ).toHaveAttribute("aria-pressed", "true");

  const solar = sidebar
    .locator(".source-nav")
    .getByRole("link", { name: /^Solar\b/ });
  await revealSidebarControl(page, solar);
  await expect(solar).toHaveAttribute("href", "/sharing?source=solar");
  await solar.click();
  await expect(page).toHaveURL(/\/sharing\?source=solar$/);
  const cards = page.locator("#main-content .offer-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.locator(".offer-source")).toHaveText(["Solar", "Solar"]);
  await expect(
    page.getByRole("button", { name: "Solar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(cards).toHaveCount(2);
  await expect(cards.locator(".offer-source")).toHaveText(["Solar", "Solar"]);

  const generator = sidebar
    .locator(".source-nav")
    .getByRole("link", { name: /^Generator\b/ });
  await revealSidebarControl(page, generator);
  await generator.click();
  await expect(page).toHaveURL(/\/sharing\?source=generator$/);
  await expect(cards).toHaveCount(1);
  await expect(cards.locator(".offer-source")).toHaveText("Generator");
});

test("offline tiles leave labels, reporting and local state available", async ({
  page,
  context,
}) => {
  await context.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.getByText(/The base map is unavailable/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(10);
  await expect(page.locator(".map-pin")).toHaveCount(5);
  await context.setOffline(true);
  await expect(page.getByText(/Offline\./)).toBeVisible();
  await report(page, "outage", "Signalement local en mode hors connexion.");
  await expect(stat(page, "Contributions")).toHaveText(/6\s*reports/);
  await context.setOffline(false);
  await page.reload();
  await expect(stat(page, "Contributions")).toHaveText(/6\s*reports/);
});

test("dashboard sections can be reordered, hidden and restored after reload", async ({
  page,
}) => {
  await page.goto("/");
  const sections = page.locator(".dashboard-content > .dashboard-section");
  const offers = sections.filter({
    has: page.getByRole("heading", { name: /^Energy nearby/ }),
  });
  const network = sections.filter({
    has: page.getByRole("heading", {
      name: "Your neighbourhood’s grid",
      exact: true,
    }),
  });
  const insights = sections.filter({
    has: page.getByRole("heading", {
      name: "Forecast and latest contributions",
      exact: true,
    }),
  });
  await expect(sections).toHaveCount(3);
  await expect(offers).toHaveCSS("order", "0");
  await expect(network).toHaveCSS("order", "1");

  const layout = page.locator("details.layout-menu");
  const trigger = layout.locator("summary");
  await trigger.click();
  await layout
    .getByRole("button", { name: "Move up Network map", exact: true })
    .click();
  await expect(network).toHaveCSS("order", "0");
  await expect(offers).toHaveCSS("order", "1");
  const networkTop = await network.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  const offersTop = await offers.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(networkTop).toBeLessThan(offersTop);

  await layout
    .getByRole("checkbox", { name: "Energy nearby", exact: true })
    .uncheck();
  await layout
    .getByRole("checkbox", { name: "Forecast and activity", exact: true })
    .uncheck();
  await trigger.click();
  await expect(offers).toHaveCount(0);
  await expect(insights).toHaveCount(0);
  await expect(network).toBeVisible();

  await page.reload();
  await expect(sections).toHaveCount(1);
  await expect(network).toHaveCSS("order", "0");
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    displayKey,
  );
  expect(persisted.order).toEqual(["network", "offers", "insights"]);
  expect(persisted.visible).toEqual({
    offers: false,
    network: true,
    insights: false,
  });

  await trigger.click();
  await expect(
    layout.getByRole("checkbox", { name: "Energy nearby", exact: true }),
  ).not.toBeChecked();
  await expect(
    layout.getByRole("checkbox", { name: "Network map", exact: true }),
  ).toBeChecked();
  await layout
    .getByRole("button", { name: "Reset layout", exact: true })
    .click();
  await trigger.click();
  await expect(sections).toHaveCount(3);
  await expect(offers).toHaveCSS("order", "0");
  await expect(network).toHaveCSS("order", "1");
  await expect(insights).toHaveCSS("order", "2");
});

test("hiding every dashboard section presents a working restoration action", async ({
  page,
}) => {
  await page.goto("/");
  const layout = page.locator("details.layout-menu");
  await layout.locator("summary").click();
  for (const name of [
    "Energy nearby",
    "Network map",
    "Forecast and activity",
  ]) {
    await layout.getByRole("checkbox", { name, exact: true }).uncheck();
  }
  await layout.locator("summary").click();
  await expect(page.locator(".dashboard-section")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Your space, your way.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore sections", exact: true })
    .click();
  await expect(page.locator(".dashboard-section")).toHaveCount(3);
  await expect(
    page.getByRole("heading", {
      name: "Your space, your way.",
      exact: true,
    }),
  ).not.toBeVisible();
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    displayKey,
  );
  expect(persisted.visible).toEqual(defaultDisplay.visible);
  expect(persisted.order).toEqual(defaultDisplay.order);
});

test("theme choice survives reload and can be changed back", async ({
  page,
}) => {
  await page.goto("/");
  const shell = page.locator(".app-shell");
  await expect(shell).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(shell).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(shell).toHaveAttribute("data-theme", "light");
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    displayKey,
  );
  expect(persisted.theme).toBe("light");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(shell).toHaveAttribute("data-theme", "dark");
});

test("pilot neighborhoods toggle by arrow and keyboard and survive reload", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const sidebar = page.getByRole("complementary", {
    name: "Main navigation",
  });
  const toggle = sidebar.getByRole("button", {
    name: "Pilot neighbourhoods",
    exact: true,
  });
  const neighborhoods = sidebar.locator(".sidebar-zone-links");
  await revealSidebarControl(page, toggle);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(neighborhoods.getByRole("link")).toHaveCount(10);
  await toggle.locator(".sidebar-group-chevron").click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(neighborhoods).not.toBeVisible();
  await expect(
    sidebar.locator(".source-nav").getByRole("link", { name: /Solar/ }),
  ).toBeVisible();
  await page.reload();
  await revealSidebarControl(page, toggle);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(neighborhoods).not.toBeVisible();
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(neighborhoods).toBeVisible();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(neighborhoods).not.toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("pilot-neighborhoods-closed.png"),
  });
  await toggle.press("Enter");
  await neighborhoods.getByRole("link", { name: /^Madina/ }).click();
  await expect(page).toHaveURL(/\/map\?zone=madina$/);
  await expect(page.locator(".neighborhood-detail strong")).toHaveText(
    "Madina",
  );
});

test("desktop sidebar collapse changes its width and survives reload", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop sidebar preference");
  await page.goto("/");
  const sidebar = page.getByRole("complementary", {
    name: "Main navigation",
  });
  const expandedWidth = await sidebar.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await page
    .getByRole("button", { name: "Collapse the sidebar", exact: true })
    .click();
  await expect(page.locator(".app-shell")).toHaveClass(/sidebar-is-collapsed/);
  await expect
    .poll(() =>
      sidebar.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeLessThan(expandedWidth);
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveClass(/sidebar-is-collapsed/);
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    displayKey,
  );
  expect(persisted.collapsed).toBe(true);
  await page
    .getByRole("button", { name: "Expand the sidebar", exact: true })
    .click();
  await expect(page.locator(".app-shell")).not.toHaveClass(
    /sidebar-is-collapsed/,
  );
  await expect
    .poll(() =>
      sidebar.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBe(expandedWidth);
});

test("all routes fit the viewport without horizontal overflow", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/map",
    "/forecast",
    "/sharing",
    "/community",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document, `${route}: document width`).toBeLessThanOrEqual(
      dimensions.viewport + 1,
    );
    expect(dimensions.body, `${route}: body width`).toBeLessThanOrEqual(
      dimensions.viewport + 1,
    );
  }
});
