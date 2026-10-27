import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const route of [
  "/",
  "/map",
  "/forecast",
  "/sharing",
  "/community",
  "/settings",
]) {
  test(`accessibility: ${route} meets WCAG A/AA`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Leaflet's third-party map surface has an equivalent keyboard-operable
    // neighborhood list on /map. The app controls and dialogs remain covered.
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude(".leaflet-container")
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("accessibility: reporting dialog and energy request", async ({ page }) => {
  await page.goto("/");
  const report = page.getByRole("button", {
    name: "Report an outage",
    exact: true,
  });
  if (await report.isVisible()) await report.click();
  else
    await page
      .getByRole("button", { name: "Report my neighbourhood", exact: true })
      .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/sharing");
  await page.getByRole("button", { name: "View offer" }).first().click();
  await expect(dialog).toBeVisible();
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("accessibility: light theme and profile dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-theme",
    "light",
  );
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude(".leaflet-container")
    .analyze();
  expect(results.violations).toEqual([]);
  const profile = page.getByRole("button", { name: "My profile", exact: true });
  if (await profile.isVisible()) await profile.click();
  else {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: /Demo profile/ }).click();
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
