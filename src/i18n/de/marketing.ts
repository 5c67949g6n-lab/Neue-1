/** Texte für die öffentlichen Seiten: Startseite (/) und Besitzer-Landingpage (/vermieten). */
export const marketingText = {
  home: {
    badge: "Jetzt neu in Stuttgart",
    title: "Dein Auto verdient Geld, während du im Urlaub bist",
    titleAccent: "– und du musst dich um nichts kümmern.",
    lead: "Standzeit vermietet dein Auto für Wochen oder Monate an geprüfte Mieter. Die Übergabe läuft ohne dich, und wenn du zurückkommst, steht es gewaschen und vollgetankt bereit.",
    ctaOwner: "Auto vermieten",
    ctaRenter: "Auto mieten",
    ctaRenterLoggedIn: "Zu meinem Konto",
    trust: ["Nur verifizierte Mieter", "Übergabe ohne Treffen", "Fotoprotokoll bei jeder Übergabe"],
    example: {
      label: "Beispiel: zwei Wochen Mallorca",
      title: "Urlaubsmodus",
      status: "aktiv",
      steps: [
        {
          when: "Sa, 07:30",
          what: "Auto am Flughafen abstellen, Fotos machen, Schlüssel in die Keybox.",
        },
        { when: "Sa – Fr", what: "Eine geprüfte Mieterin fährt dein Auto für ihr Projekt." },
        {
          when: "So, 18:00",
          what: "Du landest – dein Auto steht gewaschen, gereinigt und vollgetankt bereit.",
        },
      ],
      footer: "Keine Parkgebühren. Kein Schlüssel-Treffen. Keine Sorgen.",
    },
    benefits: {
      title: "Warum Standzeit?",
      description: "Gemacht für alle, die verreisen – und deren Auto sonst nur herumsteht.",
      handoverPoints: ["Flughafen", "Bahnhof", "Keybox"],
      items: [
        {
          icon: "key",
          title: "Übergabe ohne Anwesenheit",
          text: "Am Flughafen, am Bahnhof oder per Keybox: Du stellst das Auto ab, der Mieter holt es später ab. Ihr müsst euch nie treffen.",
        },
        {
          icon: "sparkle",
          title: "Rückkehr-Service",
          text: "Wenn du zurückkommst, ist dein Auto gewaschen, innen gereinigt und vollgetankt. Du steigst einfach ein.",
        },
        {
          icon: "camera",
          title: "KI-Schadenscheck",
          text: "Fotos bei Übergabe und Rückgabe werden automatisch verglichen. Neue Kratzer fallen sofort auf – ohne lange Diskussion.",
        },
        {
          icon: "calendar",
          title: "Langzeitmiete",
          text: "Wochen bis Monate statt Stunden: weniger Übergaben, weniger Verschleiß und planbare Einnahmen.",
        },
        {
          icon: "chart",
          title: "Preisvorschlag mit lokaler Nachfrage",
          text: "Messe, Wasen, Ferienzeit: Wir schlagen dir einen Preis vor, der zur Nachfrage in Stuttgart passt.",
        },
      ],
    },
    howItWorks: {
      title: "So funktioniert’s",
      description: "Drei Schritte – egal, ob du vermietest oder mietest.",
      ownerTitle: "Für Besitzer",
      renterTitle: "Für Mieter",
      owner: [
        {
          title: "Reisezeitraum eintragen",
          text: "Lege dein Auto an, trag ein, wann du weg bist, und übernimm unseren Preisvorschlag.",
        },
        {
          title: "Abstellen und losfliegen",
          text: "Auto am Übergabepunkt parken, Fotos machen, Schlüssel sicher hinterlegen – fertig.",
        },
        {
          title: "Zurückkommen und einsteigen",
          text: "Dein Auto wartet sauber und vollgetankt auf dich. Das Geld kommt nach Mietende.",
        },
      ],
      renter: [
        {
          title: "Registrieren und verifizieren",
          text: "Einmalig Ausweis und Führerschein hochladen. Wir prüfen alles von Hand.",
        },
        {
          title: "Auto für Wochen buchen",
          text: "Wähle ein Auto in deiner Nähe für genau den Zeitraum, den du brauchst.",
        },
        {
          title: "Kontaktlos abholen",
          text: "Zum Übergabepunkt gehen, Fotos machen, Schlüssel holen und losfahren.",
        },
      ],
    },
    audiences: {
      title: "Wer bei uns mietet",
      description: "Menschen, die für eine Weile ein Auto brauchen – aber keins kaufen wollen.",
      items: [
        {
          icon: "home",
          title: "Neu in Stuttgart",
          text: "Gerade hergezogen oder noch in der Probezeit? Erst ankommen, dann über ein eigenes Auto entscheiden.",
        },
        {
          icon: "briefcase",
          title: "Projektarbeit",
          text: "Ein paar Wochen oder Monate beim Kunden vor Ort – ohne teuren Mietwagen-Tarif.",
        },
        {
          icon: "wrench",
          title: "Auto in der Werkstatt",
          text: "Die Reparatur dauert länger als gedacht? Überbrück die Zeit ganz entspannt.",
        },
        {
          icon: "plane",
          title: "Urlaub in der Region",
          text: "Am Flughafen landen, Schlüssel aus der Keybox holen und los ins Ländle.",
        },
      ],
    },
    city: {
      title: "Wir starten in Stuttgart",
      text: "Flughafen, Hauptbahnhof und ausgewählte Keybox-Standorte in der Region sind unsere ersten Übergabepunkte. Weitere Städte folgen.",
      points: ["Flughafen Stuttgart", "Stuttgart Hbf", "Keyboxen in der Region"],
    },
    finalCta: {
      title: "Bald wieder unterwegs?",
      text: "Registrier dich kostenlos und sei dabei, wenn die ersten Autos in Stuttgart starten.",
      primary: "Kostenlos registrieren",
      secondary: "Mehr fürs Vermieten",
    },
  },
  owner: {
    metaTitle: "Auto vermieten, während du verreist",
    metaDescription:
      "Vermiete dein Auto im Urlaub an geprüfte Mieter – kontaktlose Übergabe, Rückkehr-Service und keine Parkgebühren am Flughafen.",
    badge: "Für Autobesitzer",
    title: "Dein Auto parkt nicht. Es verdient.",
    lead: "Statt zwei Wochen teuer am Flughafen zu stehen, fährt dein Auto für einen geprüften Mieter – und wartet bei deiner Rückkehr gewaschen und vollgetankt auf dich.",
    ctaRegister: "Kostenlos registrieren",
    ctaAccount: "Zu meinem Konto",
    ctaHow: "So läuft’s ab",
    comingSoon: {
      title: "Inserieren startet in Kürze",
      text: "Inserate für dein Auto kannst du mit der nächsten Ausbaustufe (Phase 2) anlegen. Registriere dich schon jetzt – dann bist du von Anfang an dabei.",
    },
    parking: {
      title: "Parkgebühren sparen statt zahlen",
      text: "Wer zwei Wochen verreist und am Flughafen parkt, zahlt dafür schnell einen dreistelligen Betrag. Mit Standzeit fallen keine Parkgebühren an – dein Auto steht nicht, es wird gefahren und bringt dir Geld.",
      without: {
        title: "Ohne Standzeit",
        items: [
          "Parkgebühren für jeden Urlaubstag",
          "Auto steht ungenutzt herum",
          "Nach dem Urlaub selbst waschen und tanken",
        ],
      },
      with: {
        title: "Mit Standzeit",
        items: [
          "Keine Parkgebühren",
          "Einnahmen für jeden vermieteten Tag",
          "Gewaschen, gereinigt und vollgetankt zurück",
        ],
      },
    },
    vacationMode: {
      title: "So läuft der Urlaubsmodus ab",
      description: "Du kümmerst dich um den Urlaub. Um den Rest kümmern wir uns.",
      steps: [
        {
          title: "Urlaubsmodus einschalten",
          text: "Trag ein, wann du verreist und wo du dein Auto abstellst – Flughafen, Bahnhof oder eine Keybox in deiner Nähe.",
        },
        {
          title: "Preisvorschlag übernehmen",
          text: "Wir berücksichtigen die lokale Nachfrage, etwa durch Messen, den Wasen oder Ferienzeiten. Du entscheidest.",
        },
        {
          title: "Abstellen und Fotos machen",
          text: "Ein geführtes Fotoprotokoll dokumentiert den Zustand. Den Schlüssel hinterlegst du sicher am Übergabepunkt.",
        },
        {
          title: "Entspannt zurückkommen",
          text: "Der Mieter gibt das Auto am vereinbarten Ort zurück. Unser Service wäscht, reinigt und tankt – bevor du landest.",
        },
      ],
    },
    safety: {
      title: "Dein Auto in guten Händen",
      items: [
        {
          icon: "shield",
          title: "Geprüfte Mieter",
          text: "Jeder Mieter weist sich mit Ausweis und Führerschein aus. Wir prüfen die Unterlagen, bevor gebucht werden kann.",
        },
        {
          icon: "camera",
          title: "Lückenlose Fotos",
          text: "Bei Übergabe und Rückgabe entstehen Fotos, die sich nachträglich nicht mehr ändern lassen. Der KI-Schadenscheck vergleicht sie automatisch.",
        },
        {
          icon: "card",
          title: "Sichere Auszahlung",
          text: "Dein Geld bekommst du über unseren Zahlungsdienstleister Stripe – deine Bankdaten liegen nicht bei uns.",
        },
      ],
      requirements: (minAge: number, minLicenseYears: number) =>
        `Mieter müssen mindestens ${minAge} Jahre alt sein und seit mindestens ${minLicenseYears} ${minLicenseYears === 1 ? "Jahr" : "Jahren"} einen Führerschein haben.`,
    },
    faq: {
      title: "Häufige Fragen",
      items: [
        {
          q: "Muss ich bei der Übergabe dabei sein?",
          a: "Nein. Du stellst dein Auto am Übergabepunkt ab und hinterlegst den Schlüssel. Der Mieter holt es später ab – ihr müsst euch nie treffen.",
        },
        {
          q: "Wie lange wird mein Auto vermietet?",
          a: "Standzeit ist auf Langzeitmiete ausgelegt: von etwa einer Woche bis zu mehreren Monaten – passend zu deinem Reisezeitraum.",
        },
        {
          q: "Was passiert, wenn etwas beschädigt wird?",
          a: "Die Fotos von Übergabe und Rückgabe werden verglichen. Neue Schäden werden so eindeutig dem Mietzeitraum zugeordnet und als Schadensfall bearbeitet.",
        },
        {
          q: "Ab wann kann ich mein Auto inserieren?",
          a: "Inserate kommen mit der nächsten Ausbaustufe. Registriere dich schon jetzt, dann kannst du direkt loslegen, sobald es so weit ist.",
        },
      ],
    },
    finalCta: {
      title: "Nächster Urlaub schon geplant?",
      text: "Registrier dich kostenlos – dann kannst du direkt loslegen, sobald Inserate freigeschaltet sind.",
    },
  },
  legal: {
    meta: (date: string, version: number) => `Stand: ${date} · Version ${version}`,
    otherPages: "Weitere Rechtstexte",
    pages: [
      { slug: "agb", label: "AGB" },
      { slug: "mietvertrag", label: "Mietvertrag" },
      { slug: "datenschutz", label: "Datenschutz" },
      { slug: "impressum", label: "Impressum" },
    ],
  },
} as const;

export type MarketingIcon =
  | (typeof marketingText.home.benefits.items)[number]["icon"]
  | (typeof marketingText.home.audiences.items)[number]["icon"]
  | (typeof marketingText.owner.safety.items)[number]["icon"];
