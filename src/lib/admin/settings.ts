import "server-only";
import { writeAuditLog } from "@/lib/audit";
import { SETTING_KEYS, type SettingKey } from "@/lib/settings/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { settingBounds, settingDefault, settingKind, type SettingInputResult } from "./schemas";
import { getPeople, personName } from "./users";

/** Plattform-Einstellungen für das Admin-Panel. Aufrufer prüft vorher `requireAdmin()`. */

export type AdminSetting = {
  key: SettingKey;
  kind: "boolean" | "number";
  description: string;
  /** gespeicherter, gültiger Wert – sonst Standardwert */
  value: number | boolean;
  defaultValue: number | boolean;
  /** Wert ist in der DB gespeichert und gültig */
  stored: boolean;
  bounds: { min: number; max: number } | null;
  updatedAt: string | null;
  updatedByName: string | null;
};

function validStoredValue(key: SettingKey, raw: unknown): number | boolean | undefined {
  const kind = settingKind(key);
  if (kind === "boolean") return typeof raw === "boolean" ? raw : undefined;
  if (typeof raw !== "number" || !Number.isInteger(raw)) return undefined;
  const bounds = settingBounds(key);
  if (bounds && (raw < bounds.min || raw > bounds.max)) return undefined;
  return raw;
}

export async function listSettingsForAdmin(): Promise<AdminSetting[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("key, value, description, updated_by, updated_at");
  if (error) throw new Error("Einstellungen konnten nicht geladen werden");

  const rows = new Map((data ?? []).map((row) => [row.key, row]));
  const people = await getPeople(
    (data ?? []).flatMap((row) => (row.updated_by ? [row.updated_by] : [])),
    admin,
  );

  return SETTING_KEYS.map((key) => {
    const row = rows.get(key);
    const stored = row ? validStoredValue(key, row.value) : undefined;
    return {
      key,
      kind: settingKind(key),
      description: row?.description ?? "",
      value: stored ?? settingDefault(key),
      defaultValue: settingDefault(key),
      stored: stored !== undefined,
      bounds: settingBounds(key),
      updatedAt: row?.updated_at ?? null,
      updatedByName: row?.updated_by ? personName(people.get(row.updated_by)) : null,
    };
  });
}

export type UpdateSettingResult = { ok: true; changed: boolean };

/** Speichert einen bereits validierten Wert und protokolliert alt → neu. */
export async function updateSetting(input: {
  adminId: string;
  key: SettingKey;
  value: Extract<SettingInputResult, { success: true }>["value"];
}): Promise<UpdateSettingResult> {
  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", input.key)
    .maybeSingle();
  if (loadError) throw new Error("Einstellung konnte nicht geladen werden");

  const oldValue = existing ? existing.value : null;
  if (existing && oldValue === input.value) return { ok: true, changed: false };

  const { error } = await admin
    .from("platform_settings")
    .upsert(
      { key: input.key, value: input.value, updated_by: input.adminId },
      { onConflict: "key" },
    );
  if (error) throw new Error("Einstellung konnte nicht gespeichert werden");

  await writeAuditLog({
    adminId: input.adminId,
    action: "setting.update",
    targetType: "setting",
    targetId: input.key,
    details: { key: input.key, old: oldValue, new: input.value },
  });
  return { ok: true, changed: true };
}
