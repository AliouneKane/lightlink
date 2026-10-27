import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const demoKey = "lightlink.mobile.demo.v2";
const displayKey = "lightlink.mobile.display.v1";
const runtimeErrors = new WeakMap<Page, string[]>();

test("le tri reste accessible sur un petit écran et conserve les filtres", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 380 });
  await page.goto("/partage");
  const offerCards = page.getByRole("button", {
    name: /^(A desk, sunshine and Wi-Fi|Quick charging in Osu|Solar power for your projects|An energy stop in Adabraka|Quiet charging in East Legon)$/,
  });
  await page.getByRole("button", { name: "Sort offers", exact: true }).click();
  await page.getByRole("radio", { name: "Low budget", exact: true }).click();
  await expect
    .poll(() =>
      offerCards.evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      ),
    )
    .toEqual([
      "Quick charging in Osu",
      "Quiet charging in East Legon",
      "A desk, sunshine and Wi-Fi",
      "Solar power for your projects",
      "An energy stop in Adabraka",
    ]);
  await page.getByRole("button", { name: "Solar", exact: true }).click();
  await page.getByRole("button", { name: "Sort offers", exact: true }).click();
  await page.getByRole("radio", { name: "Most places", exact: true }).click();
  await expect(offerCards).toHaveCount(2);
  await expect(offerCards.first()).toHaveAttribute(
    "aria-label",
    "Solar power for your projects",
  );
  await expect(
    page.getByRole("heading", { name: "Your way.", exact: true }),
  ).toHaveCount(0);
});

async function home(page: Page) {
  await page.goto("/");
  await expect(page.getByText(/Hello .+ 👋/)).toBeVisible();
}

async function chooseZone(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Choose the neighbourhood", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
}

async function openTab(page: Page, name: string) {
  // React Navigation's web tabs are links with the native button role.
  await page
    .locator("a")
    .filter({ has: page.getByText(name, { exact: true }) })
    .last()
    .click();
}

async function savedState(page: Page) {
  return page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, demoKey);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Uncaught|ReferenceError|TypeError|Invariant Violation/.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
  await home(page);
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], "No browser runtime exception").toEqual(
    [],
  );
});

test("les onglets donnent accès aux quatre parcours", async ({ page }) => {
  await openTab(page, "Map");
  await expect(
    page.getByRole("heading", { name: "Neighbourhood map" }),
  ).toBeVisible();
  await expect(
    page.getByText("Schematic preview · approximate centres"),
  ).toBeVisible();
  await openTab(page, "Sharing");
  await expect(
    page.getByRole("heading", { name: "Good energy nearby." }),
  ).toBeVisible();
  await openTab(page, "Community");
  await expect(
    page.getByRole("heading", { name: "Community", exact: true }),
  ).toBeVisible();
  await openTab(page, "Home");
  await expect(page.getByText("Hello PAN 👋")).toBeVisible();
});

test("un signalement modifie le quartier et persiste après rechargement", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await page.getByRole("button", { name: "Save my report" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Choose the power status you observe.",
  );
  await page.getByRole("radio", { name: "The power is on" }).click();
  await page
    .getByRole("button", { name: "Anything to add?", exact: true })
    .click();
  await page
    .getByLabel("Your observation", { exact: true })
    .fill("The power came back on my street.");
  await page.getByRole("button", { name: "Save my report" }).click();
  await expect(
    page.getByText(
      "Your report is saved on this device. The neighbourhood’s local status has been updated.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "View the community" }).click();
  await expect(
    page.getByText("The power came back on my street.", { exact: true }),
  ).toBeVisible();
  await home(page);
  await expect(
    page.getByText("The power is on.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("25 reports · demo", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("The power is on.", { exact: true }),
  ).toBeVisible();
});

test("le profil local suit le nom et le quartier enregistrés", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open my profile" }).click();
  await page
    .getByRole("button", { name: "Edit my profile", exact: true })
    .click();
  await page
    .getByLabel("What should we call you?", { exact: true })
    .fill("Amadou Ndiaye");
  await chooseZone(page, "Madina");
  await page.getByRole("button", { name: "Save my profile" }).click();
  await expect(page.getByText("Profile saved on this device.")).toBeVisible();
  await home(page);
  await expect(page.getByText("Hello Amadou Ndiaye 👋")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Change my neighbourhood", exact: true }),
  ).toHaveText("Madina");
  await expect(
    page.getByText("The power is unstable.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Hello Amadou Ndiaye 👋")).toBeVisible();
  await page.goto("/partage");
  await expect(
    page.getByRole("button", {
      name: "Search around a neighbourhood",
      exact: true,
    }),
  ).toHaveText("Madina");
});

test("le panneau profil protège le brouillon et permet de sauvegarder ou abandonner avant de quitter", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open my profile" }).click();
  await page
    .getByRole("button", { name: "Edit my profile", exact: true })
    .click();
  const nameField = page.getByLabel("What should we call you?", {
    exact: true,
  });
  const closeEditor = page.getByRole("button", {
    name: "Close profile editing",
    exact: true,
  });
  const confirmation = page.getByRole("heading", {
    name: "Keep your changes?",
    exact: true,
  });
  await nameField.fill("Ama Mensah");
  await closeEditor.click();
  await expect(confirmation).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(nameField).toHaveValue("Ama Mensah");
  await closeEditor.click();
  await expect(confirmation).toBeVisible();
  await page
    .getByRole("button", { name: "Save and leave", exact: true })
    .click();
  await expect(nameField).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Ama Mensah", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await savedState(page))?.profile.name)
    .toBe("Ama Mensah");

  await page
    .getByRole("button", { name: "Edit my profile", exact: true })
    .click();
  await expect(nameField).toHaveValue("Ama Mensah");
  await nameField.fill("Name to discard");
  await closeEditor.click();
  await expect(confirmation).toBeVisible();
  await page
    .getByRole("button", { name: "Leave without saving", exact: true })
    .click();
  await expect(nameField).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Ama Mensah", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await savedState(page))?.profile.name)
    .toBe("Ama Mensah");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByText("Hello Ama Mensah 👋", { exact: true }),
  ).toBeVisible();
});

test("les sources et la recherche filtrent les offres avec un retour depuis l’état vide", async ({
  page,
}) => {
  await page.goto("/partage");
  await page.getByRole("button", { name: "Solar", exact: true }).click();
  await expect(
    page.getByText("2 offers available", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Quick charging in Osu", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Search for energy").fill("Labone");
  await expect(
    page.getByText("1 offer available", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "A desk, sunshine and Wi-Fi",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "A desk, sunshine and Wi-Fi",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("2 kW · laptops and phones", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByLabel("Search for energy").fill("no-offer-here");
  await expect(
    page.getByText("No offers around here.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByText("5 offers available", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Search for energy")).toHaveValue("");
});

test("une demande reste unique et peut être annulée depuis le profil", async ({
  page,
}) => {
  await page.goto("/offre/offer-osu-battery");
  await page
    .getByRole("button", { name: "Simulate a request", exact: true })
    .click();
  await expect(
    page.getByText("Simulated request saved", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simulate a request", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Simulated request saved", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View my requests", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "View the offer Quick charging in Osu",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Cancel this request", exact: true })
    .click();
  await expect(
    page.getByText("Simulated request cancelled.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Your next energy stop", { exact: true }),
  ).toBeVisible();
  await page.goto("/offre/offer-osu-battery");
  await expect(
    page.getByRole("button", { name: "Simulate a request", exact: true }),
  ).toBeVisible();
});

test("la publication valide les données et empêche de demander sa propre offre", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Share", exact: true }).click();
  // Validation must return focus to the first error even from lower in the form.
  await page
    .getByLabel("End · HH:mm", { exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Publish my local offer", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Give a title of at least 3 characters." }),
  ).toBeVisible();
  await expect(page.getByLabel("Offer title", { exact: true })).toBeFocused();
  await page
    .getByLabel("Offer title", { exact: true })
    .fill("A solar desk in Osu");
  await page
    .getByLabel("Capacity and devices accepted", { exact: true })
    .fill("2 kW · laptops and phones");
  await page.getByLabel("End · HH:mm", { exact: true }).fill("25:00");
  await page
    .getByRole("button", { name: "Publish my local offer", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Use the HH:mm format, for example 19:00.",
  );
  await expect(page.getByLabel("End · HH:mm", { exact: true })).toBeFocused();
  await page.getByLabel("End · HH:mm", { exact: true }).fill("19:00");
  await page
    .getByLabel("Suggested contribution (GHS)", { exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Publish my local offer", exact: true })
    .click();
  await expect(
    page.getByText("One more light.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View my offer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A solar desk in Osu", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause my offer", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reopen my offer", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reopen my offer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reopen my offer", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause my offer", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("YOUR LOCAL OFFER", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simulate a request", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A solar desk in Osu", exact: true }),
  ).toBeVisible();
  await page.goto("/partage");
  await expect(
    page.getByText("6 offers available", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "A solar desk in Osu", exact: true }),
  ).toBeVisible();
});

test("la carte conserve le quartier sélectionné dans les actions et traite une recherche vide", async ({
  page,
}) => {
  await page.goto("/carte");
  await page
    .getByRole("button", { name: "Search a neighbourhood", exact: true })
    .click();
  await page
    .getByLabel("Search a neighbourhood", { exact: true })
    .fill("Labone");
  await expect(
    page.getByRole("heading", { name: "Labone", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 pilot neighbourhood", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose the neighbourhood", exact: true }),
  ).toHaveText("Labone");
  await page.goto("/carte?zone=madina");
  await expect(
    page.getByRole("heading", { name: "Madina", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View the forecast for Madina", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Forecast neighbourhood", exact: true }),
  ).toHaveText("Madina");
  await page.goto("/carte");
  await page.getByRole("button", { name: "Power on", exact: true }).click();
  await page
    .getByRole("button", { name: "Search a neighbourhood", exact: true })
    .click();
  await expect(
    page.getByText("4 pilot neighbourhoods", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Search a neighbourhood", { exact: true })
    .fill("not-found");
  await expect(
    page.getByText("No neighbourhood found", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(
    page.getByText("10 pilot neighbourhoods", { exact: true }),
  ).toBeVisible();
});

test("le thème persiste et la réinitialisation demande une confirmation", async ({
  page,
}) => {
  await page.goto("/signaler");
  await page
    .getByRole("radio", { name: "The power is on", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my report", exact: true })
    .click();
  await page.goto("/offre/offer-osu-battery");
  await page
    .getByRole("button", { name: "Simulate a request", exact: true })
    .click();
  await expect(
    page.getByText("Simulated request saved", { exact: true }),
  ).toBeVisible();
  await page.goto("/profil");
  await page
    .getByRole("button", { name: "Edit my profile", exact: true })
    .click();
  await page
    .getByLabel("What should we call you?", { exact: true })
    .fill("Ama");
  await page
    .getByRole("button", { name: "Save my profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Light", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ama", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Light", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Reset the demo", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep my data", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ama", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset the demo", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, reset", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "PAN", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await home(page);
  await expect(page.getByText("Outage in Osu", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await savedState(page))?.bookings.length)
    .toBe(0);
  await expect
    .poll(async () => (await savedState(page))?.offers.length)
    .toBe(5);
});

test("des données locales invalides reviennent à une démo utilisable", async ({
  page,
}) => {
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        '{"profile":{"name":"Intrus","neighborhoodId":"unknown"},"reports":[]}',
      ),
    demoKey,
  );
  await page.reload();
  await expect(page.getByText("Hello PAN 👋", { exact: true })).toBeVisible();
  await expect(page.getByText("Outage in Osu", { exact: true })).toBeVisible();
  await page.evaluate(
    (key) => localStorage.setItem(key, "invalid JSON"),
    demoKey,
  );
  await page.reload();
  await expect(page.getByText("Hello PAN 👋", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await page
    .getByRole("radio", { name: "The power is unstable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my report", exact: true })
    .click();
  await expect(
    page.getByText(
      "Your report is saved on this device. The neighbourhood’s local status has been updated.",
    ),
  ).toBeVisible();
});

test("le stockage indisponible laisse les contributions utilisables dans la session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
  });
  await page.reload();
  await expect(page.getByText("Hello PAN 👋", { exact: true })).toBeVisible();
  await expect(page.getByText(/Local storage is unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await page
    .getByRole("radio", { name: "The power is on", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my report", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View the community", exact: true })
    .click();
  await expect(
    page.getByText("Power status reported in this neighbourhood.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("les écrans restent dans le viewport avec des erreurs et des textes longs", async ({
  page,
}) => {
  test.setTimeout(60000);
  const routes = [
    "/",
    "/carte",
    "/partage",
    "/communaute",
    "/profil",
    "/previsions",
    "/signaler",
    "/publier",
    "/offre/offer-labone-solar",
    "/offre/missing-offer",
    "/route-inconnue",
  ];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("body")).not.toBeEmpty();
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      `${route} has no document horizontal overflow`,
    ).toBe(true);
  }
  await page.goto("/profil");
  await page
    .getByRole("button", { name: "Edit my profile", exact: true })
    .click();
  await page
    .getByLabel("What should we call you?", { exact: true })
    .fill("Amadou Ndiaye LightLink Neighbourhood Demonstration Community");
  await page
    .getByRole("button", { name: "Save my profile", exact: true })
    .click();
  await home(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("un brouillon d’offre survit au retour et au rechargement", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page
    .getByLabel("Offer title", { exact: true })
    .fill("My solar workshop");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByLabel("Offer title", { exact: true })).toHaveValue(
    "My solar workshop",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("lightlink.mobile.draft.offer.v1"),
      ),
    )
    .toContain("My solar workshop");
  await page.reload();
  await expect(page.getByLabel("Offer title", { exact: true })).toHaveValue(
    "My solar workshop",
  );
  await page
    .getByRole("button", { name: "Delete the draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete this draft", exact: true })
    .click();
  await expect(page.getByLabel("Offer title", { exact: true })).toHaveValue("");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("lightlink.mobile.draft.offer.v1"),
      ),
    )
    .toBeNull();
});

test("les brouillons de signalement restent associés à leur quartier", async ({
  page,
}) => {
  await page.goto("/signaler?zone=osu");
  await page
    .getByRole("radio", { name: "The power is off", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Anything to add?", exact: true })
    .click();
  await page
    .getByLabel("Your observation", { exact: true })
    .fill("Observation in Osu only");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).some(
          (key) =>
            key.includes("draft.report") &&
            localStorage.getItem(key)?.includes("Observation in Osu only"),
        ),
      ),
    )
    .toBe(true);
  await page.goto("/signaler?zone=labone");
  await expect(
    page.getByRole("button", { name: "Choose the neighbourhood", exact: true }),
  ).toHaveText("Labone");
  await expect(
    page.getByRole("radio", { name: "The power is off", exact: true }),
  ).not.toBeChecked();
  await page.goto("/signaler?zone=osu");
  await expect(
    page.getByLabel("Your observation", { exact: true }),
  ).toHaveValue("Observation in Osu only");
});

test("la carte révèle la fiche choisie depuis le bas de la liste", async ({
  page,
}) => {
  await openTab(page, "Map");
  await page.getByRole("button", { name: /^Choose Tema Community 1,/ }).click();
  await expect(
    page.getByRole("heading", { name: "Tema Community 1", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose the neighbourhood", exact: true }),
  ).toHaveText("Tema Community 1");
});

test("les actions fixes et la navigation restent entièrement visibles", async ({
  page,
}) => {
  for (const route of ["/", "/carte", "/partage", "/communaute"]) {
    await page.goto(route);
    const label = page
      .locator("a")
      .filter({ has: page.getByText("Home", { exact: true }) })
      .last();
    await expect(label).toBeInViewport({ ratio: 1 });
  }
  await page.goto("/publier");
  await expect(
    page.getByRole("button", { name: "Publish my local offer", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.goto("/signaler");
  await expect(
    page.getByRole("button", {
      name: "Save my report",
      exact: true,
    }),
  ).toBeInViewport({ ratio: 1 });
});

test("les prévisions partagées restent lisibles et conservent le quartier vers les offres", async ({
  page,
}) => {
  // Demo mode: the rules model's output for 16 Oct 2026, when the ECG announced
  // an outage in parts of Madina (shared/forecast-snapshot.ts).
  await page.goto("/previsions?zone=madina");
  await expect(
    page.getByRole("button", { name: "Forecast neighbourhood", exact: true }),
  ).toHaveText("Madina");
  await expect(page.getByText("DEMO · FORECAST FOR 16 OCT 2026")).toBeVisible();
  await expect(page.getByText(/^09:00\s*–\s*17:00$/)).toBeVisible();
  await expect(page.getByText(/^90\s*%$/)).toBeVisible();
  await expect(
    page.getByText("45% outage risk", { exact: true }),
  ).toBeVisible();

  const chart = page.getByRole("slider", {
    name: "Outage risk from 06:00 to 23:00: highest at 45% around 10:00.",
    exact: true,
  });
  await expect(chart).toHaveAttribute("aria-valuenow", "3");
  await expect(chart).toHaveAttribute("aria-valuetext", /45 percent/);
  await chart.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(chart).toHaveAttribute("aria-valuenow", "2");
  await expect(page.getByText("0% outage risk", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByText("45% outage risk", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Forecast neighbourhood", exact: true })
    .click();
  await page.getByRole("button", { name: "Labone", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Forecast neighbourhood", exact: true }),
  ).toHaveText("Labone");
  // No announcement in Labone that day: base rate only, low confidence.
  await expect(page.getByText(/^33\s*%$/)).toBeVisible();
  await expect(page.getByText("2% outage risk", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Find a solution", exact: true })
    .click();
  await expect(page).toHaveURL(/\/partage\?zone=labone(?:&|$)/);
  await expect(
    page.getByRole("button", {
      name: "Search around a neighbourhood",
      exact: true,
    }),
  ).toHaveText("Labone");
});

test("captures des écrans principaux en clair et sombre", async ({
  page,
}, testInfo) => {
  test.setTimeout(150000);
  test.skip(
    testInfo.project.name !== "mobile",
    "One set of review captures on the Pixel 7 browser viewport",
  );
  const directory = path.resolve("artifacts");
  await mkdir(directory, { recursive: true });
  for (const theme of ["dark", "light"] as const) {
    await page.goto("/profil");
    await page
      .getByRole("button", {
        name: theme === "dark" ? "Dark" : "Light",
        exact: true,
      })
      .click();
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), displayKey))
      .toBe(theme);
    for (const [name, route, expected] of [
      ["home", "/", "Hello PAN 👋"],
      ["map", "/carte", "Neighbourhood map"],
      ["offer", "/offre/offer-labone-solar", "A desk, sunshine and Wi-Fi"],
      ["profile", "/profil", "My space"],
      ["forecast", "/previsions", "Forecast"],
      ["sharing", "/partage", "Good energy nearby."],
      ["community", "/communaute", "Community"],
      ["report", "/signaler", "Report the power"],
      ["publish", "/publier", "Share my energy"],
    ]) {
      await page.goto(route);
      await expect(
        page.getByText(expected, { exact: true }).first(),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState("networkidle");
      await expect
        .poll(() =>
          page
            .locator("img")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      await page.screenshot({
        path: path.join(directory, `${name}-${theme}.png`),
        animations: "disabled",
      });
    }
  }
});
