import { z } from "zod";
import { isValidIsoDate } from "@/domain/verification/eligibility";
import { verificationText } from "@/i18n/de/verification";

/** Die vier Fotos einer Mieter-Verifizierung (Reihenfolge = Reihenfolge im Formular). */
export const RENTER_DOCUMENT_KINDS = ["id_front", "id_back", "license_front", "license_back"] as const;
export type RenterDocumentKind = (typeof RENTER_DOCUMENT_KINDS)[number];
export const renterDocumentKindSchema = z.enum(RENTER_DOCUMENT_KINDS);

/** Auswählbare Führerscheinklassen (Pkw, Anhänger, Lkw, Bus – Motorradklassen sind hier egal). */
export const LICENSE_CLASSES = [
  "B",
  "B96",
  "BE",
  "B17",
  "C1",
  "C1E",
  "C",
  "CE",
  "D1",
  "D1E",
  "D",
  "DE",
] as const;
export type LicenseClass = (typeof LICENSE_CLASSES)[number];

/**
 * Klassen, mit denen man allein ein Auto fahren darf ("B oder höher": C/D setzen B voraus).
 * B17 (begleitetes Fahren) reicht allein nicht.
 */
const CAR_LICENSE_CLASSES: ReadonlySet<string> = new Set<LicenseClass>(
  LICENSE_CLASSES.filter((c) => c !== "B17"),
);

export function hasCarLicense(classes: readonly string[]): boolean {
  return classes.some((c) => CAR_LICENSE_CLASSES.has(c));
}

/** Doppelte entfernen und in die feste Reihenfolge von LICENSE_CLASSES bringen. */
export function normalizeLicenseClasses(classes: readonly LicenseClass[]): LicenseClass[] {
  const selected = new Set(classes);
  return LICENSE_CLASSES.filter((c) => selected.has(c));
}

/** Frühestes plausibles Datum – alles davor ist ein Tippfehler. */
const EARLIEST_DATE = "1900-01-01";

const t = verificationText.errors;

function isoDate(message: string) {
  return z
    .string({ error: message })
    .trim()
    .refine(isValidIsoDate, { error: message, abort: true })
    .refine((value) => value >= EARLIEST_DATE, { error: t.dateTooEarly });
}

/** Angaben, die der Server-Service prüft und verschlüsselt speichert. */
export const verificationDataSchema = z.object({
  dateOfBirth: isoDate(t.dateOfBirthInvalid),
  licenseIssuedOn: isoDate(t.licenseIssuedOnInvalid),
  licenseClasses: z
    .array(z.enum(LICENSE_CLASSES, { error: t.licenseClassesInvalid }), {
      error: t.licenseClassesRequired,
    })
    .min(1, { error: t.licenseClassesRequired })
    .max(50, { error: t.licenseClassesInvalid })
    .transform(normalizeLicenseClasses)
    .refine(hasCarLicense, { error: t.licenseClassesNoCar }),
});
export type VerificationData = z.infer<typeof verificationDataSchema>;
export type VerificationDataInput = z.input<typeof verificationDataSchema>;

/** Formular = Angaben + Pflicht-Einwilligung. */
export const verificationFormSchema = verificationDataSchema.extend({
  consent: z.literal(true, { error: t.consentRequired }),
});

/** Liest die Formularfelder aus FormData (ohne zu validieren). */
export function readVerificationForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    dateOfBirth: text("dateOfBirth"),
    licenseIssuedOn: text("licenseIssuedOn"),
    licenseClasses: formData
      .getAll("licenseClasses")
      .filter((value): value is string => typeof value === "string"),
    consent: formData.get("consent") !== null,
  };
}
