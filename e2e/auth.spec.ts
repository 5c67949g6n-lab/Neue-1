import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, createTestUser, deleteTestUser, loginViaUi } from "./helpers/supabase-admin";
import { deleteMailsTo, extractLink, waitForMail } from "./helpers/mailpit";
import { openMainMenu } from "./helpers/navigation";

const NEW_PASSWORD = "Neues-Passwort-2026!";

/** Alle hier angelegten Adressen – am Ende werden Nutzer und Mails gelöscht. */
const createdEmails: string[] = [];
const createdUserIds: string[] = [];

function freshEmail(prefix: string) {
  const email = `e2e-${prefix}-${randomUUID().slice(0, 8)}@standzeit.test`;
  createdEmails.push(email);
  return email;
}

async function registerViaUi(page: Page, displayName: string, email: string, password: string) {
  await page.goto("/registrieren");
  await page.getByLabel("Anzeigename").fill(displayName);
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("checkbox", { name: /AGB.*Datenschutzerklärung/ }).check();
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await page.waitForURL("**/registrieren/bestaetigen");
}

/** Abmelden über den Button im Header. */
async function signOutViaHeader(page: Page) {
  await openMainMenu(page);
  await page.getByRole("button", { name: "Abmelden" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByRole("link", { name: "Anmelden" })).toBeVisible();
}

test.afterAll(async () => {
  const admin = adminClient();
  // Per UI registrierte Nutzer über die Adresse finden
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const wanted = new Set(createdEmails);
  const ids = new Set(createdUserIds);
  for (const user of data?.users ?? []) {
    if (user.email && wanted.has(user.email)) ids.add(user.id);
  }
  await Promise.all([...ids].map((id) => deleteTestUser(id)));
  await deleteMailsTo(...createdEmails);
});

test.describe("Registrierung", () => {
  test("Registrieren → Mail bestätigen → Konto → Profil ändern → Abmelden", async ({ page }) => {
    const email = freshEmail("reg");
    const password = "Start-Passwort-2026";
    const startedAt = new Date();

    await registerViaUi(page, "Rita Registriert", email, password);
    await expect(page.getByRole("heading", { level: 1, name: "Fast geschafft!" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole("button", { name: "Mail erneut senden" })).toBeVisible();

    const mail = await waitForMail(email, { subject: /bestätige/i, after: startedAt });
    const link = extractLink(mail.html);
    expect(link.searchParams.get("type")).toBe("email");
    expect(link.searchParams.get("next")).toBe("/konto");

    await page.goto(link.toString());
    await expect(page).toHaveURL(/\/konto$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hallo Rita Registriert!" }),
    ).toBeVisible();
    await expect(page.getByTestId("account-email")).toHaveText(email);
    await expect(page.getByTestId("verification-status")).toHaveText("Noch nicht verifiziert");
    await expect(page.getByRole("link", { name: "Jetzt verifizieren" })).toHaveAttribute(
      "href",
      "/konto/verifizierung",
    );
    await expect(page.getByRole("heading", { name: "Als Besitzer" })).toBeVisible();

    // Profil ändern
    await page.getByLabel("Anzeigename").fill("Rita R.");
    await page.getByLabel(/Vorname/).fill("Rita");
    await page.getByLabel(/Nachname/).fill("Registriert");
    await page.getByLabel(/Telefonnummer/).fill("+49 711 1234567");
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Dein Profil wurde gespeichert." }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Hallo Rita R.!" })).toBeVisible();
    await expect(page.getByLabel(/Vorname/)).toHaveValue("Rita");
    await expect(page.getByLabel(/Nachname/)).toHaveValue("Registriert");
    await expect(page.getByLabel(/Telefonnummer/)).toHaveValue("+49 711 1234567");

    // Ungültige Telefonnummer wird abgelehnt
    await page.getByLabel(/Telefonnummer/).fill("bitte anrufen");
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(page.getByText("Bitte gib eine gültige Telefonnummer ein")).toBeVisible();
    await expect(page.getByLabel(/Telefonnummer/)).toHaveAttribute("aria-invalid", "true");

    await signOutViaHeader(page);
    await page.goto("/konto");
    await expect(page).toHaveURL(/\/login\?next=%2Fkonto/);

    // Bestätigter Nutzer kann sich mit seinem Passwort anmelden
    await loginViaUi(page, email, password, "/konto");
    await expect(page).toHaveURL(/\/konto$/);
  });

  test("Pflichtfelder und AGB-Checkbox werden geprüft", async ({ page }) => {
    await page.goto("/registrieren");
    await page.getByLabel("Anzeigename").fill("X");
    await page.getByLabel("E-Mail").fill("keine-adresse");
    await page.getByLabel("Passwort", { exact: true }).fill("kurz");
    await page.getByRole("button", { name: "Konto erstellen" }).click();

    await expect(page.getByText("mindestens 2 Zeichen")).toBeVisible();
    await expect(page.getByText("Bitte gib eine gültige E-Mail-Adresse ein.")).toBeVisible();
    await expect(page.getByText("mindestens 8 Zeichen lang")).toBeVisible();
    await expect(
      page.getByText("Bitte bestätige, dass du AGB und Datenschutzerklärung gelesen hast."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/registrieren$/);
    await expect(page.getByLabel("E-Mail")).toHaveAttribute("aria-invalid", "true");
    // Links auf die Rechtstexte
    await expect(page.getByRole("link", { name: "AGB" }).first()).toHaveAttribute("href", "/agb");
  });

  test("bereits registrierte Adresse verrät nichts (gleiche Erfolgsseite)", async ({ page }) => {
    const existing = await createTestUser({ displayName: "Schon Da" });
    createdUserIds.push(existing.id);
    createdEmails.push(existing.email);

    await registerViaUi(page, "Jemand Anderes", existing.email, "Irgendein-Passwort-1");
    await expect(page.getByRole("heading", { level: 1, name: "Fast geschafft!" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: /schiefgelaufen/ })).toHaveCount(0);
  });

  test("Login mit unbestätigter Adresse bietet „Mail erneut senden“ an", async ({ page }) => {
    const email = freshEmail("unconfirmed");
    const password = "Noch-Unbestaetigt-1";
    await registerViaUi(page, "Ulla Unbestätigt", email, password);

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Bitte bestätige zuerst deine E-Mail-Adresse." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Mail erneut senden" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "ist eine neue Mail unterwegs" }),
    ).toBeVisible();
  });
});

test.describe("Passwort vergessen", () => {
  test("Link per Mail → neues Passwort → Anmeldung mit neuem Passwort", async ({ page }) => {
    const user = await createTestUser({ displayName: "Paula Passwort" });
    createdUserIds.push(user.id);
    createdEmails.push(user.email);
    const startedAt = new Date();

    await page.goto("/login");
    await page.getByRole("link", { name: "Passwort vergessen?" }).click();
    await expect(page).toHaveURL(/\/passwort-vergessen$/);
    await page.getByLabel("E-Mail").fill(user.email);
    await page.getByRole("button", { name: "Link anfordern" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Falls ein Konto zu dieser Adresse existiert" }),
    ).toBeVisible();

    const mail = await waitForMail(user.email, { subject: /Passwort/i, after: startedAt });
    const link = extractLink(mail.html);
    expect(link.searchParams.get("type")).toBe("recovery");

    await page.goto(link.toString());
    await expect(page).toHaveURL(/\/passwort-neu$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Neues Passwort festlegen" }),
    ).toBeVisible();

    // Wiederholung passt nicht
    await page.getByLabel("Neues Passwort").fill(NEW_PASSWORD);
    await page.getByLabel("Passwort wiederholen").fill("etwas-anderes-123");
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByText("Die Passwörter stimmen nicht überein.")).toBeVisible();

    await page.getByLabel("Neues Passwort").fill(NEW_PASSWORD);
    await page.getByLabel("Passwort wiederholen").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page).toHaveURL(/\/konto\?passwort=geaendert$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Dein Passwort wurde geändert." }),
    ).toBeVisible();

    await signOutViaHeader(page);

    // Altes Passwort gilt nicht mehr
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(user.email);
    await page.getByLabel("Passwort", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "E-Mail oder Passwort ist falsch." }),
    ).toBeVisible();

    await loginViaUi(page, user.email, NEW_PASSWORD, "/konto");
    await expect(page).toHaveURL(/\/konto$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hallo Paula Passwort!" }),
    ).toBeVisible();
  });

  test("unbekannte Adresse bekommt dieselbe neutrale Antwort", async ({ page }) => {
    await page.goto("/passwort-vergessen");
    await page.getByLabel("E-Mail").fill(freshEmail("gibtsnicht"));
    await page.getByRole("button", { name: "Link anfordern" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Falls ein Konto zu dieser Adresse existiert" }),
    ).toBeVisible();
  });

  test("/passwort-neu ohne Sitzung zeigt Hinweis und Link", async ({ page }) => {
    await page.goto("/passwort-neu");
    await expect(page.getByRole("status").filter({ hasText: "Link abgelaufen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Neuen Link anfordern" })).toHaveAttribute(
      "href",
      "/passwort-vergessen",
    );
    await expect(page.getByLabel("Neues Passwort")).toHaveCount(0);
  });
});

test.describe("Bestätigungslinks", () => {
  test("ungültiger Link führt zum Login mit verständlichem Hinweis", async ({ page }) => {
    await page.goto(
      "/auth/confirm?token_hash=0123456789abcdef0123456789abcdef&type=email&next=/konto",
    );
    await expect(page).toHaveURL(/\/login\?fehler=link-ungueltig$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Der Link funktioniert nicht (mehr)" }),
    ).toBeVisible();
  });

  test("fehlende oder falsche Parameter werden abgelehnt", async ({ page }) => {
    await page.goto("/auth/confirm?type=magiclink&token_hash=x");
    await expect(page).toHaveURL(/\/login\?fehler=link-ungueltig$/);
    await page.goto("/auth/confirm");
    await expect(page).toHaveURL(/\/login\?fehler=link-ungueltig$/);
  });
});

test.describe("Öffentliche Seiten", () => {
  test("Rechtsseite /agb zeigt Platzhalter, Stand und Version", async ({ page }) => {
    await page.goto("/agb");
    await expect(
      page.getByRole("heading", { level: 1, name: "Allgemeine Geschäftsbedingungen" }),
    ).toBeVisible();
    await expect(page.getByText("Platzhalter.")).toBeVisible();
    await expect(page.getByTestId("legal-meta")).toContainText(/Stand: .+ · Version \d+/);
    await expect(page).toHaveTitle(/Allgemeine Geschäftsbedingungen/);
  });

  test("unbekannter Slug liefert 404", async ({ page }) => {
    const response = await page.goto("/quatsch-slug");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
  });

  test("Startseite und /vermieten verlinken die richtigen Ziele", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Dein Auto verdient Geld, während du im Urlaub bist",
    );
    await expect(page.getByRole("link", { name: "Auto vermieten" }).first()).toHaveAttribute(
      "href",
      "/vermieten",
    );
    await expect(page.getByRole("link", { name: "Auto mieten" }).first()).toHaveAttribute(
      "href",
      "/registrieren",
    );

    await page.goto("/vermieten");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Inserieren startet in Kürze")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kostenlos registrieren" }).first(),
    ).toHaveAttribute("href", "/registrieren");
  });
});
