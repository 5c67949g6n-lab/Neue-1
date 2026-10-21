import { z } from "zod";
import { settingsSchema, SETTING_KEYS, type SettingKey } from "@/lib/settings/schema";
import { adminText } from "@/i18n/de/admin";

/**
 * Reine Validierungs- und Formatierungshelfer für das Admin-Panel (ohne Server-Abhängigkeiten,
 * damit sie sich direkt testen lassen).
 */

export const uuidSchema = z.uuid();

export function isUuid(value: unknown): value is string {
  return uuidSchema.safeParse(value).success;
}

export const VERIFICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "draft",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type VerificationStatusFilter = VerificationStatus | "all";

/** Statusfilter aus dem Query-String; unbekannt/leer → "pending". */
export function parseStatusFilter(value: unknown): VerificationStatusFilter {
  if (value === "all") return "all";
  return (VERIFICATION_STATUSES as readonly unknown[]).includes(value)
    ? (value as VerificationStatus)
    : "pending";
}

/** Freitext-Grund (Ablehnung, Sperre): getrimmt, 5–500 Zeichen. */
export function reasonSchema(messages: { required: string; tooLong: string }) {
  return z
    .string({ error: messages.required })
    .trim()
    .min(5, { error: messages.required })
    .max(500, { error: messages.tooLong });
}

/** Suchbegriff aus dem Query-String: getrimmt, höchstens 100 Zeichen, sonst leer. */
export function parseSearchQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 100);
}

/** Seitenzahl aus dem Query-String (ab 1). */
export function parsePage(value: unknown): number {
  const page = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(page) && page >= 1 && page <= 10_000 ? page : 1;
}

/**
 * Entfernt Zeichen, die in PostgREST-Filtern bzw. LIKE-Mustern eine Sonderbedeutung haben,
 * damit Nutzereingaben nie als Muster oder Filter-Syntax interpretiert werden.
 */
export function sanitizeLikeTerm(value: string): string {
  return value
    .replace(/[%_*\\(),."':]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

const DEFAULTS = settingsSchema.parse({});

export function isSettingKey(value: unknown): value is SettingKey {
  return typeof value === "string" && (SETTING_KEYS as readonly string[]).includes(value);
}

export function settingKind(key: SettingKey): "boolean" | "number" {
  return typeof DEFAULTS[key] === "boolean" ? "boolean" : "number";
}

export function settingDefault(key: SettingKey): number | boolean {
  return DEFAULTS[key];
}

/** Erlaubter Zahlenbereich laut settingsSchema (nur für Zahlen-Einstellungen). */
export function settingBounds(key: SettingKey): { min: number; max: number } | null {
  const inner = settingsSchema.shape[key].unwrap();
  if (!(inner instanceof z.ZodNumber)) return null;
  return {
    min: inner.minValue ?? Number.MIN_SAFE_INTEGER,
    max: inner.maxValue ?? Number.MAX_SAFE_INTEGER,
  };
}

export type SettingInputResult =
  { success: true; value: number | boolean } | { success: false; error: string };

/**
 * Wandelt die Formulareingabe in den typisierten Wert um und prüft ihn mit dem settingsSchema.
 * Zahlen nur als Ganzzahl-Literal ("21", nicht "21.0", "2e1" oder "0x15").
 */
export function parseSettingFormValue(key: SettingKey, raw: unknown): SettingInputResult {
  const t = adminText.settings;
  if (settingKind(key) === "boolean") {
    if (raw !== "true" && raw !== "false") return { success: false, error: t.invalidBoolean };
    return { success: true, value: raw === "true" };
  }

  const bounds = settingBounds(key) ?? { min: 0, max: Number.MAX_SAFE_INTEGER };
  const invalid = {
    success: false as const,
    error: t.invalidNumber(formatSettingValue(bounds.min), formatSettingValue(bounds.max)),
  };
  if (typeof raw !== "string") return invalid;
  const trimmed = raw.trim();
  if (!/^-?\d{1,12}$/.test(trimmed)) return invalid;

  const parsed = settingsSchema.shape[key].safeParse(Number(trimmed));
  if (!parsed.success) return invalid;
  return { success: true, value: parsed.data };
}

/** Wert für die Anzeige ("Ja"/"Nein" bzw. Zahl mit deutschem Tausenderpunkt). */
export function formatSettingValue(value: number | boolean): string {
  if (typeof value === "boolean") return value ? adminText.settings.yes : adminText.settings.no;
  return new Intl.NumberFormat("de-DE").format(value);
}

/** Reines Kalenderdatum "YYYY-MM-DD" → "TT.MM.JJJJ" (ohne Zeitzonen-Umrechnung). */
export function formatIsoDateDe(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

/** Zeitpunkt in `days` Tagen ab `now` als ISO-String. */
export function daysFromNow(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
