/** Texte für die Mieter-Verifizierung (Ausweis + Führerschein). */
export const verificationText = {
  page: {
    title: "Verifizierung",
    heading: "Als Mieter verifizieren",
    description:
      "Bevor du ein Auto mietest, prüfen wir einmalig deinen Ausweis und deinen Führerschein.",
    back: "Zurück zu Mein Konto",
  },
  why: {
    title: "Warum wir das prüfen",
    body: "Die Autos gehören Privatleuten, die ihr Fahrzeug während ihrer Reise in gute Hände geben. Die Versicherung gilt nur für geprüfte Fahrer mit gültigem Führerschein – und die Prüfung schützt dich und die Besitzer vor Betrug.",
  },
  requirements: {
    title: "Das brauchst du",
    minAge: (years: number) => `Du bist mindestens ${years} Jahre alt.`,
    licenseYears: (years: number) =>
      years === 1
        ? "Du hast deinen Führerschein (Klasse B) seit mindestens 1 Jahr."
        : `Du hast deinen Führerschein (Klasse B) seit mindestens ${years} Jahren.`,
    documents:
      "Gut lesbare Fotos von Personalausweis (oder Reisepass) und Führerschein, jeweils Vorder- und Rückseite.",
  },
  privacy: {
    title: "Deine Daten sind geschützt",
    encrypted:
      "Deine Fotos, dein Geburtsdatum und das Ausstellungsdatum deines Führerscheins speichern wir verschlüsselt.",
    access:
      "Nur unser Prüfteam kann die Dokumente ansehen – jeder Zugriff wird protokolliert. Vermieter sehen deine Dokumente nie.",
    retention: (days: number, rejectedDays: number) =>
      `Wir löschen die Dokumente spätestens ${days} Tage nach deiner letzten Aktivität, nach einer Ablehnung bereits nach ${rejectedDays} Tagen.`,
  },
  status: {
    approvedTitle: "Du bist verifiziert",
    approvedBody: "Du kannst jetzt Autos mieten.",
    approvedSince: (date: string) => `Bestätigt am ${date}.`,
    approvedValidUntil: (date: string) => `Gültig bis ${date}.`,
    approvedCta: "Autos entdecken",
    pendingBadge: "In Prüfung",
    pendingTitle: "Deine Angaben werden geprüft",
    pendingSince: (date: string) => `Eingereicht am ${date}.`,
    pendingBody:
      "Das dauert in der Regel höchstens zwei Werktage. Das Ergebnis siehst du hier auf dieser Seite.",
    rejectedTitle: "Deine Verifizierung wurde abgelehnt",
    rejectedReason: "Begründung:",
    rejectedNoReason: "Bitte prüfe, ob deine Fotos gut lesbar sind, und versuch es noch einmal.",
    expiredTitle: "Deine Verifizierung ist abgelaufen",
    expiredBody: "Bitte reiche deine Dokumente noch einmal ein.",
    restart: "Neu einreichen",
    restarting: "Wird vorbereitet …",
  },
  documents: {
    title: "1. Fotos hochladen",
    description:
      "Fotografiere die Dokumente auf einem dunklen Untergrund, ohne Spiegelungen und vollständig im Bild.",
    kinds: {
      id_front: { label: "Ausweis – Vorderseite", hint: "Seite mit deinem Foto" },
      id_back: {
        label: "Ausweis – Rückseite",
        hint: "Beim Reisepass: die Seite mit deiner Unterschrift",
      },
      license_front: { label: "Führerschein – Vorderseite", hint: "Seite mit deinem Foto" },
      license_back: { label: "Führerschein – Rückseite", hint: "Seite mit den Klassen" },
    },
    takePhoto: "Foto aufnehmen",
    chooseFile: "Datei wählen",
    preparing: "Bild wird vorbereitet …",
    uploading: "Wird hochgeladen …",
    uploaded: "Hochgeladen",
    missing: "Noch nicht hochgeladen",
    replaceHint: "Ein neues Foto ersetzt das bisherige.",
    progress: (done: number, total: number) => `${done} von ${total} Fotos hochgeladen`,
    previewAlt: (label: string) => `Vorschau: ${label}`,
  },
  form: {
    title: "2. Angaben machen",
    description: "Die Angaben gleichen wir mit deinen Dokumenten ab.",
    dateOfBirth: "Geburtsdatum",
    licenseIssuedOn: "Führerschein ausgestellt am",
    licenseIssuedOnHint: "Datum der ersten Fahrerlaubnis der Klasse B (Feld 10 auf der Rückseite)",
    licenseClasses: "Führerscheinklassen",
    licenseClassesHint: "Wähle alle Klassen, die auf deinem Führerschein stehen.",
    consent:
      "Ich willige ein, dass Standzeit meine Ausweis- und Führerscheindaten zur Prüfung meiner Identität und Fahrberechtigung verarbeitet. Die Einwilligung kann ich jederzeit widerrufen.",
    missingDocumentsHint: "Lade zuerst alle vier Fotos hoch.",
    submit: "Zur Prüfung einreichen",
    submitting: "Wird eingereicht …",
    notEligibleTitle: "Mit diesen Angaben können wir dich leider nicht freischalten",
    notEligibleHint: "Falls du dich vertippt hast, korrigiere die Angaben und reiche erneut ein.",
  },
  licenseClasses: {
    B: "B",
    B96: "B96",
    BE: "BE",
    B17: "B17 (begleitetes Fahren)",
    C1: "C1",
    C1E: "C1E",
    C: "C",
    CE: "CE",
    D1: "D1",
    D1E: "D1E",
    D: "D",
    DE: "DE",
  },
  errors: {
    dateOfBirthInvalid: "Bitte gib dein Geburtsdatum an.",
    licenseIssuedOnInvalid: "Bitte gib an, wann dein Führerschein ausgestellt wurde.",
    dateTooEarly: "Bitte prüfe das Datum.",
    licenseClassesRequired: "Bitte wähle mindestens eine Führerscheinklasse.",
    licenseClassesInvalid: "Bitte wähle nur Klassen aus der Liste.",
    licenseClassesNoCar:
      "Zum Mieten brauchst du die Klasse B (oder eine höhere Klasse wie C1 oder C).",
    consentRequired: "Bitte bestätige die Einwilligung.",
    missingDocuments: (labels: string[]) => `Es fehlen noch Fotos: ${labels.join(", ")}.`,
    fileMissing: "Bitte wähle ein Foto aus.",
    fileEmpty: "Die Datei ist leer. Bitte wähle ein anderes Foto.",
    fileTooLarge: "Das Foto ist zu groß. Bitte wähle ein kleineres Foto.",
    fileUnsupported:
      "Dieses Format können wir nicht lesen. Bitte nutze ein Foto als JPG, PNG oder WebP.",
    imageUnreadable:
      "Dieses Bild können wir nicht öffnen. Bitte mach ein neues Foto oder nutze ein JPG oder PNG.",
    alreadySubmitted:
      "Deine Verifizierung wurde bereits eingereicht – Änderungen sind nicht mehr möglich.",
    alreadyApproved: "Du bist bereits verifiziert.",
    notDraft: "Diese Verifizierung kann nicht mehr geändert werden. Bitte lade die Seite neu.",
    uploadFailed: "Das Hochladen hat nicht geklappt. Bitte versuch es noch einmal.",
    generic: "Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.",
  },
} as const;
