/**
 * Prüft, ob jemand als Mieter zugelassen werden kann (Mindestalter, Führerschein-Dauer).
 *
 * Alle Datumswerte sind reine Kalenderdaten im Format "YYYY-MM-DD". Gerechnet wird
 * ausschließlich auf Jahr/Monat/Tag – nie mit `new Date("YYYY-MM-DD")`, damit keine
 * Zeitzone oder Sommerzeit das Ergebnis um einen Tag verschiebt.
 *
 * Am Jahrestag selbst gilt bereits das neue Alter (§ 187 Abs. 2 S. 2 BGB: der Geburtstag
 * wird mitgezählt). Geburtstag am 29.02.: In Nicht-Schaltjahren gilt der 01.03. als Jahrestag.
 * Das entspricht der deutschen Fristberechnung (§ 188 Abs. 2 und 3 BGB): Das Lebensjahr endet
 * mit Ablauf des 28.02., das neue Alter gilt also erst ab dem 01.03. – nicht schon am 28.02.
 * Dieselbe Regel gilt für den Jahrestag der Führerschein-Ausstellung und den 16. Geburtstag.
 */
import { eligibilityText } from "./messages";

export { eligibilityText };

export type EligibilityInput = {
  dateOfBirth: string;
  licenseIssuedOn: string;
  today: string;
  minAge: number;
  minLicenseYears: number;
};

export type EligibilityResult = {
  eligible: boolean;
  age: number;
  licenseYears: number;
  reasons: string[];
};

/** Frühestes plausibles Alter bei Ausstellung des Führerscheins. */
export const MIN_LICENSE_ISSUE_AGE = 16;

type CalendarDate = { year: number; month: number; day: number };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseIsoDate(value: unknown): CalendarDate | null {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

function requireIsoDate(value: string, name: string): CalendarDate {
  const parsed = parseIsoDate(value);
  if (!parsed) throw new RangeError(`${name} ist kein gültiges Datum (YYYY-MM-DD): ${value}`);
  return parsed;
}

function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

function formatIsoDate({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Jahrestag von `date` im Jahr `year` (29.02. → 01.03. in Nicht-Schaltjahren). */
function anniversaryIn(date: CalendarDate, year: number): CalendarDate {
  if (date.month === 2 && date.day === 29 && !isLeapYear(year)) return { year, month: 3, day: 1 };
  return { year, month: date.month, day: date.day };
}

/** Echtes Kalenderdatum im Format YYYY-MM-DD (z. B. "2023-02-30" oder "abc" → false). */
export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

/** Datum `years` Jahre nach `date` (29.02. → 01.03., wenn das Zieljahr kein Schaltjahr ist). */
export function addYearsIso(date: string, years: number): string {
  if (!Number.isInteger(years)) throw new RangeError("Jahre müssen ganzzahlig sein");
  const start = requireIsoDate(date, "Datum");
  const year = start.year + years;
  if (year < 1 || year > 9999) throw new RangeError("Ergebnis liegt außerhalb von 0001–9999");
  return formatIsoDate(anniversaryIn(start, year));
}

/**
 * Volle Jahre von `from` bis `to`. Am Jahrestag selbst zählt das Jahr bereits als voll
 * (Geburtstag = neues Alter). Wirft, wenn ein Datum ungültig ist oder `from` nach `to` liegt.
 */
export function fullYearsBetween(from: string, to: string): number {
  const start = requireIsoDate(from, "Startdatum");
  const end = requireIsoDate(to, "Enddatum");
  if (compareDates(start, end) > 0) throw new RangeError("Startdatum liegt nach dem Enddatum");
  const full = end.year - start.year;
  return compareDates(end, anniversaryIn(start, end.year)) < 0 ? full - 1 : full;
}

/** Alter in vollen Jahren am Tag `today`. */
export function ageInYears(dateOfBirth: string, today: string): number {
  return fullYearsBetween(dateOfBirth, today);
}

const berlinDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Heutiges Kalenderdatum in Deutschland ("YYYY-MM-DD"), unabhängig von der Server-Zeitzone. */
export function todayInBerlin(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) throw new RangeError("Ungültiger Zeitpunkt");
  const parts = berlinDate.formatToParts(now);
  const part = (type: "year" | "month" | "day") => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function requireNonNegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} muss eine ganze Zahl ≥ 0 sein`);
  }
}

/**
 * Prüft Mindestalter und Führerschein-Dauer. Ungültige oder in der Zukunft liegende Angaben
 * führen zu „nicht berechtigt“ mit Begründung (Alter bzw. Führerschein-Jahre dann 0).
 * Ein ungültiges `today` oder ungültige Mindestwerte sind Programmierfehler und werfen.
 */
export function checkRenterEligibility(input: EligibilityInput): EligibilityResult {
  const today = requireIsoDate(input.today, "today");
  requireNonNegativeInteger(input.minAge, "minAge");
  requireNonNegativeInteger(input.minLicenseYears, "minLicenseYears");

  const reasons: string[] = [];
  let age = 0;
  let licenseYears = 0;

  const birth = parseIsoDate(input.dateOfBirth);
  const birthUsable = birth !== null && compareDates(birth, today) <= 0;
  if (!birth) reasons.push(eligibilityText.dateOfBirthInvalid);
  else if (!birthUsable) reasons.push(eligibilityText.dateOfBirthInFuture);

  const issued = parseIsoDate(input.licenseIssuedOn);
  const issuedUsable = issued !== null && compareDates(issued, today) <= 0;
  if (!issued) reasons.push(eligibilityText.licenseIssuedOnInvalid);
  else if (!issuedUsable) reasons.push(eligibilityText.licenseIssuedOnInFuture);

  if (birthUsable) {
    age = fullYearsBetween(input.dateOfBirth, input.today);
    if (age < input.minAge) reasons.push(eligibilityText.tooYoung(input.minAge, age));
  }

  if (issuedUsable) {
    licenseYears = fullYearsBetween(input.licenseIssuedOn, input.today);
    if (birth && birthUsable) {
      const earliestIssue = anniversaryIn(birth, birth.year + MIN_LICENSE_ISSUE_AGE);
      if (compareDates(issued, earliestIssue) < 0) {
        reasons.push(eligibilityText.licenseBeforeMinIssueAge(MIN_LICENSE_ISSUE_AGE));
      }
    }
    if (licenseYears < input.minLicenseYears) {
      reasons.push(eligibilityText.licenseTooShort(input.minLicenseYears, licenseYears));
    }
  }

  return { eligible: reasons.length === 0, age, licenseYears, reasons };
}
