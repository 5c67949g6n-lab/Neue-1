import { z } from "zod";

/**
 * Typisierte Plattform-Einstellungen. Die Werte liegen in der Tabelle `platform_settings`
 * (im Admin-Panel änderbar); fehlt ein Eintrag, gilt der Standardwert hier.
 */
const int = (min: number, max: number) => z.number().int().min(min).max(max);

export const settingsSchema = z.object({
  min_renter_age: int(18, 99).default(21),
  min_license_years: int(0, 50).default(2),
  owner_commission_pct: int(0, 100).default(20),
  renter_service_fee_pct: int(0, 100).default(10),
  return_service_fee_cents: int(0, 1_000_000).default(3900),
  booking_response_hours: int(1, 168).default(24),
  default_min_rental_days: int(1, 365).default(3),
  default_deposit_cents: int(0, 10_000_000).default(50000),
  installment_threshold_days: int(1, 365).default(28),
  installment_period_days: int(7, 90).default(30),
  owner_payout_delay_hours: int(0, 720).default(24),
  deposit_short_rental_max_days: int(1, 7).default(5),
  deposit_hold_days_before_return: int(0, 5).default(2),
  key_code_reveal_minutes_before: int(0, 1440).default(30),
  service_buffer_hours: int(0, 168).default(24),
  photo_retention_days: int(1, 3650).default(90),
  verification_doc_retention_days: int(1, 3650).default(365),
  rejected_doc_retention_days: int(1, 3650).default(30),
  review_publish_after_days: int(1, 90).default(14),
  live_bookings_enabled: z.boolean().default(false),
});

export type PlatformSettings = z.infer<typeof settingsSchema>;
export type SettingKey = keyof PlatformSettings;
export const SETTING_KEYS = Object.keys(settingsSchema.shape) as SettingKey[];

/**
 * Baut aus den DB-Zeilen ein vollständiges Einstellungsobjekt.
 * Ungültige oder unbekannte Werte werden ignoriert (Standardwert greift), damit ein
 * Tippfehler im Admin-Panel nicht die ganze Plattform lahmlegt.
 */
export function parseSettings(
  rows: ReadonlyArray<{ key: string; value: unknown }>,
): PlatformSettings {
  const raw: Record<string, unknown> = {};
  for (const row of rows) {
    if (!(row.key in settingsSchema.shape)) continue;
    const field = settingsSchema.shape[row.key as SettingKey];
    const parsed = field.safeParse(row.value);
    if (parsed.success) raw[row.key] = parsed.data;
  }
  return settingsSchema.parse(raw);
}

/** Validiert einen einzelnen Wert (z. B. aus dem Admin-Formular). */
export function parseSettingValue<K extends SettingKey>(key: K, value: unknown) {
  return settingsSchema.shape[key].safeParse(value);
}
