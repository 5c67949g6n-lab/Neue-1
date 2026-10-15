/** Texte der Mieter-Zulassungsprüfung (Gründe, warum jemand nicht berechtigt ist). */
function years(n: number): string {
  return n === 1 ? "1 Jahr" : `${n} Jahre`;
}

export const eligibilityText = {
  dateOfBirthInvalid: "Das Geburtsdatum ist kein gültiges Datum.",
  dateOfBirthInFuture: "Das Geburtsdatum liegt in der Zukunft.",
  licenseIssuedOnInvalid: "Das Ausstellungsdatum des Führerscheins ist kein gültiges Datum.",
  licenseIssuedOnInFuture: "Das Ausstellungsdatum des Führerscheins liegt in der Zukunft.",
  licenseBeforeMinIssueAge: (minIssueAge: number) =>
    `Der Führerschein kann nicht vor dem ${minIssueAge}. Geburtstag ausgestellt worden sein. Bitte prüfe Geburts- und Ausstellungsdatum.`,
  tooYoung: (minAge: number, age: number) =>
    `Das Mindestalter von ${minAge} Jahren ist nicht erreicht (aktuell ${years(age)}).`,
  licenseTooShort: (minYears: number, licenseYears: number) =>
    `Der Führerschein muss seit mindestens ${minYears === 1 ? "1 Jahr" : `${minYears} Jahren`} bestehen (aktuell ${years(licenseYears)}).`,
} as const;
