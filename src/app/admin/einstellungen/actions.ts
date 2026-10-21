"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { isSettingKey, parseSettingFormValue } from "@/lib/admin/schemas";
import { updateSetting } from "@/lib/admin/settings";
import { adminText } from "@/i18n/de/admin";

export type SettingFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { value?: string };
};

const t = adminText.settings;

export async function saveSetting(
  _prev: SettingFormState,
  formData: FormData,
): Promise<SettingFormState> {
  const admin = await requireAdmin();
  const key = formData.get("key");
  const raw = formData.get("value");
  const values = { value: typeof raw === "string" ? raw : "" };
  if (!isSettingKey(key)) return { message: t.unknownKey, values };

  const parsed = parseSettingFormValue(key, raw);
  if (!parsed.success) return { fieldErrors: { value: [parsed.error] }, values };

  // Echte Buchungen nur mit ausdrücklicher Bestätigung einschalten
  if (
    key === "live_bookings_enabled" &&
    parsed.value === true &&
    formData.get("confirm") !== "on"
  ) {
    return { fieldErrors: { confirm: [t.liveConfirmRequired] }, values };
  }

  let changed: boolean;
  try {
    ({ changed } = await updateSetting({ adminId: admin.id, key, value: parsed.value }));
  } catch {
    return { message: adminText.common.genericError, values };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: changed ? t.saved : t.unchanged };
}
