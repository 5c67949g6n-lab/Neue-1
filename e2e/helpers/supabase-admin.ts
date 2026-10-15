import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";

config({ path: ".env.local" });

export const TEST_PASSWORD = "Standzeit-E2E-2026!";

/** Service-Client für Test-Setup (nur lokal!). */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
    throw new Error("E2E-Helfer nur gegen lokale Supabase verwenden");
  }
  return createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Legt einen frischen, bestätigten Test-Nutzer an (optional als Admin). */
export async function createTestUser(opts: { admin?: boolean; displayName?: string } = {}) {
  const supabase = adminClient();
  const email = `e2e-${randomUUID().slice(0, 8)}@standzeit.test`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: opts.displayName ?? "E2E Test" },
  });
  if (error) throw error;
  if (opts.admin) {
    const { error: updateError } = await supabase
      .from("profile_private")
      .update({ is_admin: true })
      .eq("user_id", data.user.id);
    if (updateError) throw updateError;
  }
  return { id: data.user.id, email, password: TEST_PASSWORD };
}

export async function deleteTestUser(id: string) {
  await adminClient().auth.admin.deleteUser(id);
}

/** Meldet sich über die echte Login-Seite an. */
export async function loginViaUi(page: Page, email: string, password: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
