import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  LICENSE_CLASSES,
  RENTER_DOCUMENT_KINDS,
  hasCarLicense,
  normalizeLicenseClasses,
  readVerificationForm,
  renterDocumentKindSchema,
  verificationDataSchema,
  verificationFormSchema,
} from "./schema";
import { verificationText } from "@/i18n/de/verification";

const t = verificationText.errors;
const valid = {
  dateOfBirth: "1996-05-01",
  licenseIssuedOn: "2016-05-01",
  licenseClasses: ["B"],
};

function fieldErrors(input: unknown, schema: z.ZodType = verificationDataSchema) {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return z.flattenError(result.error).fieldErrors as Record<string, string[] | undefined>;
}

describe("Dokumentarten", () => {
  it("nur die vier Mieter-Dokumente sind erlaubt", () => {
    expect(RENTER_DOCUMENT_KINDS).toEqual(["id_front", "id_back", "license_front", "license_back"]);
    expect(renterDocumentKindSchema.safeParse("license_back").success).toBe(true);
    expect(renterDocumentKindSchema.safeParse("vehicle_registration").success).toBe(false);
    expect(renterDocumentKindSchema.safeParse("../etc/passwd").success).toBe(false);
  });
});

describe("Führerscheinklassen", () => {
  it("B oder höher reicht, B17 allein nicht", () => {
    expect(hasCarLicense(["B"])).toBe(true);
    expect(hasCarLicense(["B96"])).toBe(true);
    expect(hasCarLicense(["C"])).toBe(true);
    expect(hasCarLicense(["B17"])).toBe(false);
    expect(hasCarLicense([])).toBe(false);
    expect(hasCarLicense(["A", "AM"])).toBe(false);
  });

  it("entfernt Doppelte und sortiert in fester Reihenfolge", () => {
    expect(normalizeLicenseClasses(["CE", "B", "BE", "B"])).toEqual(["B", "BE", "CE"]);
  });

  it("enthält die üblichen Pkw-Klassen", () => {
    for (const c of ["B", "BE", "B96", "B17"]) expect(LICENSE_CLASSES).toContain(c);
  });
});

describe("verificationDataSchema", () => {
  it("akzeptiert gültige Angaben und normalisiert", () => {
    const result = verificationDataSchema.parse({
      ...valid,
      dateOfBirth: " 1996-05-01 ",
      licenseClasses: ["BE", "B", "B"],
    });
    expect(result).toEqual({ ...valid, licenseClasses: ["B", "BE"] });
  });

  it("lehnt ungültige oder fehlende Daten ab", () => {
    expect(fieldErrors({ ...valid, dateOfBirth: "2023-02-30" }).dateOfBirth).toEqual([
      t.dateOfBirthInvalid,
    ]);
    expect(fieldErrors({ ...valid, dateOfBirth: "01.05.1996" }).dateOfBirth).toEqual([
      t.dateOfBirthInvalid,
    ]);
    expect(fieldErrors({ ...valid, dateOfBirth: "" }).dateOfBirth).toEqual([t.dateOfBirthInvalid]);
    expect(fieldErrors({ ...valid, dateOfBirth: null }).dateOfBirth).toEqual([
      t.dateOfBirthInvalid,
    ]);
    expect(fieldErrors({ ...valid, licenseIssuedOn: "abc" }).licenseIssuedOn).toEqual([
      t.licenseIssuedOnInvalid,
    ]);
    expect(fieldErrors({ ...valid, dateOfBirth: "1899-12-31" }).dateOfBirth).toEqual([
      t.dateTooEarly,
    ]);
  });

  it("verlangt mindestens eine erlaubte Klasse ab B", () => {
    expect(fieldErrors({ ...valid, licenseClasses: [] }).licenseClasses).toEqual([
      t.licenseClassesRequired,
    ]);
    expect(fieldErrors({ ...valid, licenseClasses: ["B17"] }).licenseClasses).toEqual([
      t.licenseClassesNoCar,
    ]);
    expect(fieldErrors({ ...valid, licenseClasses: ["B", "X"] }).licenseClasses).toEqual([
      t.licenseClassesInvalid,
    ]);
    expect(fieldErrors({ ...valid, licenseClasses: "B" }).licenseClasses).toEqual([
      t.licenseClassesRequired,
    ]);
  });
});

describe("verificationFormSchema", () => {
  it("verlangt die Einwilligung", () => {
    expect(fieldErrors({ ...valid, consent: false }, verificationFormSchema).consent).toEqual([
      t.consentRequired,
    ]);
    expect(verificationFormSchema.safeParse({ ...valid, consent: true }).success).toBe(true);
  });

  it("liest FormData robust ein", () => {
    const formData = new FormData();
    formData.set("dateOfBirth", "1996-05-01");
    formData.append("licenseClasses", "B");
    formData.append("licenseClasses", "BE");
    formData.append("licenseClasses", new Blob(["x"]));
    formData.set("consent", "on");
    expect(readVerificationForm(formData)).toEqual({
      dateOfBirth: "1996-05-01",
      licenseIssuedOn: "",
      licenseClasses: ["B", "BE"],
      consent: true,
    });
    expect(readVerificationForm(new FormData()).consent).toBe(false);
  });
});
