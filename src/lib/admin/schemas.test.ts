import { describe, expect, it } from "vitest";
import {
  daysFromNow,
  formatIsoDateDe,
  formatSettingValue,
  isSettingKey,
  isUuid,
  parsePage,
  parseSearchQuery,
  parseSettingFormValue,
  parseStatusFilter,
  reasonSchema,
  sanitizeLikeTerm,
  settingBounds,
  settingKind,
} from "./schemas";

describe("isUuid", () => {
  it("akzeptiert UUIDs und lehnt alles andere ab", () => {
    expect(isUuid("3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e")).toBe(true);
    expect(isUuid("3f2b8c1e-4d5a-4b6c-8d7e")).toBe(false);
    expect(isUuid("../../etc/passwd")).toBe(false);
    expect(isUuid("' or 1=1 --")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("parseStatusFilter", () => {
  it("nimmt bekannte Status und 'all', sonst pending", () => {
    expect(parseStatusFilter("approved")).toBe("approved");
    expect(parseStatusFilter("all")).toBe("all");
    expect(parseStatusFilter("irgendwas")).toBe("pending");
    expect(parseStatusFilter(undefined)).toBe("pending");
    expect(parseStatusFilter(["approved"])).toBe("pending");
  });
});

describe("reasonSchema", () => {
  const schema = reasonSchema({ required: "Pflicht", tooLong: "Zu lang" });

  it("trimmt und verlangt 5 bis 500 Zeichen", () => {
    expect(schema.parse("  Dokument unleserlich  ")).toBe("Dokument unleserlich");
    expect(schema.safeParse("kurz").error?.issues[0].message).toBe("Pflicht");
    expect(schema.safeParse("    ").error?.issues[0].message).toBe("Pflicht");
    expect(schema.safeParse(null).error?.issues[0].message).toBe("Pflicht");
    expect(schema.safeParse("x".repeat(501)).error?.issues[0].message).toBe("Zu lang");
  });
});

describe("Query-Parameter", () => {
  it("parsePage liefert eine gültige Seitenzahl", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("parseSearchQuery trimmt und begrenzt", () => {
    expect(parseSearchQuery("  anna ")).toBe("anna");
    expect(parseSearchQuery("x".repeat(200))).toHaveLength(100);
    expect(parseSearchQuery(["a", "b"])).toBe("");
  });

  it("sanitizeLikeTerm entfernt Platzhalter und Filter-Syntax", () => {
    expect(sanitizeLikeTerm("100%_*")).toBe("100");
    expect(sanitizeLikeTerm("a,b.or(id.eq.1)")).toBe("a b or id eq 1");
    expect(sanitizeLikeTerm("  Anna   Müller ")).toBe("Anna Müller");
  });
});

describe("Einstellungen", () => {
  it("kennt Schlüssel und Typen", () => {
    expect(isSettingKey("min_renter_age")).toBe(true);
    expect(isSettingKey("gibt_es_nicht")).toBe(false);
    expect(isSettingKey("__proto__")).toBe(false);
    expect(settingKind("min_renter_age")).toBe("number");
    expect(settingKind("live_bookings_enabled")).toBe("boolean");
    expect(settingBounds("min_renter_age")).toEqual({ min: 18, max: 99 });
    expect(settingBounds("live_bookings_enabled")).toBeNull();
  });

  it("parst Zahlen nur als ganze Zahl im erlaubten Bereich", () => {
    expect(parseSettingFormValue("min_renter_age", " 25 ")).toEqual({ success: true, value: 25 });
    for (const raw of ["17", "100", "21.5", "2e1", "0x15", "", "abc", null]) {
      const result = parseSettingFormValue("min_renter_age", raw);
      expect(result.success, String(raw)).toBe(false);
      if (!result.success) expect(result.error).toContain("zwischen 18 und 99");
    }
  });

  it("parst Ja/Nein für Boolean-Einstellungen", () => {
    expect(parseSettingFormValue("live_bookings_enabled", "true")).toEqual({
      success: true,
      value: true,
    });
    expect(parseSettingFormValue("live_bookings_enabled", "false")).toEqual({
      success: true,
      value: false,
    });
    expect(parseSettingFormValue("live_bookings_enabled", "on").success).toBe(false);
  });

  it("formatiert Werte für die Anzeige", () => {
    expect(formatSettingValue(true)).toBe("Ja");
    expect(formatSettingValue(false)).toBe("Nein");
    expect(formatSettingValue(50000)).toBe("50.000");
  });
});

describe("Datumshelfer", () => {
  it("formatIsoDateDe formatiert ohne Zeitzonen-Verschiebung", () => {
    expect(formatIsoDateDe("1990-01-01")).toBe("01.01.1990");
    expect(formatIsoDateDe("kaputt")).toBe("kaputt");
  });

  it("daysFromNow addiert Tage", () => {
    const now = new Date("2026-10-21T10:00:00.000Z");
    expect(daysFromNow(30, now)).toBe("2026-11-20T10:00:00.000Z");
  });
});
