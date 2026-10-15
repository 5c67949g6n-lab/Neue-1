import "server-only";
import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer für Auth: die EINZIGE Stelle, an der Seiten und Server Actions
 * den aktuellen Nutzer ermitteln. Jede geschützte Seite und jede Action ruft
 * `requireUser()` bzw. `requireAdmin()` selbst auf – der Proxy ist nur eine Vorab-Prüfung.
 */

export type CurrentUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isAdmin: boolean;
  status: "active" | "suspended";
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (error || !claims?.sub) return null;

  const userId = claims.sub;
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("profile_private")
      .select("first_name, last_name, phone, is_admin, status")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    id: userId,
    email: typeof claims.email === "string" ? claims.email : "",
    emailConfirmed: true, // ohne bestätigte E-Mail gibt Supabase keine Session aus
    displayName: profile?.display_name ?? "",
    firstName: priv?.first_name ?? null,
    lastName: priv?.last_name ?? null,
    phone: priv?.phone ?? null,
    isAdmin: priv?.is_admin === true && priv?.status === "active",
    status: priv?.status ?? "active",
  };
});

/** Eingeloggt und nicht gesperrt – sonst Login bzw. Sperrhinweis. */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  if (user.status === "suspended") {
    redirect("/gesperrt");
  }
  return user;
}

/** Nur aktive Admins – alle anderen bekommen 403. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!user.isAdmin) {
    forbidden();
  }
  return user;
}
