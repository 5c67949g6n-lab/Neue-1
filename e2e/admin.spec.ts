import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { encryptField, encryptFile, parseKeyring, sha256Hex } from "../src/lib/crypto/envelope";
import { adminClient, createTestUser, deleteTestUser, loginViaUi } from "./helpers/supabase-admin";

const BUCKET = "secure-documents";
const DOCUMENT_KINDS = ["id_front", "id_back", "license_front", "license_back"] as const;
const COLORS = ["#1d4ed8", "#0f766e", "#b45309", "#7c3aed"];
const DAY_MS = 24 * 60 * 60 * 1000;

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
type SeededVerification = { id: string; documentIds: string[] };

function keyring() {
  const spec = process.env.DOCUMENT_ENCRYPTION_KEYS;
  if (!spec) throw new Error("DOCUMENT_ENCRYPTION_KEYS fehlt in .env.local");
  return parseKeyring(spec);
}

/** Erzeugt im Browser kleine, echte JPEG-Testbilder. */
async function makeJpegs(browser: Browser): Promise<Buffer[]> {
  const page = await browser.newPage();
  try {
    const dataUrls = await page.evaluate((colors) => {
      return colors.map((color) => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 200;
        const context = canvas.getContext("2d")!;
        context.fillStyle = color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.font = "24px sans-serif";
        context.fillText("Testdokument", 20, 100);
        return canvas.toDataURL("image/jpeg", 0.8);
      });
    }, COLORS);
    return dataUrls.map((url) => Buffer.from(url.split(",")[1], "base64"));
  } finally {
    await page.close();
  }
}

async function setNames(userId: string, firstName: string, lastName: string) {
  const { error } = await adminClient()
    .from("profile_private")
    .update({ first_name: firstName, last_name: lastName })
    .eq("user_id", userId);
  if (error) throw error;
}

/** Legt eine eingereichte Mieter-Verifizierung mit echt verschlüsselten Daten an. */
async function seedPendingVerification(
  userId: string,
  images: Buffer[],
  data = { dateOfBirth: "1990-03-15", licenseIssuedOn: "2010-06-01" },
): Promise<SeededVerification> {
  const supabase = adminClient();
  const ring = keyring();
  const { data: verification, error } = await supabase
    .from("verifications")
    .insert({
      user_id: userId,
      kind: "renter",
      status: "pending",
      provider: "manual",
      date_of_birth_enc: encryptField(data.dateOfBirth, ring),
      license_issued_on_enc: encryptField(data.licenseIssuedOn, ring),
      license_classes: ["B", "BE"],
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;

  const documentIds: string[] = [];
  for (const [index, kind] of DOCUMENT_KINDS.entries()) {
    const plain = images[index];
    if (!plain) continue;
    const { blob, keyId } = encryptFile(plain, ring);
    const path = `${userId}/${verification.id}/${kind}-${randomUUID()}.bin`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "application/octet-stream" });
    if (uploadError) throw uploadError;
    const { data: doc, error: docError } = await supabase
      .from("secure_documents")
      .insert({
        owner_id: userId,
        kind,
        verification_id: verification.id,
        storage_path: path,
        sha256: sha256Hex(plain),
        mime_type: "image/jpeg",
        size_bytes: plain.byteLength,
        key_id: keyId,
      })
      .select("id")
      .single();
    if (docError) throw docError;
    documentIds.push(doc.id);
  }
  return { id: verification.id, documentIds };
}

async function removeStorageFolder(userId: string) {
  const storage = adminClient().storage.from(BUCKET);
  const paths: string[] = [];
  const { data: folders } = await storage.list(userId);
  for (const folder of folders ?? []) {
    const { data: files } = await storage.list(`${userId}/${folder.name}`);
    for (const file of files ?? []) paths.push(`${userId}/${folder.name}/${file.name}`);
  }
  if (paths.length > 0) await storage.remove(paths);
}

async function settingValue(key: string): Promise<unknown> {
  const { data } = await adminClient()
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value;
}

/** Kalenderdatum vor `years` Jahren (mit Puffer, damit kein Jahrestag auf heute fällt). */
function isoYearsAgo(years: number, extraDays = 10): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() - extraDays),
  )
    .toISOString()
    .slice(0, 10);
}

async function loginAs(page: Page, user: TestUser, next = "/admin") {
  await loginViaUi(page, user.email, user.password, next);
}

test.describe("Admin-Panel", () => {
  test.describe.configure({ mode: "serial" });

  let admin: TestUser;
  let normal: TestUser;
  let renterA: TestUser;
  let renterB: TestUser;
  let approveCase: SeededVerification;
  let rejectCase: SeededVerification;
  let ownCase: SeededVerification;
  let originalMinAge: unknown;
  const suffix = randomUUID().slice(0, 6);

  test.beforeAll(async ({ browser }) => {
    [admin, normal, renterA, renterB] = await Promise.all([
      createTestUser({ admin: true, displayName: `E2E Admin ${suffix}` }),
      createTestUser({ displayName: `E2E Normal ${suffix}` }),
      createTestUser({ displayName: `E2E Mieterin ${suffix}` }),
      createTestUser({ displayName: `E2E Mieter ${suffix}` }),
    ]);
    await Promise.all([
      setNames(admin.id, "Ada", `Admin-${suffix}`),
      setNames(renterA.id, "Erika", `Muster-${suffix}`),
      setNames(renterB.id, "Max", `Probe-${suffix}`),
    ]);
    const images = await makeJpegs(browser);
    approveCase = await seedPendingVerification(renterA.id, images);
    rejectCase = await seedPendingVerification(renterB.id, images);
    ownCase = await seedPendingVerification(admin.id, []);
    originalMinAge = await settingValue("min_renter_age");
  });

  test.afterAll(async () => {
    const supabase = adminClient();
    // Sicherheitsnetz, falls der Einstellungs-Test abgebrochen ist
    if (originalMinAge !== undefined && (await settingValue("min_renter_age")) !== originalMinAge) {
      await supabase
        .from("platform_settings")
        .update({ value: originalMinAge as number })
        .eq("key", "min_renter_age");
    }
    const users = [admin, normal, renterA, renterB].filter(Boolean);
    for (const user of users) await removeStorageFolder(user.id);
    if (admin) await supabase.from("admin_audit_log").delete().eq("admin_id", admin.id);
    for (const user of users) await deleteTestUser(user.id);
  });

  test("normaler Nutzer bekommt auf /admin die 403-Seite", async ({ page }) => {
    await loginAs(page, normal, "/konto");
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(403);
    await expect(page.getByRole("heading", { level: 1, name: "Kein Zugriff" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin-Navigation" })).toHaveCount(0);
  });

  test("Admin sieht die Übersicht mit Kennzahlen und offenen Verifizierungen", async ({ page }) => {
    await loginAs(page, admin);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Übersicht" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Admin-Navigation" });
    for (const label of ["Übersicht", "Verifizierungen", "Nutzer", "Einstellungen", "Audit-Log"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(page.getByTestId("admin-stat")).toHaveCount(5);
    await expect(page.getByTestId("admin-stat").first()).toContainText("Offene Verifizierungen");
  });

  test("Einstellung ändern wird gespeichert und protokolliert", async ({ page }) => {
    expect(typeof originalMinAge).toBe("number");
    const original = originalMinAge as number;
    const changed = original >= 99 ? original - 1 : original + 1;

    await loginAs(page, admin, "/admin/einstellungen");
    const card = page.getByTestId("setting-min_renter_age");
    const input = card.getByRole("spinbutton");

    // ungültiger Wert wird abgelehnt
    await input.fill("17");
    await card.getByRole("button", { name: "Speichern" }).click();
    await expect(card.getByText("Bitte gib eine ganze Zahl zwischen 18 und 99 ein.")).toBeVisible();
    expect(await settingValue("min_renter_age")).toBe(original);

    await input.fill(String(changed));
    await card.getByRole("button", { name: "Speichern" }).click();
    await expect(card.getByText("Gespeichert.")).toBeVisible();
    await expect(card.getByTestId("setting-value")).toHaveText(String(changed));
    expect(await settingValue("min_renter_age")).toBe(changed);

    await page.goto("/admin/audit?aktion=setting.update&ziel=setting&zielId=min_renter_age");
    const entry = page.getByTestId("audit-entry").first();
    await expect(entry).toContainText("Einstellung geändert");
    await expect(entry).toContainText(`Ada Admin-${suffix}`);
    await expect(entry).toContainText("min_renter_age");
    await expect(entry).toContainText(String(changed));

    // zurücksetzen
    await page.goto("/admin/einstellungen");
    await page.getByTestId("setting-min_renter_age").getByRole("spinbutton").fill(String(original));
    await page
      .getByTestId("setting-min_renter_age")
      .getByRole("button", { name: "Speichern" })
      .click();
    await expect(
      page.getByTestId("setting-min_renter_age").getByText("Gespeichert."),
    ).toBeVisible();
    expect(await settingValue("min_renter_age")).toBe(original);
  });

  test("Live-Buchungen lassen sich nur mit ausdrücklicher Bestätigung einschalten", async ({
    page,
  }) => {
    test.skip((await settingValue("live_bookings_enabled")) === true, "bereits eingeschaltet");
    await loginAs(page, admin, "/admin/einstellungen");
    const card = page.getByTestId("setting-live_bookings_enabled");
    await expect(card.getByText("Achtung: echte Zahlungen")).toBeVisible();
    await card.getByRole("combobox").selectOption("true");
    await card.getByRole("button", { name: "Speichern" }).click();
    await expect(
      card.getByText("Bitte bestätige ausdrücklich, dass echte Buchungen starten dürfen."),
    ).toBeVisible();
    expect(await settingValue("live_bookings_enabled")).toBe(false);
  });

  test("Verifizierung prüfen und bestätigen", async ({ page }) => {
    await loginAs(page, admin, "/admin/verifizierungen");
    await expect(page.getByRole("heading", { level: 1, name: "Verifizierungen" })).toBeVisible();
    await page.getByRole("link", { name: new RegExp(`Erika Muster-${suffix}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/verifizierungen/${approveCase.id}$`));

    await expect(page.getByText(renterA.email)).toBeVisible();
    await expect(page.getByTestId("date-of-birth")).toContainText("15.03.1990");
    await expect(page.getByTestId("license-issued-on")).toContainText("01.06.2010");
    await expect(page.getByTestId("precheck")).toContainText(
      "Mindestalter und Führerschein-Dauer erfüllt.",
    );

    // Bilder: entschlüsselt ausgeliefert, mit strengen Headern
    for (const docId of approveCase.documentIds) {
      const response = await page.request.get(`/admin/dokumente/${docId}`);
      expect(response.status()).toBe(200);
      const headers = response.headers();
      expect(headers["content-type"]).toBe("image/jpeg");
      expect(headers["cache-control"]).toContain("no-store");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["content-security-policy"]).toBe("default-src 'none'");
      expect(headers["content-disposition"]).toBe("inline");
      const body = await response.body();
      expect(body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
    }
    const invalid = await page.request.get("/admin/dokumente/keine-uuid", { maxRedirects: 0 });
    expect(invalid.status()).toBe(400);
    const unknown = await page.request.get(`/admin/dokumente/${randomUUID()}`, {
      maxRedirects: 0,
    });
    expect(unknown.status()).toBe(404);

    for (const kind of DOCUMENT_KINDS) {
      const image = page.getByTestId(`document-${kind}`);
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)))
        .toBeGreaterThan(0);
    }

    await page.getByRole("button", { name: "Bestätigen" }).click();
    await expect(page).toHaveURL(/erledigt=bestaetigt/);
    await expect(page.getByText("Verifizierung bestätigt.")).toBeVisible();
    await expect(page.getByText("Bestätigt", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Bestätigen" })).toHaveCount(0);

    const supabase = adminClient();
    const { data: row } = await supabase
      .from("verifications")
      .select("status, reviewed_by, reviewed_at")
      .eq("id", approveCase.id)
      .single();
    expect(row).toMatchObject({ status: "approved", reviewed_by: admin.id });
    const retention = (await settingValue("verification_doc_retention_days")) as number;
    const { data: docs } = await supabase
      .from("secure_documents")
      .select("delete_after")
      .eq("verification_id", approveCase.id);
    expect(docs).toHaveLength(4);
    for (const doc of docs ?? []) {
      const diff = new Date(doc.delete_after!).getTime() - (Date.now() + retention * DAY_MS);
      expect(Math.abs(diff)).toBeLessThan(60 * 60 * 1000);
    }

    // Audit: Ansicht, Dokumentabrufe und Entscheidung
    const { data: audit } = await supabase
      .from("admin_audit_log")
      .select("action")
      .eq("admin_id", admin.id);
    const actions = (audit ?? []).map((entry) => entry.action);
    expect(actions).toContain("verification.view");
    expect(actions).toContain("verification.approve");
    expect(actions.filter((action) => action === "document.view").length).toBeGreaterThanOrEqual(4);
  });

  test("Verifizierung mit Grund ablehnen", async ({ page }) => {
    await loginAs(page, admin, `/admin/verifizierungen/${rejectCase.id}`);
    await expect(page.getByTestId("date-of-birth")).toContainText("15.03.1990");

    // ohne Grund geht es nicht
    await page.getByRole("button", { name: "Ablehnen" }).click();
    await expect(page.getByText("Bitte gib einen Grund an (mindestens 5 Zeichen).")).toBeVisible();

    await page.getByRole("button", { name: "Dokument unleserlich" }).click();
    await expect(page.getByLabel("Grund der Ablehnung")).toHaveValue("Dokument unleserlich");
    await page.getByRole("button", { name: "Ablehnen" }).click();
    await expect(page).toHaveURL(/erledigt=abgelehnt/);
    await expect(page.getByText("Verifizierung abgelehnt.")).toBeVisible();
    await expect(page.getByText("Dokument unleserlich")).toBeVisible();

    const supabase = adminClient();
    const { data: row } = await supabase
      .from("verifications")
      .select("status, rejection_reason, reviewed_by")
      .eq("id", rejectCase.id)
      .single();
    expect(row).toEqual({
      status: "rejected",
      rejection_reason: "Dokument unleserlich",
      reviewed_by: admin.id,
    });
    const retention = (await settingValue("rejected_doc_retention_days")) as number;
    const { data: docs } = await supabase
      .from("secure_documents")
      .select("delete_after")
      .eq("verification_id", rejectCase.id);
    for (const doc of docs ?? []) {
      const diff = new Date(doc.delete_after!).getTime() - (Date.now() + retention * DAY_MS);
      expect(Math.abs(diff)).toBeLessThan(60 * 60 * 1000);
    }

    // erneut aufrufen: keine Entscheidung mehr möglich
    await page.goto(`/admin/verifizierungen/${rejectCase.id}`);
    await expect(page.getByText("nicht (mehr) in Prüfung")).toBeVisible();
  });

  test("nicht bestandene Vorprüfung: Bestätigen nicht möglich", async ({ page }) => {
    // renterB ist inzwischen abgelehnt → neue Einreichung erlaubt
    const young = await seedPendingVerification(renterB.id, [], {
      dateOfBirth: isoYearsAgo(19),
      licenseIssuedOn: isoYearsAgo(1),
    });
    await loginAs(page, admin, `/admin/verifizierungen/${young.id}`);
    await expect(page.getByTestId("precheck")).toContainText("Vorprüfung nicht bestanden");
    await expect(page.getByTestId("precheck")).toContainText("Mindestalter");
    await expect(page.getByRole("button", { name: "Bestätigen" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ablehnen" })).toBeVisible();
  });

  test("eigene Verifizierung kann ein Admin nicht selbst prüfen", async ({ page }) => {
    await loginAs(page, admin, `/admin/verifizierungen/${ownCase.id}`);
    await expect(page.getByText("Das ist deine eigene Verifizierung.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bestätigen" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ablehnen" })).toHaveCount(0);
  });

  test("Dokument-URL: normaler Nutzer 403, ausgeloggt kein Zugriff", async ({ page, request }) => {
    const url = `/admin/dokumente/${approveCase.documentIds[0]}`;

    // ausgeloggt: der Route Handler antwortet selbst mit 401 (keine Login-Umleitung)
    const anonymous = await request.get(url, { maxRedirects: 0 });
    expect(anonymous.status()).toBe(401);
    expect(anonymous.headers()["content-type"] ?? "").not.toContain("image");

    await loginAs(page, normal, "/konto");
    const forbidden = await page.request.get(url, { maxRedirects: 0 });
    expect(forbidden.status()).toBe(403);
    expect(forbidden.headers()["content-type"]).not.toContain("image");
  });

  test("Nutzer sperren und entsperren – aber nie sich selbst", async ({ page }) => {
    await loginAs(page, admin, `/admin/nutzer?q=${encodeURIComponent(admin.email)}`);
    const ownRow = page.locator(`[data-testid="user-row"][data-email="${admin.email}"]`);
    await expect(ownRow).toBeVisible();
    await expect(ownRow.getByText("Das bist du")).toBeVisible();
    await expect(ownRow.getByRole("button")).toHaveCount(0);

    await page.goto(`/admin/nutzer?q=${encodeURIComponent(normal.email)}`);
    const row = page.locator(`[data-testid="user-row"][data-email="${normal.email}"]`);
    await expect(row).toBeVisible();
    await expect(row.getByText("Aktiv", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Sperren" }).click();
    await expect(row.getByText(/wirklich sperren\?/)).toBeVisible();
    await row.getByRole("button", { name: "Sperren: Bestätigen" }).click();
    await expect(row.getByText("Bitte gib einen Grund an (mindestens 5 Zeichen).")).toBeVisible();
    await row.getByLabel("Grund der Sperre").fill("E2E-Test: Verdacht auf Missbrauch");
    await row.getByRole("button", { name: "Sperren: Bestätigen" }).click();
    await expect(row.getByText("Konto gesperrt.")).toBeVisible();
    await expect(row.getByText("Gesperrt", { exact: true })).toBeVisible();

    const { data: suspended } = await adminClient()
      .from("profile_private")
      .select("status, suspended_reason")
      .eq("user_id", normal.id)
      .single();
    expect(suspended).toEqual({
      status: "suspended",
      suspended_reason: "E2E-Test: Verdacht auf Missbrauch",
    });

    await row.getByRole("button", { name: "Entsperren" }).click();
    await row.getByRole("button", { name: "Entsperren: Bestätigen" }).click();
    await expect(row.getByText("Konto entsperrt.")).toBeVisible();
    await expect(row.getByText("Aktiv", { exact: true })).toBeVisible();

    await page.goto("/admin/audit?ziel=user");
    await expect(
      page.getByTestId("audit-entry").filter({ hasText: "Konto gesperrt" }).first(),
    ).toBeVisible();
    await expect(
      page.getByTestId("audit-entry").filter({ hasText: "Konto entsperrt" }).first(),
    ).toBeVisible();
  });
});
