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
    .getByLabel("Indicateurs de démonstration")
    .getByRole("article")
    .filter({ has: page.getByText(name, { exact: true }) })
    .locator(".stat-copy strong")
    .first();
}

async function revealSidebarControl(page: Page, control: Locator) {
  const visible = await control.isVisible();
  const bounds = visible ? await control.boundingBox() : null;
  if (!visible || !bounds || bounds.x < 0) {
    const menu = page.getByRole("button", {
      name: "Ouvrir le menu",
      exact: true,
    });
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
}

async function closeMobileMenu(page: Page) {
  const menu = page.getByRole("button", {
    name: "Ouvrir le menu",
    exact: true,
  });
  if (
    (await menu.isVisible()) &&
    (await menu.getAttribute("aria-expanded")) === "true"
  ) {
    await page
      .getByRole("button", { name: "Fermer le menu", exact: true })
      .click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  }
}

async function search(page: Page, value: string) {
  const field = page.getByRole("textbox", {
    name: "Rechercher un quartier ou une offre",
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
    name: "Signaler une coupure",
    exact: true,
  });
  await revealSidebarControl(page, trigger);
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Votre quartier a quelque chose à dire.",
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("combobox", { name: "Quartier", exact: true })
    .selectOption("labone");
  if (status === "powered") {
    await dialog.getByRole("button", { name: /Le courant est revenu/ }).click();
  }
  await dialog.getByLabel(/Une précision/).fill(description);
  await dialog
    .getByRole("button", { name: "Confirmer le signalement" })
    .click();
  await expect(dialog).not.toBeVisible();
  await closeMobileMenu(page);
}

async function openProfile(page: Page) {
  const profileButton = page.getByRole("button", {
    name: "Mon profil",
    exact: true,
  });
  if (await profileButton.isVisible()) {
    await profileButton.click();
  } else {
    const sidebarProfile = page.getByRole("button", {
      name: /Profil de démonstration/,
    });
    await revealSidebarControl(page, sidebarProfile);
    await sidebarProfile.click();
  }
  return page.getByRole("dialog", { name: "Bienvenue dans le quartier." });
}

test("dashboard displays the demo and produces a review screenshot", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tableau de bord",
  );
  await expect(
    page.getByText(/Prototype interactif · données simulées à Accra/),
  ).toBeVisible();
  await expect(stat(page, "Quartiers sans courant")).toHaveText(/3\s*\/\s*10/);
  await expect(stat(page, "Contributions")).toHaveText(/5\s*signalements/);
  await expect(stat(page, "Énergie à proximité")).toHaveText(/5\s*offres/);
  await expect(stat(page, "Votre quartier")).toHaveText("Osu");
  await expect(
    page.getByLabel(/Carte interactive des quartiers/),
  ).toBeVisible();
  await expect(
    page.getByText("Chargement de la carte…", { exact: true }),
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
  await report(page, "outage", "Coupure de test dans le quartier Labone.");
  await expect(stat(page, "Quartiers sans courant")).toHaveText(/4\s*\/\s*10/);
  await expect(stat(page, "Contributions")).toHaveText(/6\s*signalements/);
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "9 signalements",
  );
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Coupure signalée",
  );
  await report(page, "powered", "Retour du courant confirmé pour ce test.");
  await expect(stat(page, "Quartiers sans courant")).toHaveText(/3\s*\/\s*10/);
  await expect(stat(page, "Contributions")).toHaveText(/7\s*signalements/);
  await page.reload();
  await expect(stat(page, "Contributions")).toHaveText(/7\s*signalements/);
  await expect(stat(page, "Quartiers sans courant")).toHaveText(/3\s*\/\s*10/);
  await page.goto("/carte");
  await page
    .getByLabel("Quartiers pilotes")
    .getByRole("button", { name: /^Labone\b/ })
    .click();
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "10 signalements",
  );
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Courant disponible",
  );
});

test("the map lists ten pilot neighborhoods and filters layers and search", async ({
  page,
}) => {
  await page.goto("/carte");
  const zones = page.getByLabel("Quartiers pilotes");
  await expect(zones.getByRole("button")).toHaveCount(10);
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(10);
  await zones.getByRole("button", { name: /^Tema Community 1\b/ }).click();
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Tema Community 1",
  );
  await page.getByRole("button", { name: "Coupures", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Coupures", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(6);
  await expect(page.locator(".map-pin")).toHaveCount(0);
  await page.getByRole("button", { name: "Énergie", exact: true }).click();
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(0);
  await expect(page.locator(".map-pin")).toHaveCount(5);
  await page.getByRole("button", { name: "Tout voir", exact: true }).click();
  await search(page, "Osu");
  await expect(zones.getByRole("button")).toHaveCount(1);
  await expect(zones.getByRole("button", { name: /^Osu\b/ })).toBeVisible();
  await search(page, "");
  await expect(zones.getByRole("button")).toHaveCount(10);
});

test("energy filters, publishing, simulated requests and cancellation work", async ({
  page,
}) => {
  await page.goto("/partage");
  const cards = page.locator("#main-content .offer-card");
  await expect(cards).toHaveCount(5);
  await page.getByRole("button", { name: "Solaire", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await search(page, "Labone");
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText(
    "Un bureau, du soleil et du Wi-Fi",
  );
  await search(page, "zzzz introuvable");
  await expect(
    page.getByRole("heading", { name: "Aucune offre ne correspond" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await page.getByRole("button", { name: "Générateur", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "Batterie", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await page
    .getByRole("button", { name: "Toutes les énergies", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publier une offre", exact: true })
    .click();
  const form = page.getByRole("dialog", {
    name: "L’énergie commence par vous.",
  });
  await form
    .getByLabel("Titre de votre offre")
    .fill("Recharge solaire PAN test");
  await form
    .getByRole("combobox", { name: "Source", exact: true })
    .selectOption("solar");
  await form
    .getByRole("combobox", { name: "Quartier", exact: true })
    .selectOption("osu");
  await form
    .getByLabel("Appareils accueillis")
    .fill("Téléphones et ordinateurs");
  await form.getByLabel("Contribution (GHS)").fill("0");
  await form.getByLabel("Places disponibles").fill("3");
  await form.getByLabel("Disponible jusqu’à").fill("21:00");
  await form
    .getByLabel(/Précisions/)
    .fill("Offre locale de test, sans adresse exacte.");
  await form
    .getByRole("button", { name: "Publier l’offre de démonstration" })
    .click();
  await expect(form).not.toBeVisible();
  await expect(cards).toHaveCount(6);
  const card = cards.filter({
    has: page.getByRole("heading", {
      name: "Recharge solaire PAN test",
      exact: true,
    }),
  });
  await card.getByRole("button", { name: "Voir l’offre" }).click();
  const detail = page.getByRole("dialog", {
    name: "Recharge solaire PAN test",
  });
  await detail
    .getByRole("button", { name: "Simuler une demande d’énergie" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mes demandes simulées" }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Demande envoyée" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mes demandes simulées" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mes demandes simulées" }),
  ).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mes demandes simulées" }),
  ).not.toBeVisible();
  await expect(cards).toHaveCount(6);
});

test("demo authentication saves a profile without persisting email or password", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = await openProfile(page);
  await dialog.getByLabel("Votre nom", { exact: true }).fill("PAN Test");
  await dialog.getByLabel("Adresse e-mail").fill("pan.qa@example.com");
  const password = dialog.getByLabel("Mot de passe", { exact: true });
  await password.fill("SecretTest-2026!");
  await dialog
    .getByRole("button", { name: "Afficher le mot de passe" })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await dialog.getByRole("button", { name: "Masquer le mot de passe" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await dialog
    .getByRole("combobox", { name: "Votre quartier", exact: true })
    .selectOption("labone");
  await dialog.getByRole("button", { name: "Essayer l’inscription" }).click();
  await expect(dialog).not.toBeVisible();
  await closeMobileMenu(page);
  await page.goto("/parametres");
  await expect(page.getByLabel("Votre nom", { exact: true })).toHaveValue(
    "PAN Test",
  );
  await expect(
    page.getByRole("combobox", { name: "Votre quartier", exact: true }),
  ).toHaveValue("labone");
  const storage = await page.evaluate(() =>
    Object.values(localStorage).join(" "),
  );
  expect(storage).not.toContain("SecretTest-2026!");
  expect(storage).not.toContain("pan.qa@example.com");
  expect(storage).toContain("PAN Test");
  await page.reload();
  await expect(page.getByLabel("Votre nom", { exact: true })).toHaveValue(
    "PAN Test",
  );
});

test("preferences and reset restore the initial demo state", async ({
  page,
}) => {
  const customOffer = {
    ...initialState.offers[0],
    id: "offer-before-reset",
    title: "Offre créée avant réinitialisation",
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
            description: "Signalement local à effacer.",
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
  await page.goto("/parametres");
  await page.getByLabel("Votre nom", { exact: true }).fill("PAN Reset Test");
  await page
    .getByRole("combobox", { name: "Votre quartier", exact: true })
    .selectOption("labone");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "Alertes dans la démo" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Votre nom", { exact: true })).toHaveValue(
    "PAN Reset Test",
  );
  await page
    .getByRole("button", { name: "Réinitialiser les données locales" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Réinitialiser votre démonstration ?",
  });
  await dialog.getByRole("button", { name: "Garder mes données" }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("button", { name: "Réinitialiser les données locales" })
    .click();
  await dialog
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(page.getByLabel("Votre nom", { exact: true })).toHaveValue(
    "PAN",
  );
  await expect(
    page.getByRole("combobox", { name: "Votre quartier", exact: true }),
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
    name: "Signaler une coupure",
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
  const menu = page.getByRole("button", { name: "Ouvrir le menu" });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page
    .getByLabel("Navigation principale")
    .getByRole("link", { name: "Carte du réseau", exact: true })
    .click();
  await expect(page).toHaveURL(/\/carte$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Carte du réseau",
  );
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await page
    .getByRole("button", { name: "Fermer le menu", exact: true })
    .click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("sidebar neighborhood and source links open the matching selection", async ({
  page,
}) => {
  await page.goto("/");
  const sidebar = page.getByRole("complementary", {
    name: "Navigation principale",
  });
  const madina = sidebar
    .locator(".sidebar-zone-links")
    .getByRole("link", { name: /^Madina\b/ });
  await revealSidebarControl(page, madina);
  await expect(madina).toHaveAttribute("href", "/carte?quartier=madina");
  await madina.click();
  await expect(page).toHaveURL(/\/carte\?quartier=madina$/);
  await expect(page.locator(".neighborhood-detail strong")).toHaveText(
    "Madina",
  );
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "11 signalements",
  );
  await expect(page.locator(".neighborhood-detail")).toContainText(
    "Coupure probable",
  );
  await expect(
    page
      .getByLabel("Quartiers pilotes")
      .getByRole("button", { name: /^Madina\b/ }),
  ).toHaveAttribute("aria-pressed", "true");

  const solar = sidebar
    .locator(".source-nav")
    .getByRole("link", { name: /^Solaire\b/ });
  await revealSidebarControl(page, solar);
  await expect(solar).toHaveAttribute("href", "/partage?source=solar");
  await solar.click();
  await expect(page).toHaveURL(/\/partage\?source=solar$/);
  const cards = page.locator("#main-content .offer-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.locator(".offer-source")).toHaveText([
    "Solaire",
    "Solaire",
  ]);
  await expect(
    page.getByRole("button", { name: "Solaire", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(cards).toHaveCount(2);
  await expect(cards.locator(".offer-source")).toHaveText([
    "Solaire",
    "Solaire",
  ]);

  const generator = sidebar
    .locator(".source-nav")
    .getByRole("link", { name: /^Générateur\b/ });
  await revealSidebarControl(page, generator);
  await generator.click();
  await expect(page).toHaveURL(/\/partage\?source=generator$/);
  await expect(cards).toHaveCount(1);
  await expect(cards.locator(".offer-source")).toHaveText("Générateur");
});

test("offline tiles leave labels, reporting and local state available", async ({
  page,
  context,
}) => {
  await context.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.getByText(/Le fond de carte est indisponible/)).toBeVisible(
    { timeout: 20_000 },
  );
  await expect(page.locator(".map-neighborhood-label")).toHaveCount(10);
  await expect(page.locator(".map-pin")).toHaveCount(5);
  await context.setOffline(true);
  await expect(page.getByText(/Hors connexion\./)).toBeVisible();
  await report(page, "outage", "Signalement local en mode hors connexion.");
  await expect(stat(page, "Contributions")).toHaveText(/6\s*signalements/);
  await context.setOffline(false);
  await page.reload();
  await expect(stat(page, "Contributions")).toHaveText(/6\s*signalements/);
});

test("dashboard sections can be reordered, hidden and restored after reload", async ({
  page,
}) => {
  await page.goto("/");
  const sections = page.locator(".dashboard-content > .dashboard-section");
  const offers = sections.filter({
    has: page.getByRole("heading", { name: /^Énergie à proximité/ }),
  });
  const network = sections.filter({
    has: page.getByRole("heading", {
      name: "Le réseau de votre quartier",
      exact: true,
    }),
  });
  const insights = sections.filter({
    has: page.getByRole("heading", {
      name: "Prévisions et dernières contributions",
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
    .getByRole("button", { name: "Monter Carte du réseau", exact: true })
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
    .getByRole("checkbox", { name: "Énergie à proximité", exact: true })
    .uncheck();
  await layout
    .getByRole("checkbox", { name: "Prévisions et activité", exact: true })
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
    layout.getByRole("checkbox", { name: "Énergie à proximité", exact: true }),
  ).not.toBeChecked();
  await expect(
    layout.getByRole("checkbox", { name: "Carte du réseau", exact: true }),
  ).toBeChecked();
  await layout
    .getByRole("button", { name: "Rétablir la disposition", exact: true })
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
    "Énergie à proximité",
    "Carte du réseau",
    "Prévisions et activité",
  ]) {
    await layout.getByRole("checkbox", { name, exact: true }).uncheck();
  }
  await layout.locator("summary").click();
  await expect(page.locator(".dashboard-section")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Votre espace, à votre façon.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rétablir les sections", exact: true })
    .click();
  await expect(page.locator(".dashboard-section")).toHaveCount(3);
  await expect(
    page.getByRole("heading", {
      name: "Votre espace, à votre façon.",
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
    .getByRole("button", { name: "Activer le thème clair", exact: true })
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
    .getByRole("button", { name: "Activer le thème sombre", exact: true })
    .click();
  await expect(shell).toHaveAttribute("data-theme", "dark");
});

test("desktop sidebar collapse changes its width and survives reload", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop sidebar preference");
  await page.goto("/");
  const sidebar = page.getByRole("complementary", {
    name: "Navigation principale",
  });
  const expandedWidth = await sidebar.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await page
    .getByRole("button", { name: "Réduire la barre latérale", exact: true })
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
    .getByRole("button", { name: "Développer la barre latérale", exact: true })
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
    "/carte",
    "/previsions",
    "/partage",
    "/communaute",
    "/parametres",
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
