import type { ActorType, BookingEvent, GuardId } from "./state-machine";

/** Texte der Buchungs-Statusmaschine (Bezeichnungen und Fehlermeldungen). */
export const EVENT_LABELS: Readonly<Record<BookingEvent, string>> = Object.freeze({
  confirm: "Bestätigen",
  decline: "Ablehnen",
  withdraw: "Zurückziehen",
  expire: "Ablaufen lassen",
  cancel: "Stornieren",
  start_rental: "Miete starten",
  return_vehicle: "Rückgabe abschließen",
  start_service: "Service beginnen",
  complete_service: "Service abschließen",
  close: "Buchung abschließen",
});

export const ACTOR_LABELS: Readonly<Record<ActorType, string>> = Object.freeze({
  renter: "Mieter",
  owner: "Vermieter",
  admin: "Admin",
  system: "System",
  partner: "Service-Partner",
});

/** Beschreibung der Bedingungen für UI und Doku. */
export const GUARD_DESCRIPTIONS: Readonly<Record<GuardId, string>> = Object.freeze({
  before_expiry: "Nur bis zum Ablauf der Antwortfrist.",
  after_expiry: "Erst nach Ablauf der Antwortfrist.",
  before_start_unless_admin:
    "Mieter und Vermieter nur vor Mietbeginn, der Admin auch danach (bis zur Abholung).",
  pickup_window_open: "Frühestens kurz vor Mietbeginn (Standard: 30 Minuten).",
  pickup_inspection_complete: "Der Abhol-Check ist abgeschlossen.",
  return_inspection_complete: "Der Rückgabe-Check ist abgeschlossen.",
  service_photos_complete: "Die Service-Fotos sind vollständig.",
  no_open_damage_cases: "Es gibt keine offenen Schadensfälle.",
  deposit_settled: "Die Kaution ist abgerechnet.",
});

export const transitionText = {
  invalidTransition: (event: string, status: string) =>
    `„${event}“ ist im Status „${status}“ nicht möglich.`,
  forbiddenActor: (event: string, actor: string) =>
    `„${event}“ ist für die Rolle „${actor}“ nicht erlaubt.`,
  guards: {
    before_expiry: "Die Antwortfrist für diese Anfrage ist abgelaufen.",
    after_expiry: "Die Antwortfrist für diese Anfrage läuft noch.",
    before_start_unless_admin: "Nach Mietbeginn kann nur noch der Support stornieren.",
    pickup_window_open: (minutes: number) =>
      minutes === 0
        ? "Die Abholung ist erst ab Mietbeginn möglich."
        : `Die Abholung ist frühestens ${minutes === 1 ? "1 Minute" : `${minutes} Minuten`} vor Mietbeginn möglich.`,
    pickup_inspection_complete: "Der Abhol-Check ist noch nicht abgeschlossen.",
    return_inspection_complete: "Der Rückgabe-Check ist noch nicht abgeschlossen.",
    service_photos_complete: "Die Service-Fotos sind noch nicht vollständig.",
    no_open_damage_cases: "Es gibt noch offene Schadensfälle.",
    deposit_settled: "Die Kaution ist noch nicht abgerechnet.",
  },
} as const;
