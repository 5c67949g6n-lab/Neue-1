"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { accountText } from "@/i18n/de/account";

export type ProfileFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

/** Leere Eingaben als null speichern */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const profileSchema = z.object({
  displayName: z
    .string({ error: accountText.errors.displayNameTooShort })
    .trim()
    .min(2, accountText.errors.displayNameTooShort)
    .max(60, accountText.errors.displayNameTooLong),
  firstName: optionalText(100, accountText.errors.nameTooLong),
  lastName: optionalText(100, accountText.errors.nameTooLong),
  phone: z
    .string()
    .trim()
    .max(40, accountText.errors.phoneInvalid)
    .refine((value) => value === "" || /^\+?[0-9][0-9 ()/-]{4,}$/.test(value), {
      error: accountText.errors.phoneInvalid,
    })
    .transform((value) => (value === "" ? null : value)),
});

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser("/konto");

  const values = {
    displayName: String(formData.get("displayName") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  // Im Namen des Nutzers: RLS + Spalten-Grants erlauben genau diese Felder der eigenen Zeile
  const supabase = await createClient();
  const [profileResult, privateResult] = await Promise.all([
    supabase
      .from("profiles")
      .update({ display_name: parsed.data.displayName }, { count: "exact" })
      .eq("id", user.id),
    supabase
      .from("profile_private")
      .update(
        {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          phone: parsed.data.phone,
        },
        { count: "exact" },
      )
      .eq("user_id", user.id),
  ]);

  if (
    profileResult.error ||
    privateResult.error ||
    profileResult.count !== 1 ||
    privateResult.count !== 1
  ) {
    return { message: accountText.errors.saveFailed, values };
  }

  refresh();
  return { ok: true, message: accountText.profile.saved, values };
}
