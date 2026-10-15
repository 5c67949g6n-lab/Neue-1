/**
 * Buchungs-Statusmaschine. Reine Logik ohne DB-Zugriff und ohne globale Zeit: Der aktuelle
 * Zeitpunkt kommt immer über `ctx.now`. Wer einen Übergang ausführt, schreibt danach Status,
 * Zeitstempel und einen Eintrag in `booking_events` (serverseitig, Admin-Client).
 *
 * Prüfreihenfolge: Übergang definiert? → Rolle erlaubt? → Bedingungen erfüllt?
 * Die Rolle muss der Aufrufer vorher gegen die Buchung prüfen (siehe `resolveActor`).
 */
import type { Database } from "@/lib/supabase/database.types";
import { ACTOR_LABELS, EVENT_LABELS, transitionText } from "./messages";
import { STATUS_LABELS, type BookingStatus } from "./status";

export type ActorType = Database["public"]["Enums"]["actor_type"];

export const ACTOR_TYPES = [
  "renter",
  "owner",
  "admin",
  "system",
  "partner",
] as const satisfies readonly ActorType[];

export const BOOKING_EVENTS = [
  "confirm",
  "decline",
  "withdraw",
  "expire",
  "cancel",
  "start_rental",
  "return_vehicle",
  "start_service",
  "complete_service",
  "close",
] as const;

export type BookingEvent = (typeof BOOKING_EVENTS)[number];

export function isBookingEvent(value: unknown): value is BookingEvent {
  return typeof value === "string" && (BOOKING_EVENTS as readonly string[]).includes(value);
}

export type BookingSnapshot = {
  status: BookingStatus;
  expiresAt: Date;
  startAt: Date;
  endAt: Date;
};

export type Actor = { type: ActorType; id?: string };

export type TransitionContext = {
  now: Date;
  pickupInspectionComplete?: boolean;
  returnInspectionComplete?: boolean;
  servicePhotosComplete?: boolean;
  openDamageCases?: number;
  depositSettled?: boolean;
  /** Wie viele Minuten vor Mietbeginn die Abholung frühestens möglich ist (Standard 30). */
  pickupEarlyMinutes?: number;
};

export type TimestampField =
  "confirmed_at" | "cancelled_at" | "picked_up_at" | "returned_at" | "ready_at" | "completed_at";

export type TransitionErrorCode = "invalid_transition" | "forbidden_actor" | "guard_failed";

export type TransitionResult =
  | {
      ok: true;
      from: BookingStatus;
      to: BookingStatus;
      event: BookingEvent;
      timestamps: Partial<Record<TimestampField, string>>;
    }
  | { ok: false; code: TransitionErrorCode; message: string };

export type GuardId =
  | "before_expiry"
  | "after_expiry"
  | "before_start_unless_admin"
  | "pickup_window_open"
  | "pickup_inspection_complete"
  | "return_inspection_complete"
  | "service_photos_complete"
  | "no_open_damage_cases"
  | "deposit_settled";

export type TransitionRule = {
  readonly event: BookingEvent;
  readonly from: BookingStatus;
  readonly to: BookingStatus;
  readonly actors: readonly ActorType[];
  /** Bedingungen, die alle erfüllt sein müssen (Beschreibung: GUARD_DESCRIPTIONS). */
  readonly guards: readonly GuardId[];
  /** Zeitstempel-Spalte in `bookings`, die beim Übergang auf `now` gesetzt wird. */
  readonly timestamp?: TimestampField;
};

export const DEFAULT_PICKUP_EARLY_MINUTES = 30;

function rule(r: TransitionRule): TransitionRule {
  return Object.freeze({
    ...r,
    actors: Object.freeze([...r.actors]),
    guards: Object.freeze([...r.guards]),
  });
}

/**
 * Alle erlaubten Übergänge. Pro Kombination aus Ausgangsstatus und Ereignis gibt es höchstens
 * eine Regel; alles, was hier fehlt, ist `invalid_transition`.
 *
 * Abweichend vom reinen Fristende-Guard bei `confirm` sind auch Ablehnen, Zurückziehen und
 * Admin-Storno einer Anfrage nur vor Fristablauf möglich: Danach gilt die Anfrage als
 * abgelaufen (siehe `effectiveStatus`), und nur noch `expire` ist zulässig.
 */
export const TRANSITIONS: readonly TransitionRule[] = Object.freeze([
  rule({
    event: "confirm",
    from: "requested",
    to: "confirmed",
    actors: ["owner", "admin"],
    guards: ["before_expiry"],
    timestamp: "confirmed_at",
  }),
  rule({
    event: "decline",
    from: "requested",
    to: "declined",
    actors: ["owner", "admin"],
    guards: ["before_expiry"],
  }),
  rule({
    event: "withdraw",
    from: "requested",
    to: "withdrawn",
    actors: ["renter"],
    guards: ["before_expiry"],
  }),
  rule({
    event: "expire",
    from: "requested",
    to: "expired",
    actors: ["system"],
    guards: ["after_expiry"],
  }),
  rule({
    event: "cancel",
    from: "requested",
    to: "cancelled",
    actors: ["admin"],
    guards: ["before_expiry"],
    timestamp: "cancelled_at",
  }),
  rule({
    event: "cancel",
    from: "confirmed",
    to: "cancelled",
    actors: ["renter", "owner", "admin"],
    guards: ["before_start_unless_admin"],
    timestamp: "cancelled_at",
  }),
  rule({
    event: "start_rental",
    from: "confirmed",
    to: "active",
    actors: ["renter", "admin"],
    guards: ["pickup_window_open", "pickup_inspection_complete"],
    timestamp: "picked_up_at",
  }),
  rule({
    event: "return_vehicle",
    from: "active",
    to: "returned",
    actors: ["renter", "admin"],
    guards: ["return_inspection_complete"],
    timestamp: "returned_at",
  }),
  rule({
    event: "start_service",
    from: "returned",
    to: "in_service",
    actors: ["partner", "admin", "system"],
    guards: [],
  }),
  rule({
    event: "complete_service",
    from: "in_service",
    to: "ready",
    actors: ["partner", "admin"],
    guards: ["service_photos_complete"],
    timestamp: "ready_at",
  }),
  rule({
    event: "close",
    from: "ready",
    to: "completed",
    actors: ["system", "admin"],
    guards: ["no_open_damage_cases", "deposit_settled"],
    timestamp: "completed_at",
  }),
]);

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

type GuardCheck = (booking: BookingSnapshot, actor: Actor, ctx: TransitionContext) => string | null;

/** Liefert `null`, wenn die Bedingung erfüllt ist, sonst die Fehlermeldung. */
const GUARD_CHECKS: Record<GuardId, GuardCheck> = {
  before_expiry: (b, _a, ctx) =>
    ctx.now.getTime() < b.expiresAt.getTime() ? null : transitionText.guards.before_expiry,
  after_expiry: (b, _a, ctx) =>
    ctx.now.getTime() >= b.expiresAt.getTime() ? null : transitionText.guards.after_expiry,
  // Status `confirmed` heißt: noch nicht abgeholt – der Admin darf also bis zur Abholung stornieren.
  before_start_unless_admin: (b, actor, ctx) =>
    actor.type === "admin" || ctx.now.getTime() < b.startAt.getTime()
      ? null
      : transitionText.guards.before_start_unless_admin,
  pickup_window_open: (b, _a, ctx) => {
    const minutes = pickupEarlyMinutes(ctx);
    return ctx.now.getTime() >= b.startAt.getTime() - minutes * MINUTE_MS
      ? null
      : transitionText.guards.pickup_window_open(minutes);
  },
  pickup_inspection_complete: (_b, _a, ctx) =>
    ctx.pickupInspectionComplete === true ? null : transitionText.guards.pickup_inspection_complete,
  return_inspection_complete: (_b, _a, ctx) =>
    ctx.returnInspectionComplete === true ? null : transitionText.guards.return_inspection_complete,
  service_photos_complete: (_b, _a, ctx) =>
    ctx.servicePhotosComplete === true ? null : transitionText.guards.service_photos_complete,
  no_open_damage_cases: (_b, _a, ctx) =>
    ctx.openDamageCases === 0 ? null : transitionText.guards.no_open_damage_cases,
  deposit_settled: (_b, _a, ctx) =>
    ctx.depositSettled === true ? null : transitionText.guards.deposit_settled,
};

function pickupEarlyMinutes(ctx: TransitionContext): number {
  const minutes = ctx.pickupEarlyMinutes ?? DEFAULT_PICKUP_EARLY_MINUTES;
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new RangeError("pickupEarlyMinutes muss eine Zahl ≥ 0 sein");
  }
  return minutes;
}

function assertValidDate(value: Date, name: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError(`${name} ist kein gültiger Zeitpunkt`);
  }
}

function assertValidInput(booking: BookingSnapshot, ctx: TransitionContext) {
  assertValidDate(ctx.now, "ctx.now");
  assertValidDate(booking.expiresAt, "expiresAt");
  assertValidDate(booking.startAt, "startAt");
  assertValidDate(booking.endAt, "endAt");
}

/** Regel für Ausgangsstatus + Ereignis (oder `undefined`, wenn nicht definiert). */
export function findTransition(
  from: BookingStatus,
  event: BookingEvent,
): TransitionRule | undefined {
  return TRANSITIONS.find((r) => r.from === from && r.event === event);
}

function label(map: Readonly<Record<string, string>>, key: string): string {
  return Object.hasOwn(map, key) ? map[key] : key;
}

/**
 * Prüft einen Übergang und liefert Zielstatus und zu setzende Zeitstempel.
 * Ausgewertet wird der gespeicherte Status (nicht `effectiveStatus`), damit eine lazy
 * abgelaufene Anfrage per `expire` noch festgeschrieben werden kann.
 * Wirft nur bei Programmierfehlern (ungültige Zeitpunkte, negatives `pickupEarlyMinutes`).
 */
export function transition(
  booking: BookingSnapshot,
  event: BookingEvent,
  actor: Actor,
  ctx: TransitionContext,
): TransitionResult {
  assertValidInput(booking, ctx);

  const found = findTransition(booking.status, event);
  if (!found) {
    return {
      ok: false,
      code: "invalid_transition",
      message: transitionText.invalidTransition(
        label(EVENT_LABELS, event),
        label(STATUS_LABELS, booking.status),
      ),
    };
  }

  if (!found.actors.includes(actor.type)) {
    return {
      ok: false,
      code: "forbidden_actor",
      message: transitionText.forbiddenActor(
        label(EVENT_LABELS, event),
        label(ACTOR_LABELS, actor.type),
      ),
    };
  }

  for (const guard of found.guards) {
    const failure = GUARD_CHECKS[guard](booking, actor, ctx);
    if (failure) return { ok: false, code: "guard_failed", message: failure };
  }

  return {
    ok: true,
    from: found.from,
    to: found.to,
    event,
    timestamps: found.timestamp ? { [found.timestamp]: ctx.now.toISOString() } : {},
  };
}

/** Ereignisse, die dieser Akteur jetzt auslösen darf (in der Reihenfolge von BOOKING_EVENTS). */
export function allowedEvents(
  booking: BookingSnapshot,
  actor: Actor,
  ctx: TransitionContext,
): BookingEvent[] {
  return BOOKING_EVENTS.filter((event) => transition(booking, event, actor, ctx).ok);
}

/**
 * Status, wie er Nutzern angezeigt wird: Eine Anfrage, deren Antwortfrist abgelaufen ist,
 * gilt sofort als `expired` – auch wenn der Cron-Job sie noch nicht festgeschrieben hat.
 */
export function effectiveStatus(
  booking: Pick<BookingSnapshot, "status" | "expiresAt">,
  now: Date,
): BookingStatus {
  assertValidDate(now, "now");
  assertValidDate(booking.expiresAt, "expiresAt");
  if (booking.status === "requested" && now.getTime() >= booking.expiresAt.getTime()) {
    return "expired";
  }
  return booking.status;
}

/**
 * Antwortfrist einer Anfrage: `responseHours` echte Stunden nach der Anfrage, höchstens aber
 * bis Mietbeginn. Wirft, wenn der Mietbeginn nicht nach der Anfrage liegt.
 */
export function computeExpiresAt(requestedAt: Date, startAt: Date, responseHours: number): Date {
  assertValidDate(requestedAt, "requestedAt");
  assertValidDate(startAt, "startAt");
  if (!Number.isFinite(responseHours) || responseHours <= 0) {
    throw new RangeError("responseHours muss größer als 0 sein");
  }
  if (startAt.getTime() <= requestedAt.getTime()) {
    throw new RangeError("Der Mietbeginn muss nach dem Anfragezeitpunkt liegen");
  }
  return new Date(Math.min(requestedAt.getTime() + responseHours * HOUR_MS, startAt.getTime()));
}

/**
 * Rolle eines Nutzers für eine Buchung. Beteiligte handeln immer in ihrer Rolle
 * (Mieter/Vermieter), auch wenn sie Admin sind – Admin-Rechte gelten nur für fremde Buchungen.
 * `null`: Der Nutzer hat mit der Buchung nichts zu tun.
 */
export function resolveActor(
  parties: { renterId: string; ownerId: string },
  user: { id: string; isAdmin?: boolean } | null | undefined,
): Actor | null {
  if (!user?.id) return null;
  if (user.id === parties.renterId) return { type: "renter", id: user.id };
  if (user.id === parties.ownerId) return { type: "owner", id: user.id };
  if (user.isAdmin === true) return { type: "admin", id: user.id };
  return null;
}
