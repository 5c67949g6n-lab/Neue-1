import { expect, test, type Page } from "@playwright/test";
import { adminClient, createTestUser, deleteTestUser, loginViaUi } from "./helpers/supabase-admin";

const PATH = "/konto/verifizierung";
const BUCKET = "secure-documents";

type DocumentSpec = { kind: string; label: string; color: string; type: string };

const DOCUMENTS: readonly DocumentSpec[] = [
  { kind: "id_front", label: "Ausweis – Vorderseite", color: "#1d4ed8", type: "image/jpeg" },
  { kind: "id_back", label: "Ausweis – Rückseite", color: "#0f766e", type: "image/png" },
  {
    kind: "license_front",
    label: "Führerschein – Vorderseite",
    color: "#b45309",
    type: "image/jpeg",
  },
  { kind: "license_back", label: "Führerschein – Rückseite", color: "#7c3aed", type: "image/jpeg" },
];

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

/** Datum vor `years` Jahren (plus Puffer, damit kein Jahrestag auf heute fällt). */
function isoYearsAgo(years: number, extraDays = 10): string {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() - extraDays),
  );
  return date.toISOString().slice(0, 10);
}

/** Erzeugt im Browser ein kleines, gültiges Testbild (JPEG oder PNG). */
async function makeImage(page: Page, color: string, type: string): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ({ fill, mime }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 400;
      const context = canvas.getContext("2d")!;
      context.fillStyle = fill;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.font = "32px sans-serif";
      context.fillText("Testdokument", 40, 200);
      return canvas.toDataURL(mime, 0.9);
    },
    { fill: color, mime: type },
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function uploadDocument(page: Page, doc: DocumentSpec) {
  const buffer = await makeImage(page, doc.color, doc.type);
  const extension = doc.type === "image/png" ? "png" : "jpg";
  await page
    .getByLabel(`${doc.label}: Datei wählen`)
    .setInputFiles({ name: `${doc.kind}.${extension}`, mimeType: doc.type, buffer });
  await expect(
    page.getByTestId(`document-${doc.kind}`).getByText("Hochgeladen", { exact: true }),
  ).toBeVisible();
}

async function uploadAllDocuments(page: Page) {
  for (const doc of DOCUMENTS) await uploadDocument(page, doc);
  await expect(page.getByTestId("upload-progress")).toHaveText("4 von 4 Fotos hochgeladen");
}

async function fillForm(page: Page, dateOfBirth: string, licenseIssuedOn: string) {
  await page.getByLabel("Geburtsdatum").fill(dateOfBirth);
  await page.getByLabel("Führerschein ausgestellt am").fill(licenseIssuedOn);
  await expect(page.getByRole("checkbox", { name: "B", exact: true })).toBeChecked();
  await page.getByRole("checkbox", { name: /Ich willige ein/ }).check();
  await page.getByRole("button", { name: "Zur Prüfung einreichen" }).click();
}

async function latestVerification(userId: string) {
  const { data, error } = await adminClient()
    .from("verifications")
    .select("id, status, date_of_birth_enc, license_issued_on_enc, license_classes, submitted_at")
    .eq("user_id", userId)
    .eq("kind", "renter")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

async function documentsOf(verificationId: string) {
  const { data, error } = await adminClient()
    .from("secure_documents")
    .select("kind, storage_path, mime_type, size_bytes, sha256")
    .eq("verification_id", verificationId);
  if (error) throw error;
  return data;
}

async function objectExists(path: string) {
  const { data } = await adminClient().storage.from(BUCKET).download(path);
  return data !== null;
}

/** Nutzer löschen – vorher alle verschlüsselten Objekte im Nutzerordner entfernen. */
async function deleteUserWithDocuments(userId: string) {
  const storage = adminClient().storage.from(BUCKET);
  const paths: string[] = [];
  const { data: folders } = await storage.list(userId);
  for (const folder of folders ?? []) {
    const { data: files } = await storage.list(`${userId}/${folder.name}`);
    for (const file of files ?? []) paths.push(`${userId}/${folder.name}/${file.name}`);
  }
  if (paths.length > 0) await storage.remove(paths);
  await deleteTestUser(userId);
}

test.describe("Mieter-Verifizierung", () => {
  test("ohne Login geht es zur Anmeldung", async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/login\?next=%2Fkonto%2Fverifizierung/);
  });

  test.describe("berechtigter Nutzer", () => {
    let user: TestUser;
    test.beforeAll(async () => {
      user = await createTestUser({ displayName: "Verifizierung OK" });
    });
    test.afterAll(async () => {
      if (user) await deleteUserWithDocuments(user.id);
    });

    test("lädt vier Fotos verschlüsselt hoch und reicht zur Prüfung ein", async ({ page }) => {
      await loginViaUi(page, user.email, user.password, PATH);
      await expect(page).toHaveURL(new RegExp(`${PATH}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Als Mieter verifizieren");
      await expect(page.getByTestId("requirements")).toContainText("mindestens 21 Jahre");

      await uploadAllDocuments(page);
      await fillForm(page, isoYearsAgo(30), isoYearsAgo(10));

      const pending = page.getByTestId("verification-pending");
      await expect(pending).toBeVisible();
      await expect(pending.getByText("In Prüfung")).toBeVisible();

      const verification = await latestVerification(user.id);
      expect(verification.status).toBe("pending");
      expect(verification.submitted_at).not.toBeNull();
      expect(verification.date_of_birth_enc).toMatch(/^sze1\./);
      expect(verification.license_issued_on_enc).toMatch(/^sze1\./);
      expect(verification.date_of_birth_enc).not.toContain(isoYearsAgo(30));
      expect(verification.license_classes).toEqual(["B"]);

      const docs = await documentsOf(verification.id);
      expect(docs).toHaveLength(4);
      expect(docs.map((doc) => doc.kind).sort()).toEqual(DOCUMENTS.map((doc) => doc.kind).sort());
      for (const doc of docs) {
        // Der Browser kodiert alles zu JPEG; erkannt wird der Typ serverseitig an den Bytes
        expect(doc.mime_type).toBe("image/jpeg");
        expect(doc.storage_path.startsWith(`${user.id}/${verification.id}/`)).toBe(true);
        expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);

        const { data: blob, error } = await adminClient()
          .storage.from(BUCKET)
          .download(doc.storage_path);
        expect(error).toBeNull();
        const bytes = new Uint8Array(await blob!.arrayBuffer());
        expect(bytes.length).toBeGreaterThan(doc.size_bytes);
        expect(Array.from(bytes.subarray(0, 3))).not.toEqual([0xff, 0xd8, 0xff]);
        expect(Buffer.from(bytes.subarray(0, 4)).toString("ascii")).toBe("SZE1");
      }

      // Nach dem Neuladen bleibt der Status sichtbar, Upload-Kacheln gibt es nicht mehr
      await page.reload();
      await expect(page.getByTestId("verification-pending")).toBeVisible();
      await expect(page.getByTestId("document-id_front")).toHaveCount(0);
    });
  });

  test.describe("zu junger Nutzer", () => {
    let user: TestUser;
    test.beforeAll(async () => {
      user = await createTestUser({ displayName: "Verifizierung Jung" });
    });
    test.afterAll(async () => {
      if (user) await deleteUserWithDocuments(user.id);
    });

    test("bekommt den Ablehnungsgrund und bleibt im Entwurf", async ({ page }) => {
      await loginViaUi(page, user.email, user.password, PATH);

      // Keine Bilddatei → verständlicher Fehler an der Kachel, nichts hochgeladen
      await page.getByLabel("Ausweis – Vorderseite: Datei wählen").setInputFiles({
        name: "ausweis.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("das ist kein Bild"),
      });
      await expect(
        page.getByTestId("document-id_front").getByText("Dieses Bild können wir nicht öffnen", {
          exact: false,
        }),
      ).toBeVisible();

      await uploadAllDocuments(page);

      // Erneutes Hochladen ersetzt das vorhandene Foto
      const draft = await latestVerification(user.id);
      const before = (await documentsOf(draft.id)).find((doc) => doc.kind === "id_front")!;
      await uploadDocument(page, { ...DOCUMENTS[0], color: "#be123c" });
      await expect
        .poll(async () => (await documentsOf(draft.id)).map((doc) => doc.storage_path))
        .not.toContain(before.storage_path);
      const afterReplace = await documentsOf(draft.id);
      expect(afterReplace).toHaveLength(4);
      expect(afterReplace.filter((doc) => doc.kind === "id_front")).toHaveLength(1);
      expect(await objectExists(before.storage_path)).toBe(false);

      await fillForm(page, isoYearsAgo(19), isoYearsAgo(1));

      const reasons = page.getByTestId("not-eligible");
      await expect(reasons).toBeVisible();
      await expect(reasons).toContainText("Mindestalter von 21 Jahren");
      await expect(page.getByTestId("verification-pending")).toHaveCount(0);

      const verification = await latestVerification(user.id);
      expect(verification.id).toBe(draft.id);
      expect(verification.status).toBe("draft");
      expect(verification.date_of_birth_enc).toBeNull();
      expect(verification.submitted_at).toBeNull();
    });
  });
});
