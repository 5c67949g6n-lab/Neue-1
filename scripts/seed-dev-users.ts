/**
 * Legt lokale Test-Konten an (NUR für die lokale Entwicklung!).
 *
 *   npm run seed:users
 *
 * Konten (Passwort für alle: siehe DEV_PASSWORD):
 *   admin@standzeit.test      – Admin
 *   mieter@standzeit.test     – Mieter
 *   vermieter@standzeit.test  – Besitzer
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

config({ path: ".env.local" });

const DEV_PASSWORD = "Standzeit-Test-2026";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY müssen in .env.local stehen");
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  throw new Error(`Abbruch: Seed-Konten nur gegen eine lokale Datenbank anlegen (URL: ${url})`);
}

const supabase = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [
  {
    email: "admin@standzeit.test",
    displayName: "Admin",
    firstName: "Ada",
    lastName: "Admin",
    isAdmin: true,
  },
  {
    email: "mieter@standzeit.test",
    displayName: "Mia",
    firstName: "Mia",
    lastName: "Mieter",
    isAdmin: false,
  },
  {
    email: "vermieter@standzeit.test",
    displayName: "Volker",
    firstName: "Volker",
    lastName: "Vermieter",
    isAdmin: false,
  },
];

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  for (const u of users) {
    let id = await findUserId(u.email);
    if (!id) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: u.displayName },
      });
      if (error) throw error;
      id = data.user.id;
      console.log(`angelegt: ${u.email}`);
    } else {
      console.log(`vorhanden: ${u.email}`);
    }

    const { error: privError } = await supabase
      .from("profile_private")
      .update({ first_name: u.firstName, last_name: u.lastName, is_admin: u.isAdmin })
      .eq("user_id", id);
    if (privError) throw privError;
  }
  console.log(`\nFertig. Passwort für alle Test-Konten: ${DEV_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
