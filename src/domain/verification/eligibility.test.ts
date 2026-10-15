import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MIN_LICENSE_ISSUE_AGE,
  addYearsIso,
  ageInYears,
  checkRenterEligibility,
  eligibilityText,
  fullYearsBetween,
  isLeapYear,
  isValidIsoDate,
  todayInBerlin,
  type EligibilityInput,
} from "./eligibility";

const TODAY = "2026-10-15";

/** Gültige Grundeingabe: 30 Jahre alt, Führerschein seit 10 Jahren. */
function input(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    dateOfBirth: "1996-04-20",
    licenseIssuedOn: "2016-06-01",
    today: TODAY,
    minAge: 21,
    minLicenseYears: 2,
    ...overrides,
  };
}

describe("isValidIsoDate", () => {
  it.each(["2026-10-15", "2024-02-29", "2000-02-29", "0001-01-01", "9999-12-31", "2026-04-30"])(
    "%s ist gültig",
    (value) => expect(isValidIsoDate(value)).toBe(true),
  );

  it.each([
    "2023-02-30",
    "2023-02-29",
    "1900-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-01-00",
    "2026-01-32",
    "0000-01-01",
    "abc",
    "",
    "2026-1-5",
    "26-01-05",
    "2026/01/05",
    "05.01.2026",
    " 2026-01-05",
    "2026-01-05 ",
    "2026-01-05T00:00:00Z",
    "+02026-01-05",
  ])("%j ist ungültig", (value) => expect(isValidIsoDate(value)).toBe(false));

  it("Nicht-Strings sind ungültig", () => {
    for (const value of [null, undefined, 20260105, new Date()]) {
      expect(isValidIsoDate(value as unknown as string)).toBe(false);
    }
  });
});

describe("isLeapYear", () => {
  it.each([
    [2024, true],
    [2026, false],
    [2000, true],
    [1900, false],
    [2100, false],
    [2400, true],
  ])("%i → %s", (year, leap) => expect(isLeapYear(year)).toBe(leap));
});

describe("ageInYears / fullYearsBetween", () => {
  it("Geburtstag heute = neues Alter, morgen = noch das alte, gestern = schon das neue", () => {
    expect(ageInYears("2005-10-15", TODAY)).toBe(21);
    expect(ageInYears("2005-10-16", TODAY)).toBe(20);
    expect(ageInYears("2005-10-14", TODAY)).toBe(21);
  });

  it("Monatsgrenzen", () => {
    expect(ageInYears("2000-11-01", "2026-10-31")).toBe(25);
    expect(ageInYears("2000-11-01", "2026-11-01")).toBe(26);
    expect(ageInYears("2000-12-31", "2026-01-01")).toBe(25);
    expect(ageInYears("2000-01-01", "2026-12-31")).toBe(26);
  });

  it("29.02. im Nicht-Schaltjahr: neues Alter erst am 01.03.", () => {
    expect(ageInYears("2004-02-29", "2025-02-27")).toBe(20);
    expect(ageInYears("2004-02-29", "2025-02-28")).toBe(20);
    expect(ageInYears("2004-02-29", "2025-03-01")).toBe(21);
  });

  it("29.02. im Schaltjahr: neues Alter am 29.02.", () => {
    expect(ageInYears("2004-02-29", "2028-02-28")).toBe(23);
    expect(ageInYears("2004-02-29", "2028-02-29")).toBe(24);
    expect(ageInYears("2004-02-29", "2028-03-01")).toBe(24);
  });

  it("geboren am 28.02. bzw. 01.03. – keine Sonderbehandlung", () => {
    expect(ageInYears("2004-02-28", "2025-02-28")).toBe(21);
    expect(ageInYears("2004-03-01", "2025-02-28")).toBe(20);
    expect(ageInYears("2004-03-01", "2028-02-29")).toBe(23);
    expect(ageInYears("2004-03-01", "2028-03-01")).toBe(24);
  });

  it("gleicher Tag = 0 Jahre", () => {
    expect(fullYearsBetween(TODAY, TODAY)).toBe(0);
    expect(fullYearsBetween("2025-10-16", TODAY)).toBe(0);
    expect(fullYearsBetween("2025-10-15", TODAY)).toBe(1);
  });

  it("wirft bei ungültigen Daten oder umgekehrter Reihenfolge", () => {
    expect(() => fullYearsBetween("2026-10-16", TODAY)).toThrow(RangeError);
    expect(() => fullYearsBetween("abc", TODAY)).toThrow(RangeError);
    expect(() => fullYearsBetween("2000-01-01", "2023-02-30")).toThrow(RangeError);
  });
});

describe("addYearsIso", () => {
  it("rechnet Kalenderjahre, 29.02. → 01.03. im Nicht-Schaltjahr", () => {
    expect(addYearsIso("2020-05-10", 16)).toBe("2036-05-10");
    expect(addYearsIso("2024-02-29", 1)).toBe("2025-03-01");
    expect(addYearsIso("2024-02-29", 4)).toBe("2028-02-29");
    expect(addYearsIso("2024-02-29", -4)).toBe("2020-02-29");
    expect(addYearsIso("2024-02-29", 0)).toBe("2024-02-29");
  });

  it("wirft bei ungültigen Eingaben", () => {
    expect(() => addYearsIso("2024-02-30", 1)).toThrow(RangeError);
    expect(() => addYearsIso("2024-01-01", 1.5)).toThrow(RangeError);
    expect(() => addYearsIso("9999-01-01", 1)).toThrow(RangeError);
    expect(() => addYearsIso("0001-01-01", -1)).toThrow(RangeError);
  });
});

describe("checkRenterEligibility", () => {
  it("berechtigt: keine Gründe, Alter und Führerschein-Jahre stimmen", () => {
    expect(checkRenterEligibility(input())).toEqual({
      eligible: true,
      age: 30,
      licenseYears: 10,
      reasons: [],
    });
  });

  describe("Mindestalter", () => {
    it("genau am 21. Geburtstag berechtigt", () => {
      const result = checkRenterEligibility(
        input({ dateOfBirth: "2005-10-15", licenseIssuedOn: "2022-01-01" }),
      );
      expect(result).toMatchObject({ eligible: true, age: 21, reasons: [] });
    });

    it("einen Tag vor dem 21. Geburtstag nicht berechtigt", () => {
      const result = checkRenterEligibility(
        input({ dateOfBirth: "2005-10-16", licenseIssuedOn: "2022-01-01" }),
      );
      expect(result.eligible).toBe(false);
      expect(result.age).toBe(20);
      expect(result.reasons).toEqual([eligibilityText.tooYoung(21, 20)]);
      expect(result.reasons[0]).toBe(
        "Das Mindestalter von 21 Jahren ist nicht erreicht (aktuell 20 Jahre).",
      );
    });

    it("Geburtstag gestern: berechtigt", () => {
      expect(
        checkRenterEligibility(input({ dateOfBirth: "2005-10-14", licenseIssuedOn: "2022-01-01" }))
          .eligible,
      ).toBe(true);
    });

    it("29.02.: im Nicht-Schaltjahr erst am 01.03. alt genug", () => {
      const base = { dateOfBirth: "2004-02-29", licenseIssuedOn: "2021-01-01" };
      const feb28 = checkRenterEligibility(input({ ...base, today: "2025-02-28" }));
      expect(feb28).toMatchObject({ eligible: false, age: 20 });
      const mar1 = checkRenterEligibility(input({ ...base, today: "2025-03-01" }));
      expect(mar1).toMatchObject({ eligible: true, age: 21, reasons: [] });
    });

    it("29.02.: im Schaltjahr am 29.02. alt genug", () => {
      const base = {
        dateOfBirth: "2008-02-29",
        licenseIssuedOn: "2025-01-01",
        minAge: 20,
        minLicenseYears: 1,
      };
      expect(checkRenterEligibility(input({ ...base, today: "2028-02-28" }))).toMatchObject({
        eligible: false,
        age: 19,
      });
      expect(checkRenterEligibility(input({ ...base, today: "2028-02-29" }))).toMatchObject({
        eligible: true,
        age: 20,
      });
    });

    it("Mindestalter aus den Einstellungen wird verwendet", () => {
      const result = checkRenterEligibility(input({ minAge: 31 }));
      expect(result.eligible).toBe(false);
      expect(result.reasons).toEqual([eligibilityText.tooYoung(31, 30)]);
    });
  });

  describe("Führerschein-Dauer", () => {
    it("genau N Jahre: berechtigt", () => {
      const result = checkRenterEligibility(input({ licenseIssuedOn: "2024-10-15" }));
      expect(result).toMatchObject({ eligible: true, licenseYears: 2, reasons: [] });
    });

    it("einen Tag weniger als N Jahre: nicht berechtigt", () => {
      const result = checkRenterEligibility(input({ licenseIssuedOn: "2024-10-16" }));
      expect(result.eligible).toBe(false);
      expect(result.licenseYears).toBe(1);
      expect(result.reasons).toEqual([
        "Der Führerschein muss seit mindestens 2 Jahren bestehen (aktuell 1 Jahr).",
      ]);
    });

    it("Singular bei 1 Jahr Mindestdauer", () => {
      const result = checkRenterEligibility(
        input({ licenseIssuedOn: "2026-01-01", minLicenseYears: 1 }),
      );
      expect(result.reasons).toEqual([
        "Der Führerschein muss seit mindestens 1 Jahr bestehen (aktuell 0 Jahre).",
      ]);
    });

    it("Ausstellung am 29.02.: im Nicht-Schaltjahr zählt der 01.03.", () => {
      const base = { licenseIssuedOn: "2024-02-29" };
      expect(checkRenterEligibility(input({ ...base, today: "2026-02-28" }))).toMatchObject({
        eligible: false,
        licenseYears: 1,
      });
      expect(checkRenterEligibility(input({ ...base, today: "2026-03-01" }))).toMatchObject({
        eligible: true,
        licenseYears: 2,
      });
    });

    it("heute ausgestellt: 0 Jahre, mit Mindestdauer 0 berechtigt", () => {
      expect(
        checkRenterEligibility(input({ licenseIssuedOn: TODAY, minLicenseYears: 0 })),
      ).toMatchObject({ eligible: true, licenseYears: 0, reasons: [] });
    });
  });

  describe("Plausibilität: Führerschein frühestens zum 16. Geburtstag", () => {
    it("am 16. Geburtstag ausgestellt ist plausibel, einen Tag davor nicht", () => {
      expect(MIN_LICENSE_ISSUE_AGE).toBe(16);
      const ok = checkRenterEligibility(
        input({ dateOfBirth: "2000-05-10", licenseIssuedOn: "2016-05-10" }),
      );
      expect(ok.reasons).toEqual([]);
      const tooEarly = checkRenterEligibility(
        input({ dateOfBirth: "2000-05-10", licenseIssuedOn: "2016-05-09" }),
      );
      expect(tooEarly.eligible).toBe(false);
      expect(tooEarly.reasons).toEqual([eligibilityText.licenseBeforeMinIssueAge(16)]);
    });

    it("vor der Geburt ausgestellt ist unplausibel", () => {
      const result = checkRenterEligibility(
        input({ dateOfBirth: "1996-04-20", licenseIssuedOn: "1990-01-01" }),
      );
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(eligibilityText.licenseBeforeMinIssueAge(16));
    });

    it("29.02.: 16. Geburtstag im Nicht-Schaltjahr ist der 01.03.", () => {
      // 2084 + 16 = 2100, und 2100 ist kein Schaltjahr
      const base = { dateOfBirth: "2084-02-29", today: "2125-01-01" };
      expect(
        checkRenterEligibility(input({ ...base, licenseIssuedOn: "2100-02-28" })).reasons,
      ).toEqual([eligibilityText.licenseBeforeMinIssueAge(16)]);
      expect(
        checkRenterEligibility(input({ ...base, licenseIssuedOn: "2100-03-01" })).reasons,
      ).toEqual([]);
    });
  });

  describe("Zukunftsdaten und ungültige Daten", () => {
    it("Geburtsdatum morgen: nicht berechtigt, Alter 0", () => {
      const result = checkRenterEligibility(input({ dateOfBirth: "2026-10-16" }));
      expect(result.eligible).toBe(false);
      expect(result.age).toBe(0);
      expect(result.reasons).toEqual([eligibilityText.dateOfBirthInFuture]);
    });

    it("Geburtsdatum heute ist nicht in der Zukunft (aber zu jung)", () => {
      const result = checkRenterEligibility(input({ dateOfBirth: TODAY, licenseIssuedOn: TODAY }));
      expect(result.reasons).not.toContain(eligibilityText.dateOfBirthInFuture);
      expect(result.reasons).toContain(eligibilityText.tooYoung(21, 0));
    });

    it("Ausstellungsdatum morgen: nicht berechtigt, Führerschein-Jahre 0", () => {
      const result = checkRenterEligibility(input({ licenseIssuedOn: "2026-10-16" }));
      expect(result.eligible).toBe(false);
      expect(result.licenseYears).toBe(0);
      expect(result.reasons).toEqual([eligibilityText.licenseIssuedOnInFuture]);
    });

    it.each(["2023-02-30", "abc", "", "2026-13-01", "15.10.2000"])(
      "ungültiges Geburtsdatum %j",
      (dateOfBirth) => {
        const result = checkRenterEligibility(input({ dateOfBirth }));
        expect(result).toMatchObject({ eligible: false, age: 0 });
        expect(result.reasons).toEqual([eligibilityText.dateOfBirthInvalid]);
      },
    );

    it.each(["2023-02-30", "abc", "", "2026-04-31"])(
      "ungültiges Ausstellungsdatum %j",
      (licenseIssuedOn) => {
        const result = checkRenterEligibility(input({ licenseIssuedOn }));
        expect(result).toMatchObject({ eligible: false, licenseYears: 0 });
        expect(result.reasons).toEqual([eligibilityText.licenseIssuedOnInvalid]);
      },
    );

    it("mehrere Gründe werden gemeinsam gemeldet", () => {
      const result = checkRenterEligibility(
        input({ dateOfBirth: "abc", licenseIssuedOn: "2030-01-01" }),
      );
      expect(result.eligible).toBe(false);
      expect(result.reasons).toEqual([
        eligibilityText.dateOfBirthInvalid,
        eligibilityText.licenseIssuedOnInFuture,
      ]);
    });

    it("zu jung und Führerschein zu kurz", () => {
      const result = checkRenterEligibility(
        input({ dateOfBirth: "2007-01-01", licenseIssuedOn: "2025-06-01" }),
      );
      expect(result).toMatchObject({ eligible: false, age: 19, licenseYears: 1 });
      expect(result.reasons).toEqual([
        eligibilityText.tooYoung(21, 19),
        eligibilityText.licenseTooShort(2, 1),
      ]);
    });
  });

  describe("Programmierfehler werfen", () => {
    it("ungültiges today", () => {
      for (const today of ["", "2026-02-30", "heute"]) {
        expect(() => checkRenterEligibility(input({ today }))).toThrow(RangeError);
      }
    });

    it("ungültige Mindestwerte", () => {
      for (const minAge of [-1, 1.5, Number.NaN]) {
        expect(() => checkRenterEligibility(input({ minAge }))).toThrow(RangeError);
      }
      for (const minLicenseYears of [-1, 0.5, Number.POSITIVE_INFINITY]) {
        expect(() => checkRenterEligibility(input({ minLicenseYears }))).toThrow(RangeError);
      }
    });
  });

  it("alle Gründe sind deutsche Sätze", () => {
    const texts = [
      eligibilityText.dateOfBirthInvalid,
      eligibilityText.dateOfBirthInFuture,
      eligibilityText.licenseIssuedOnInvalid,
      eligibilityText.licenseIssuedOnInFuture,
      eligibilityText.licenseBeforeMinIssueAge(16),
      eligibilityText.tooYoung(21, 1),
      eligibilityText.licenseTooShort(2, 0),
    ];
    for (const text of texts) expect(text).toMatch(/^[A-ZÄÖÜ].*\.$/);
  });
});

describe("todayInBerlin", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    // Winterzeit (MEZ, UTC+1)
    ["2026-03-28T22:59:59.999Z", "2026-03-28"],
    ["2026-03-28T23:00:00.000Z", "2026-03-29"],
    ["2026-03-28T23:30:00.000Z", "2026-03-29"],
    // Zeitumstellung auf Sommerzeit am 29.03.2026 um 02:00 MEZ
    ["2026-03-29T00:59:59.999Z", "2026-03-29"],
    ["2026-03-29T01:00:00.000Z", "2026-03-29"],
    // Sommerzeit (MESZ, UTC+2)
    ["2026-07-14T21:59:59.999Z", "2026-07-14"],
    ["2026-07-14T22:00:00.000Z", "2026-07-15"],
    // UTC-Mitternacht: in Berlin ist schon der nächste Tag
    ["2026-05-31T23:59:59.000Z", "2026-06-01"],
    ["2026-06-01T00:00:00.000Z", "2026-06-01"],
    // Rückstellung am 25.10.2026
    ["2026-10-24T21:59:59.999Z", "2026-10-24"],
    ["2026-10-24T22:00:00.000Z", "2026-10-25"],
    ["2026-10-25T22:59:59.999Z", "2026-10-25"],
    ["2026-10-25T23:00:00.000Z", "2026-10-26"],
    // Jahreswechsel
    ["2026-12-31T22:59:59.999Z", "2026-12-31"],
    ["2026-12-31T23:00:00.000Z", "2027-01-01"],
    // Schalttag
    ["2028-02-28T23:00:00.000Z", "2028-02-29"],
  ])("%s → %s", (iso, expected) => {
    const result = todayInBerlin(new Date(iso));
    expect(result).toBe(expected);
    expect(isValidIsoDate(result)).toBe(true);
  });

  it("ohne Parameter wird die aktuelle Zeit verwendet", () => {
    vi.useFakeTimers({ now: new Date("2026-03-28T23:30:00.000Z") });
    expect(todayInBerlin()).toBe("2026-03-29");
  });

  it("ungültiger Zeitpunkt ist ein Programmierfehler", () => {
    expect(() => todayInBerlin(new Date(Number.NaN))).toThrow(RangeError);
  });
});
