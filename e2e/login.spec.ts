import { expect, test } from "@playwright/test";
import { createTestUser, deleteTestUser, loginViaUi } from "./helpers/supabase-admin";
import { openMainMenu } from "./helpers/navigation";

test.describe("Login", () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeAll(async () => {
    user = await createTestUser({ displayName: "Login Test" });
  });

  test.afterAll(async () => {
    await deleteTestUser(user.id);
  });

  test("geschützte Seite leitet zum Login um und zurück", async ({ page }) => {
    await page.goto("/konto");
    await expect(page).toHaveURL(/\/login\?next=%2Fkonto/);
    await loginViaUi(page, user.email, user.password, "/konto");
    await expect(page).toHaveURL(/\/konto/);
    await openMainMenu(page);
    await expect(page.getByRole("link", { name: "Mein Konto" })).toBeVisible();
  });

  test("falsches Passwort zeigt eine Fehlermeldung", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(user.email);
    await page.getByLabel("Passwort", { exact: true }).fill("falsch-falsch");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "E-Mail oder Passwort ist falsch." }),
    ).toBeVisible();
  });

  test("externe next-Ziele werden ignoriert", async ({ page }) => {
    await loginViaUi(page, user.email, user.password, "https://boese.example/");
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/konto/);
  });
});
