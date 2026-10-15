"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/paths";
import { authText } from "@/i18n/de/auth";

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Werte zurückgeben, damit das Formular nach einem Fehler nicht leer ist */
  values?: Record<string, string>;
  /** Login: E-Mail noch nicht bestätigt → "erneut senden" anbieten */
  unconfirmedEmail?: string;
};

const loginSchema = z.object({
  email: z.email(authText.errors.emailInvalid).trim().toLowerCase(),
  password: z.string().min(1, authText.errors.passwordRequired),
  next: z.string().optional(),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        message: authText.errors.emailNotConfirmed,
        unconfirmedEmail: parsed.data.email,
        values,
      };
    }
    // Absichtlich unspezifisch: verrät nicht, ob es das Konto gibt
    return { message: authText.errors.invalidCredentials, values };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
