import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  SETTING_KEYS,
  parseSettingValue,
  parseSettings,
  settingsSchema,
  type PlatformSettings,
  type SettingKey,
} from "./schema";

const DEFAULTS: PlatformSettings = {
  min_renter_age: 21,
  min_license_years: 2,
  owner_commission_pct: 20,
  renter_service_fee_pct: 10,
  return_service_fee_cents: 3900,
  booking_response_hours: 24,
  default_min_rental_days: 3,
  default_deposit_cents: 50000,
  installment_threshold_days: 28,
  installment_period_days: 30,
  owner_payout_delay_hours: 24,
  deposit_short_rental_max_days: 5,
  deposit_hold_days_before_return: 2,
  key_code_reveal_minutes_before: 30,
  service_buffer_hours: 24,
  photo_retention_days: 90,
  verification_doc_retention_days: 365,
  rejected_doc_retention_days: 30,
  review_publish_after_days: 14,
  live_bookings_enabled: false,
};

/** Innerer Validator (ohne `.default()`) eines Feldes. */
function innerSchema(key: SettingKey) {
  return settingsSchema.shape[key].unwrap();
}

/** Grenzen aller ganzzahligen Einstellungen, direkt aus dem Schema gelesen. */
const INT_BOUNDS = SETTING_KEYS.flatMap((key) => {
  const inner = innerSchema(key);
  if (!(inner instanceof z.ZodNumber)) return [];
  return [[key, inner.minValue!, inner.maxValue!] as const];
});

const BOOLEAN_KEYS = SETTING_KEYS.filter((key) => innerSchema(key) instanceof z.ZodBoolean);

describe("SETTING_KEYS", () => {
  it("listet genau die Felder des Schemas", () => {
    expect([...SETTING_KEYS].sort()).toEqual(Object.keys(DEFAULTS).sort());
  });

  it("jede Einstellung ist entweder Ganzzahl mit Grenzen oder Boolean", () => {
    expect(INT_BOUNDS.length + BOOLEAN_KEYS.length).toBe(SETTING_KEYS.length);
    for (const [key, min, max] of INT_BOUNDS) {
      expect(Number.isInteger(min), key).toBe(true);
      expect(Number.isInteger(max), key).toBe(true);
      expect(min, key).toBeLessThanOrEqual(max);
    }
  });
});

describe("parseSettings", () => {
  it("ohne Zeilen: alle Standardwerte", () => {
    expect(parseSettings([])).toEqual(DEFAULTS);
  });

  it("jeder Standardwert hält seine eigenen Grenzen ein", () => {
    // zod v4 prüft `.default()`-Werte nicht – deshalb hier explizit
    for (const key of SETTING_KEYS) {
      expect(innerSchema(key).safeParse(DEFAULTS[key]).success, key).toBe(true);
    }
  });

  it("übernimmt gültige Werte und ergänzt den Rest mit Standardwerten", () => {
    const result = parseSettings([
      { key: "min_renter_age", value: 25 },
      { key: "min_license_years", value: 0 },
      { key: "live_bookings_enabled", value: true },
      { key: "verification_doc_retention_days", value: 3650 },
    ]);
    expect(result).toEqual({
      ...DEFAULTS,
      min_renter_age: 25,
      min_license_years: 0,
      live_bookings_enabled: true,
      verification_doc_retention_days: 3650,
    });
  });

  it.each([
    ["min_renter_age", 17],
    ["min_renter_age", 100],
    ["min_renter_age", 21.5],
    ["min_renter_age", "25"],
    ["min_renter_age", null],
    ["min_renter_age", true],
    ["min_renter_age", Number.NaN],
    ["min_renter_age", Number.POSITIVE_INFINITY],
    ["min_renter_age", { value: 25 }],
    ["min_renter_age", [25]],
    ["min_license_years", -1],
    ["owner_commission_pct", 101],
    ["booking_response_hours", 0],
    ["live_bookings_enabled", "true"],
    ["live_bookings_enabled", 1],
    ["live_bookings_enabled", null],
  ] as const)("ungültiger Wert %s = %j → Standardwert", (key, value) => {
    const result = parseSettings([
      { key, value },
      { key: "photo_retention_days", value: 120 },
    ]);
    expect(result).toEqual({ ...DEFAULTS, photo_retention_days: 120 });
  });

  it("ignoriert unbekannte Schlüssel", () => {
    const result = parseSettings([
      { key: "foo", value: 1 },
      { key: "MIN_RENTER_AGE", value: 30 },
      { key: " min_renter_age", value: 30 },
      { key: "", value: 30 },
    ]);
    expect(result).toEqual(DEFAULTS);
    expect(Object.keys(result).sort()).toEqual([...SETTING_KEYS].sort());
  });

  // Bekannter Fehler in schema.ts: `key in settingsSchema.shape` trifft auch geerbte
  // Object-Schlüssel, parseSettings wirft dann („field.safeParse is not a function“).
  // Fix (Object.hasOwn statt in) ist beim Schema-Besitzer angefragt – danach `it.fails` → `it`.
  it.fails("ignoriert auch Schlüssel wie constructor oder __proto__", () => {
    for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(parseSettings([{ key, value: 1 }])).toEqual(DEFAULTS);
    }
  });

  it("doppelte Schlüssel: der letzte gültige Wert gewinnt", () => {
    expect(
      parseSettings([
        { key: "min_renter_age", value: 23 },
        { key: "min_renter_age", value: 25 },
      ]).min_renter_age,
    ).toBe(25);
    expect(
      parseSettings([
        { key: "min_renter_age", value: 25 },
        { key: "min_renter_age", value: "kaputt" },
      ]).min_renter_age,
    ).toBe(25);
  });

  it("verändert die Eingabe nicht und liefert jedes Mal ein neues Objekt", () => {
    const rows = Object.freeze([Object.freeze({ key: "min_renter_age", value: 30 })]);
    const a = parseSettings(rows);
    const b = parseSettings(rows);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    a.min_renter_age = 99;
    expect(parseSettings(rows).min_renter_age).toBe(30);
    expect(parseSettings([]).min_renter_age).toBe(21);
  });

  it("die Startwerte aus der Migration sind vollständig, gültig und gleich den Standardwerten", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20261015000200_accounts.sql"),
      "utf8",
    );
    const insert = /insert into public\.platform_settings[^;]*;/i.exec(sql);
    expect(insert, "Seed für platform_settings nicht gefunden").not.toBeNull();
    const rows = [...insert![0].matchAll(/\(\s*'([a-z_]+)'\s*,\s*'([^']*)'/g)].map((m) => ({
      key: m[1],
      value: JSON.parse(m[2]) as unknown,
    }));

    expect(rows.map((r) => r.key).sort()).toEqual([...SETTING_KEYS].sort());
    for (const row of rows) {
      expect(parseSettingValue(row.key as SettingKey, row.value).success, row.key).toBe(true);
    }
    expect(parseSettings(rows)).toEqual(DEFAULTS);
  });
});

describe("parseSettingValue", () => {
  it.each(INT_BOUNDS)("%s: Grenzen %i–%i", (key, min, max) => {
    expect(parseSettingValue(key, min)).toMatchObject({ success: true, data: min });
    expect(parseSettingValue(key, max)).toMatchObject({ success: true, data: max });
    expect(parseSettingValue(key, min - 1).success).toBe(false);
    expect(parseSettingValue(key, max + 1).success).toBe(false);
    expect(parseSettingValue(key, min + 0.5).success).toBe(false);
    expect(parseSettingValue(key, String(min)).success).toBe(false);
    expect(parseSettingValue(key, null).success).toBe(false);
    expect(parseSettingValue(key, Number.NaN).success).toBe(false);
  });

  it("konkrete Grenzen der Zulassungsregeln", () => {
    expect(parseSettingValue("min_renter_age", 18).success).toBe(true);
    expect(parseSettingValue("min_renter_age", 17).success).toBe(false);
    expect(parseSettingValue("min_renter_age", 99).success).toBe(true);
    expect(parseSettingValue("min_renter_age", 100).success).toBe(false);
    expect(parseSettingValue("min_license_years", 0).success).toBe(true);
    expect(parseSettingValue("min_license_years", 50).success).toBe(true);
    expect(parseSettingValue("min_license_years", 51).success).toBe(false);
    expect(parseSettingValue("booking_response_hours", 1).success).toBe(true);
    expect(parseSettingValue("booking_response_hours", 168).success).toBe(true);
    expect(parseSettingValue("booking_response_hours", 169).success).toBe(false);
  });

  it.each(BOOLEAN_KEYS)("%s: nur echte Booleans", (key) => {
    expect(parseSettingValue(key, true)).toMatchObject({ success: true, data: true });
    expect(parseSettingValue(key, false)).toMatchObject({ success: true, data: false });
    for (const value of ["true", "false", 0, 1, null]) {
      expect(parseSettingValue(key, value).success, String(value)).toBe(false);
    }
  });

  it("undefined liefert den Standardwert (Formulare müssen Pflichtfelder selbst prüfen)", () => {
    expect(parseSettingValue("min_renter_age", undefined)).toMatchObject({
      success: true,
      data: 21,
    });
  });

  it("Fehler lassen sich mit z.flattenError fürs Formular aufbereiten", () => {
    const result = parseSettingValue("min_renter_age", 17);
    expect(result.success).toBe(false);
    if (result.success) return;
    // Cast nötig: parseSettingValue ist nicht pro Schlüssel typisiert (Anfrage beim Schema-Besitzer)
    const flat = z.flattenError(result.error as z.ZodError);
    expect(flat.formErrors.length).toBeGreaterThan(0);
  });
});
