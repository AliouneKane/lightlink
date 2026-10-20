import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const demoKey = "lightlink.mobile.demo.v1";
const displayKey = "lightlink.mobile.display.v1";
const runtimeErrors = new WeakMap<Page, string[]>();

test("le tri reste accessible sur un petit écran et conserve les filtres", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 380 });
  await page.goto("/partage");
  const offerCards = page.getByRole("button", {
    name: /^(Un bureau, du soleil et du Wi-Fi|Recharge express à Osu|Énergie solaire pour vos projets|Un relais énergie à Adabraka|Recharge au calme à East Legon)$/,
  });
  await page
    .getByRole("button", { name: "Trier les offres", exact: true })
    .click();
  await page.getByRole("radio", { name: "Petit budget", exact: true }).click();
  await expect
    .poll(() =>
      offerCards.evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      ),
    )
    .toEqual([
      "Recharge express à Osu",
      "Recharge au calme à East Legon",
      "Un bureau, du soleil et du Wi-Fi",
      "Énergie solaire pour vos projets",
      "Un relais énergie à Adabraka",
    ]);
  await page.getByRole("button", { name: "Solaire", exact: true }).click();
  await page
    .getByRole("button", { name: "Trier les offres", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Plus de places", exact: true })
    .click();
  await expect(offerCards).toHaveCount(2);
  await expect(offerCards.first()).toHaveAttribute(
    "aria-label",
    "Énergie solaire pour vos projets",
  );
  await expect(
    page.getByRole("heading", { name: "À votre façon.", exact: true }),
  ).toHaveCount(0);
});

async function home(page: Page) {
  await page.goto("/");
  await expect(page.getByText(/Bonjour .+ 👋/)).toBeVisible();
}

async function chooseZone(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Choisir le quartier", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fermer", exact: true }),
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
  await openTab(page, "Carte");
  await expect(
    page.getByRole("heading", { name: "Carte des quartiers" }),
  ).toBeVisible();
  await expect(
    page.getByText("Aperçu schématique · centres approximatifs"),
  ).toBeVisible();
  await openTab(page, "Partage");
  await expect(
    page.getByRole("heading", { name: "Les bonnes énergies." }),
  ).toBeVisible();
  await openTab(page, "Communauté");
  await expect(
    page.getByRole("heading", { name: "Communauté", exact: true }),
  ).toBeVisible();
  await openTab(page, "Accueil");
  await expect(page.getByText("Bonjour PAN 👋")).toBeVisible();
});

test("un signalement modifie le quartier et persiste après rechargement", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Signaler", exact: true }).click();
  await page
    .getByRole("button", { name: "Enregistrer mon signalement" })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Choisissez l’état du courant que vous observez.",
  );
  await page.getByRole("radio", { name: "Le courant est disponible" }).click();
  await page
    .getByRole("button", { name: "Un détail à ajouter ?", exact: true })
    .click();
  await page
    .getByLabel("Votre observation", { exact: true })
    .fill("Le courant est revenu dans ma rue.");
  await page
    .getByRole("button", { name: "Enregistrer mon signalement" })
    .click();
  await expect(
    page.getByText(
      "Votre signalement est enregistré sur cet appareil. L’état local du quartier a été mis à jour.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voir la communauté" }).click();
  await expect(
    page.getByText("Le courant est revenu dans ma rue.", { exact: true }),
  ).toBeVisible();
  await home(page);
  await expect(
    page.getByText("Le courant est là.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("25 signalements · démo", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Le courant est là.", { exact: true }),
  ).toBeVisible();
});

test("le profil local suit le nom et le quartier enregistrés", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Ouvrir mon profil" }).click();
  await page
    .getByRole("button", { name: "Modifier mon profil", exact: true })
    .click();
  await page
    .getByLabel("Comment vous appeler ?", { exact: true })
    .fill("Amadou Ndiaye");
  await chooseZone(page, "Madina");
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(
    page.getByText("Profil enregistré sur cet appareil."),
  ).toBeVisible();
  await home(page);
  await expect(page.getByText("Bonjour Amadou Ndiaye 👋")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Changer mon quartier", exact: true }),
  ).toHaveText("Madina");
  await expect(
    page.getByText("Le courant est instable.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Bonjour Amadou Ndiaye 👋")).toBeVisible();
  await page.goto("/partage");
  await expect(
    page.getByRole("button", {
      name: "Chercher autour d’un quartier",
      exact: true,
    }),
  ).toHaveText("Madina");
});

test("le panneau profil protège le brouillon et permet de sauvegarder ou abandonner avant de quitter", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Ouvrir mon profil" }).click();
  await page
    .getByRole("button", { name: "Modifier mon profil", exact: true })
    .click();
  const nameField = page.getByLabel("Comment vous appeler ?", { exact: true });
  const closeEditor = page.getByRole("button", {
    name: "Fermer la modification du profil",
    exact: true,
  });
  const confirmation = page.getByRole("heading", {
    name: "Garder vos modifications ?",
    exact: true,
  });
  await nameField.fill("Ama Mensah");
  await closeEditor.click();
  await expect(confirmation).toBeVisible();
  await page
    .getByRole("button", { name: "Continuer à modifier", exact: true })
    .click();
  await expect(nameField).toHaveValue("Ama Mensah");
  await closeEditor.click();
  await expect(confirmation).toBeVisible();
  await page
    .getByRole("button", { name: "Enregistrer et quitter", exact: true })
    .click();
  await expect(nameField).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Ama Mensah", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await savedState(page))?.profile.name)
    .toBe("Ama Mensah");

  await page
    .getByRole("button", { name: "Modifier mon profil", exact: true })
    .click();
  await expect(nameField).toHaveValue("Ama Mensah");
  await nameField.fill("Nom à abandonner");
  await closeEditor.click();
  await expect(confirmation).toBeVisible();
  await page
    .getByRole("button", { name: "Quitter sans enregistrer", exact: true })
    .click();
  await expect(nameField).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Ama Mensah", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await savedState(page))?.profile.name)
    .toBe("Ama Mensah");
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await expect(
    page.getByText("Bonjour Ama Mensah 👋", { exact: true }),
  ).toBeVisible();
});

test("les sources et la recherche filtrent les offres avec un retour depuis l’état vide", async ({
  page,
}) => {
  await page.goto("/partage");
  await page.getByRole("button", { name: "Solaire", exact: true }).click();
  await expect(
    page.getByText("2 offres disponibles", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recharge express à Osu", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Rechercher une énergie").fill("Labone");
  await expect(
    page.getByText("1 offre disponible", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Un bureau, du soleil et du Wi-Fi",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Un bureau, du soleil et du Wi-Fi",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("2 kW · ordinateurs et téléphones", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByLabel("Rechercher une énergie").fill("aucune-offre-ici");
  await expect(
    page.getByText("Aucune offre par ici.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect(
    page.getByText("5 offres disponibles", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Rechercher une énergie")).toHaveValue("");
});

test("une demande reste unique et peut être annulée depuis le profil", async ({
  page,
}) => {
  await page.goto("/offre/offer-osu-battery");
  await page
    .getByRole("button", { name: "Simuler une demande", exact: true })
    .click();
  await expect(
    page.getByText("Demande simulée enregistrée", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simuler une demande", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Demande simulée enregistrée", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voir mes demandes", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Voir l’offre Recharge express à Osu",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Annuler cette demande", exact: true })
    .click();
  await expect(
    page.getByText("Demande simulée annulée.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Votre prochain relais énergie", { exact: true }),
  ).toBeVisible();
  await page.goto("/offre/offer-osu-battery");
  await expect(
    page.getByRole("button", { name: "Simuler une demande", exact: true }),
  ).toBeVisible();
});

test("la publication valide les données et empêche de demander sa propre offre", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Partager", exact: true }).click();
  // Validation must return focus to the first error even from lower in the form.
  await page
    .getByLabel("Fin · HH:mm", { exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Publier mon offre locale", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Donnez un titre d’au moins 3 caractères." }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Titre de l’offre", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Titre de l’offre", { exact: true })
    .fill("Un bureau solaire à Osu");
  await page
    .getByLabel("Capacité et appareils acceptés", { exact: true })
    .fill("2 kW · ordinateurs et téléphones");
  await page.getByLabel("Fin · HH:mm", { exact: true }).fill("25:00");
  await page
    .getByRole("button", { name: "Publier mon offre locale", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Utilisez le format HH:mm, par exemple 19:00.",
  );
  await expect(page.getByLabel("Fin · HH:mm", { exact: true })).toBeFocused();
  await page.getByLabel("Fin · HH:mm", { exact: true }).fill("19:00");
  await page
    .getByLabel("Contribution conseillée (GHS)", { exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Publier mon offre locale", exact: true })
    .click();
  await expect(
    page.getByText("Une lumière de plus.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voir mon offre", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Un bureau solaire à Osu", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Suspendre mon offre", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Réactiver mon offre", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Réactiver mon offre", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Réactiver mon offre", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Suspendre mon offre", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("VOTRE OFFRE LOCALE", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simuler une demande", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Un bureau solaire à Osu", exact: true }),
  ).toBeVisible();
  await page.goto("/partage");
  await expect(
    page.getByText("6 offres disponibles", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Un bureau solaire à Osu", exact: true }),
  ).toBeVisible();
});

test("la carte conserve le quartier sélectionné dans les actions et traite une recherche vide", async ({
  page,
}) => {
  await page.goto("/carte");
  await page
    .getByRole("button", { name: "Rechercher un quartier", exact: true })
    .click();
  await page
    .getByLabel("Rechercher un quartier", { exact: true })
    .fill("Labone");
  await expect(
    page.getByRole("heading", { name: "Labone", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 quartier pilote", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Signaler", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choisir le quartier", exact: true }),
  ).toHaveText("Labone");
  await page.goto("/carte?zone=madina");
  await expect(
    page.getByRole("heading", { name: "Madina", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voir les prévisions de Madina", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Quartier des prévisions", exact: true }),
  ).toHaveText("Madina");
  await page.goto("/carte");
  await page.getByRole("button", { name: "Avec courant", exact: true }).click();
  await page
    .getByRole("button", { name: "Rechercher un quartier", exact: true })
    .click();
  await expect(
    page.getByText("4 quartiers pilotes", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Rechercher un quartier", { exact: true })
    .fill("introuvable");
  await expect(
    page.getByText("Aucun quartier trouvé", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Réinitialiser les filtres", exact: true })
    .click();
  await expect(
    page.getByText("10 quartiers pilotes", { exact: true }),
  ).toBeVisible();
});

test("le thème persiste et la réinitialisation demande une confirmation", async ({
  page,
}) => {
  await page.goto("/signaler");
  await page
    .getByRole("radio", { name: "Le courant est disponible", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer mon signalement", exact: true })
    .click();
  await page.goto("/offre/offer-osu-battery");
  await page
    .getByRole("button", { name: "Simuler une demande", exact: true })
    .click();
  await expect(
    page.getByText("Demande simulée enregistrée", { exact: true }),
  ).toBeVisible();
  await page.goto("/profil");
  await page
    .getByRole("button", { name: "Modifier mon profil", exact: true })
    .click();
  await page.getByLabel("Comment vous appeler ?", { exact: true }).fill("Ama");
  await page
    .getByRole("button", { name: "Enregistrer mon profil", exact: true })
    .click();
  await page.getByRole("button", { name: "Clair", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Clair", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ama", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clair", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Réinitialiser la démo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Conserver mes données", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ama", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Réinitialiser la démo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Oui, réinitialiser", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "PAN", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sombre", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await home(page);
  await expect(page.getByText("Coupure à Osu", { exact: true })).toBeVisible();
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
  await expect(page.getByText("Bonjour PAN 👋", { exact: true })).toBeVisible();
  await expect(page.getByText("Coupure à Osu", { exact: true })).toBeVisible();
  await page.evaluate(
    (key) => localStorage.setItem(key, "invalid JSON"),
    demoKey,
  );
  await page.reload();
  await expect(page.getByText("Bonjour PAN 👋", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Signaler", exact: true }).click();
  await page
    .getByRole("radio", { name: "Le courant est instable", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer mon signalement", exact: true })
    .click();
  await expect(
    page.getByText(
      "Votre signalement est enregistré sur cet appareil. L’état local du quartier a été mis à jour.",
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
  await expect(page.getByText("Bonjour PAN 👋", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Le stockage local est indisponible/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Signaler", exact: true }).click();
  await page
    .getByRole("radio", { name: "Le courant est disponible", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer mon signalement", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voir la communauté", exact: true })
    .click();
  await expect(
    page.getByText("État du courant signalé dans ce quartier.", {
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
    .getByRole("button", { name: "Modifier mon profil", exact: true })
    .click();
  await page
    .getByLabel("Comment vous appeler ?", { exact: true })
    .fill("Amadou Ndiaye LightLink Quartier Démonstration Communauté");
  await page
    .getByRole("button", { name: "Enregistrer mon profil", exact: true })
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
  await page.getByRole("button", { name: "Partager", exact: true }).click();
  await page
    .getByLabel("Titre de l’offre", { exact: true })
    .fill("Mon atelier solaire");
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByRole("button", { name: "Partager", exact: true }).click();
  await expect(
    page.getByLabel("Titre de l’offre", { exact: true }),
  ).toHaveValue("Mon atelier solaire");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("lightlink.mobile.draft.offer.v1"),
      ),
    )
    .toContain("Mon atelier solaire");
  await page.reload();
  await expect(
    page.getByLabel("Titre de l’offre", { exact: true }),
  ).toHaveValue("Mon atelier solaire");
  await page
    .getByRole("button", { name: "Effacer le brouillon", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Effacer ce brouillon", exact: true })
    .click();
  await expect(
    page.getByLabel("Titre de l’offre", { exact: true }),
  ).toHaveValue("");
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
    .getByRole("radio", { name: "Le courant est coupé", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Un détail à ajouter ?", exact: true })
    .click();
  await page
    .getByLabel("Votre observation", { exact: true })
    .fill("Observation à Osu uniquement");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).some(
          (key) =>
            key.includes("draft.report") &&
            localStorage.getItem(key)?.includes("Observation à Osu uniquement"),
        ),
      ),
    )
    .toBe(true);
  await page.goto("/signaler?zone=labone");
  await expect(
    page.getByRole("button", { name: "Choisir le quartier", exact: true }),
  ).toHaveText("Labone");
  await expect(
    page.getByRole("radio", { name: "Le courant est coupé", exact: true }),
  ).not.toBeChecked();
  await page.goto("/signaler?zone=osu");
  await expect(
    page.getByLabel("Votre observation", { exact: true }),
  ).toHaveValue("Observation à Osu uniquement");
});

test("la carte révèle la fiche choisie depuis le bas de la liste", async ({
  page,
}) => {
  await openTab(page, "Carte");
  await page
    .getByRole("button", { name: /^Choisir Tema Community 1,/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tema Community 1", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Signaler", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choisir le quartier", exact: true }),
  ).toHaveText("Tema Community 1");
});

test("les actions fixes et la navigation restent entièrement visibles", async ({
  page,
}) => {
  for (const route of ["/", "/carte", "/partage", "/communaute"]) {
    await page.goto(route);
    const label = page
      .locator("a")
      .filter({ has: page.getByText("Accueil", { exact: true }) })
      .last();
    await expect(label).toBeInViewport({ ratio: 1 });
  }
  await page.goto("/publier");
  await expect(
    page.getByRole("button", { name: "Publier mon offre locale", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.goto("/signaler");
  await expect(
    page.getByRole("button", {
      name: "Enregistrer mon signalement",
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
    page.getByRole("button", { name: "Quartier des prévisions", exact: true }),
  ).toHaveText("Madina");
  await expect(
    page.getByText("DÉMO · PRÉVISION DU 16 OCT. 2026"),
  ).toBeVisible();
  await expect(page.getByText(/^09:00\s*–\s*17:00$/)).toBeVisible();
  await expect(page.getByText(/^90\s*%$/)).toBeVisible();
  await expect(
    page.getByText("45 % de risque de coupure", { exact: true }),
  ).toBeVisible();

  const chart = page.getByRole("slider", {
    name: "Risque de coupure de 06 h à 23 h : au plus haut 45 % vers 10 h.",
    exact: true,
  });
  await expect(chart).toHaveAttribute("aria-valuenow", "3");
  await expect(chart).toHaveAttribute("aria-valuetext", /45 pour cent/);
  await chart.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(chart).toHaveAttribute("aria-valuenow", "2");
  await expect(
    page.getByText("0 % de risque de coupure", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByText("45 % de risque de coupure", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Quartier des prévisions", exact: true })
    .click();
  await page.getByRole("button", { name: "Labone", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Quartier des prévisions", exact: true }),
  ).toHaveText("Labone");
  // No announcement in Labone that day: base rate only, low confidence.
  await expect(page.getByText(/^33\s*%$/)).toBeVisible();
  await expect(
    page.getByText("2 % de risque de coupure", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Trouver une solution", exact: true })
    .click();
  await expect(page).toHaveURL(/\/partage\?zone=labone(?:&|$)/);
  await expect(
    page.getByRole("button", {
      name: "Chercher autour d’un quartier",
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
        name: theme === "dark" ? "Sombre" : "Clair",
        exact: true,
      })
      .click();
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), displayKey))
      .toBe(theme);
    for (const [name, route, expected] of [
      ["home", "/", "Bonjour PAN 👋"],
      ["map", "/carte", "Carte des quartiers"],
      [
        "offer",
        "/offre/offer-labone-solar",
        "Un bureau, du soleil et du Wi-Fi",
      ],
      ["profile", "/profil", "Mon espace"],
      ["forecast", "/previsions", "Prévisions"],
      ["sharing", "/partage", "Les bonnes énergies."],
      ["community", "/communaute", "Communauté"],
      ["report", "/signaler", "Signaler le courant"],
      ["publish", "/publier", "Partager mon énergie"],
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
