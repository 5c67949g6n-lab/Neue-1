/** Texte für Anmeldung, Registrierung und Passwort. */
export const authText = {
  login: {
    title: "Anmelden",
    description: "Schön, dass du wieder da bist.",
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    submitting: "Wird angemeldet …",
    forgotPassword: "Passwort vergessen?",
    noAccount: "Noch kein Konto?",
    register: "Jetzt registrieren",
  },
  errors: {
    emailInvalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
    passwordRequired: "Bitte gib dein Passwort ein.",
    invalidCredentials: "E-Mail oder Passwort ist falsch.",
    emailNotConfirmed: "Bitte bestätige zuerst deine E-Mail-Adresse. Schau in dein Postfach.",
    generic: "Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.",
  },
} as const;
