import type { Page } from "@playwright/test";

/** Öffnet auf schmalen Bildschirmen das Hauptmenü (auf Desktop ist die Leiste schon sichtbar). */
export async function openMainMenu(page: Page) {
  const toggle = page.getByLabel("Menü öffnen");
  if (await toggle.isVisible()) {
    const menu = page.getByRole("navigation", { name: "Hauptnavigation (mobil)" });
    if (!(await menu.isVisible())) await toggle.click();
  }
}
