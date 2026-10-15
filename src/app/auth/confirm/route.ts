import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/paths";

/**
 * Ziel der Links aus den Supabase-Mails (Bestätigung, Passwort-Reset, E-Mail-Änderung).
 * Tauscht den Token gegen eine Session und leitet intern weiter.
 */
const querySchema = z.object({
  token_hash: z.string().min(10).max(200),
  type: z.enum(["email", "recovery", "email_change", "signup"]),
  next: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    token_hash: params.get("token_hash") ?? undefined,
    type: params.get("type") ?? undefined,
    next: params.get("next") ?? undefined,
  });
  if (!parsed.success) {
    redirect("/login?fehler=link-ungueltig");
  }

  const { token_hash, type, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    redirect("/login?fehler=link-ungueltig");
  }

  redirect(safeNextPath(next, type === "recovery" ? "/passwort-neu" : "/konto"));
}
