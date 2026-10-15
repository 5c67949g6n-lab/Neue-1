"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/paths";
import { publicEnv } from "@/lib/env";
import { authText } from "@/i18n/de/auth";
import { PENDING_EMAIL_COOKIE } from "./constants";

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Werte zurückgeben, damit das Formular nach einem Fehler nicht leer ist */
  values?: Record<string, string>;
  /** Login: E-Mail noch nicht bestätigt → "erneut senden" anbieten */
  unconfirmedEmail?: string;
};

const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

const emailSchema = z
  .string({ error: authText.errors.emailInvalid })
  .trim()
  .toLowerCase()
  .pipe(z.email(authText.errors.emailInvalid));

// bcrypt verarbeitet nur 72 Byte – längere Passwörter lieber gleich ablehnen
const newPasswordSchema = z
  .string({ error: authText.errors.passwordTooShort })
  .min(8, authText.errors.passwordTooShort)
  .max(72, authText.errors.passwordTooLong);

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

// ---------------------------------------------------------------------------
// Registrierung
// ---------------------------------------------------------------------------

const signUpSchema = z.object({
  displayName: z
    .string({ error: authText.errors.displayNameTooShort })
    .trim()
    .min(2, authText.errors.displayNameTooShort)
    .max(60, authText.errors.displayNameTooLong),
  email: emailSchema,
  password: newPasswordSchema,
  terms: z.literal("on", { error: authText.errors.termsRequired }),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    terms: formData.get("terms") === "on" ? "on" : "",
  };
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${siteUrl}/konto`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: [authText.errors.passwordWeak] }, values };
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { message: authText.errors.rateLimited, values };
    }
    // Bestehende Adresse NICHT verraten (keine Kontoauflistung) – gleicher Ablauf wie bei Erfolg.
    // Supabase liefert dafür bei aktiver E-Mail-Bestätigung meist gar keinen Fehler,
    // sondern einen Nutzer ohne identities.
    if (error.code !== "user_already_exists" && error.code !== "email_exists") {
      return { message: authText.errors.generic, values };
    }
  }

  await rememberPendingEmail(parsed.data.email);
  redirect("/registrieren/bestaetigen");
}

/** Merkt sich die Adresse kurz (httpOnly), damit die Bestätigungsseite sie anzeigen kann. */
async function rememberPendingEmail(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

const resendSchema = z.object({ email: emailSchema });

/** Bestätigungsmail erneut senden – antwortet immer neutral. */
export async function resendConfirmation(_prev: FormState, formData: FormData): Promise<FormState> {
  const cookieStore = await cookies();
  const raw = formData.get("email") || cookieStore.get(PENDING_EMAIL_COOKIE)?.value;
  const parsed = resendSchema.safeParse({ email: raw });
  const values = { email: String(raw ?? "") };
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  // Fehler (z. B. bereits bestätigt, unbekannt, zu häufig) bewusst nicht anzeigen
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/konto` },
  });

  return { ok: true, message: authText.confirm.resent, values };
}

// ---------------------------------------------------------------------------
// Passwort vergessen / neu setzen
// ---------------------------------------------------------------------------

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  // Immer dieselbe Antwort – egal ob es das Konto gibt
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/passwort-neu`,
  });

  return { ok: true, message: authText.forgot.sent, values };
}

const updatePasswordSchema = z
  .object({
    password: newPasswordSchema,
    passwordRepeat: z.string({ error: authText.errors.passwordMismatch }),
  })
  .refine((data) => data.password === data.passwordRepeat, {
    error: authText.errors.passwordMismatch,
    path: ["passwordRepeat"],
  });

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { message: authText.errors.sessionMissing };
  }

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    passwordRepeat: formData.get("passwordRepeat"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: [authText.errors.passwordSame] } };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: [authText.errors.passwordWeak] } };
    }
    if (error.code === "session_not_found" || error.code === "session_expired") {
      return { message: authText.errors.sessionMissing };
    }
    return { message: authText.errors.generic };
  }

  redirect("/konto?passwort=geaendert");
}
