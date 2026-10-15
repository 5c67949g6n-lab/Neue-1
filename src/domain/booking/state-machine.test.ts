import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/database.types";
import { BOOKING_STATUSES, TERMINAL_STATUSES, type BookingStatus } from "./status";
import {
  ACTOR_TYPES,
  BOOKING_EVENTS,
  DEFAULT_PICKUP_EARLY_MINUTES,
  TRANSITIONS,
  allowedEvents,
  computeExpiresAt,
  effectiveStatus,
  findTransition,
  isBookingEvent,
  resolveActor,
  transition,
  type ActorType,
  type BookingEvent,
  type BookingSnapshot,
  type TimestampField,
  type TransitionContext,
  type TransitionResult,
  type TransitionRule,
} from "./state-machine";
import { ACTOR_LABELS, EVENT_LABELS, GUARD_DESCRIPTIONS } from "./messages";

// ---------------------------------------------------------------------------
// Zeitachse der Test-Buchung (alles in UTC, Millisekunden-genau)
// ---------------------------------------------------------------------------
const MS = 1;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const REQUESTED_AT = Date.parse("2026-11-02T08:00:00.000Z");
const EXPIRES_AT = REQUESTED_AT + 24 * HOUR;
const START_AT = REQUESTED_AT + 3 * DAY;
const END_AT = START_AT + 14 * DAY;

const at = (ms: number) => new Date(ms);

function booking(status: BookingStatus, overrides: Partial<BookingSnapshot> = {}): BookingSnapshot {
  return {
    status,
    expiresAt: at(EXPIRES_AT),
    startAt: at(START_AT),
    endAt: at(END_AT),
    ...overrides,
  };
}

/** Kontext, in dem alle nicht zeitabhängigen Bedingungen erfüllt sind. */
function ctx(now: number, overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    now: at(now),
    pickupInspectionComplete: true,
    returnInspectionComplete: true,
    servicePhotosComplete: true,
    openDamageCases: 0,
    depositSettled: true,
    ...overrides,
  };
}

/** Kontext, in dem jede Bedingung, die nicht von der Zeit abhängt, scheitert. */
function failingCtx(now: number): TransitionContext {
  return {
    now: at(now),
    pickupInspectionComplete: false,
    returnInspectionComplete: false,
    servicePhotosComplete: false,
    openDamageCases: 3,
    depositSettled: false,
  };
}

const actor = (type: ActorType) => ({ type, id: `${type}-id` });

function expectOk(result: TransitionResult) {
  if (!result.ok) throw new Error(`Erwartet ok, erhalten ${result.code}: ${result.message}`);
  return result;
}

function expectError(
  result: TransitionResult,
  code: "invalid_transition" | "forbidden_actor" | "guard_failed",
) {
  expect(result.ok, JSON.stringify(result)).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe(code);
  expect(result.message.trim()).not.toBe("");
  return result;
}

// ---------------------------------------------------------------------------
// Unabhängige Spezifikation (bewusst NICHT aus TRANSITIONS abgeleitet)
// ---------------------------------------------------------------------------
type Spec = { to: BookingStatus; actors: ActorType[]; timestamp?: TimestampField };

const SPEC: Partial<Record<`${BookingStatus}:${BookingEvent}`, Spec>> = {
  "requested:confirm": { to: "confirmed", actors: ["owner", "admin"], timestamp: "confirmed_at" },
  "requested:decline": { to: "declined", actors: ["owner", "admin"] },
  "requested:withdraw": { to: "withdrawn", actors: ["renter"] },
  "requested:expire": { to: "expired", actors: ["system"] },
  "requested:cancel": { to: "cancelled", actors: ["admin"], timestamp: "cancelled_at" },
  "confirmed:cancel": {
    to: "cancelled",
    actors: ["renter", "owner", "admin"],
    timestamp: "cancelled_at",
  },
  "confirmed:start_rental": {
    to: "active",
    actors: ["renter", "admin"],
    timestamp: "picked_up_at",
  },
  "active:return_vehicle": {
    to: "returned",
    actors: ["renter", "admin"],
    timestamp: "returned_at",
  },
  "returned:start_service": { to: "in_service", actors: ["partner", "admin", "system"] },
  "in_service:complete_service": {
    to: "ready",
    actors: ["partner", "admin"],
    timestamp: "ready_at",
  },
  "ready:close": { to: "completed", actors: ["system", "admin"], timestamp: "completed_at" },
};

/** Zeitpunkt, zu dem der definierte Übergang zeitlich zulässig ist. */
function passingNow(from: BookingStatus, event: BookingEvent): number {
  if (from === "requested") return event === "expire" ? EXPIRES_AT : REQUESTED_AT + HOUR;
  // vor Mietbeginn, aber schon im Abholfenster: passt für cancel (alle) und start_rental
  if (from === "confirmed") return START_AT - 10 * MIN;
  return START_AT + 5 * DAY;
}

/** Zeitpunkte quer über die Buchung – für Kombinationen, die nie gültig sein dürfen. */
const PROBE_TIMES = [
  REQUESTED_AT,
  EXPIRES_AT - MS,
  EXPIRES_AT,
  START_AT - 10 * MIN,
  START_AT,
  END_AT + DAY,
];

describe("Übergangsmatrix: alle Status × alle Ereignisse × alle Akteure", () => {
  const combos = BOOKING_STATUSES.flatMap((from) =>
    BOOKING_EVENTS.map((event) => [from, event] as const),
  );

  it("deckt 11 Status × 10 Ereignisse ab", () => {
    expect(combos).toHaveLength(110);
    expect(ACTOR_TYPES).toHaveLength(5);
  });

  it.each(combos)("%s + %s", (from, event) => {
    const spec = SPEC[`${from}:${event}`];

    for (const type of ACTOR_TYPES) {
      if (!spec) {
        // nicht definiert → immer invalid_transition, egal wer und wann
        for (const now of PROBE_TIMES) {
          for (const context of [ctx(now), failingCtx(now)]) {
            const result = transition(booking(from), event, actor(type), context);
            expectError(result, "invalid_transition");
          }
        }
        continue;
      }

      const passing = ctx(passingNow(from, event));
      if (!spec.actors.includes(type)) {
        // Rolle wird vor den Bedingungen geprüft
        expectError(transition(booking(from), event, actor(type), passing), "forbidden_actor");
        expectError(
          transition(booking(from), event, actor(type), failingCtx(passingNow(from, event))),
          "forbidden_actor",
        );
        continue;
      }

      const result = expectOk(transition(booking(from), event, actor(type), passing));
      expect(result).toEqual({
        ok: true,
        from,
        to: spec.to,
        event,
        timestamps: spec.timestamp ? { [spec.timestamp]: passing.now.toISOString() } : {},
      });
    }
  });

  it("Endzustände haben keinen einzigen Ausgang", () => {
    for (const from of TERMINAL_STATUSES) {
      for (const event of BOOKING_EVENTS) {
        expect(findTransition(from, event), `${from} + ${event}`).toBeUndefined();
      }
    }
  });
});

describe("TRANSITIONS (Übergangstabelle als Daten)", () => {
  it("entspricht genau der Spezifikation", () => {
    const fromTable = Object.fromEntries(
      TRANSITIONS.map((r) => [
        `${r.from}:${r.event}`,
        {
          to: r.to,
          actors: [...r.actors].sort(),
          ...(r.timestamp ? { timestamp: r.timestamp } : {}),
        },
      ]),
    );
    const fromSpec = Object.fromEntries(
      Object.entries(SPEC).map(([key, s]) => [
        key,
        {
          to: s!.to,
          actors: [...s!.actors].sort(),
          ...(s!.timestamp ? { timestamp: s!.timestamp } : {}),
        },
      ]),
    );
    expect(fromTable).toEqual(fromSpec);
  });

  it("hat pro Status + Ereignis höchstens eine Regel", () => {
    const keys = TRANSITIONS.map((r) => `${r.from}:${r.event}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("verwendet nur gültige Status, Akteure und beschriebene Bedingungen", () => {
    for (const r of TRANSITIONS) {
      expect(BOOKING_STATUSES).toContain(r.from);
      expect(BOOKING_STATUSES).toContain(r.to);
      for (const a of r.actors) expect(ACTOR_TYPES).toContain(a);
      for (const g of r.guards) expect(Object.keys(GUARD_DESCRIPTIONS)).toContain(g);
    }
  });

  it("ist unveränderlich", () => {
    expect(Object.isFrozen(TRANSITIONS)).toBe(true);
    for (const r of TRANSITIONS) {
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.actors)).toBe(true);
      expect(Object.isFrozen(r.guards)).toBe(true);
    }
    expect(() => (TRANSITIONS as TransitionRule[]).push(TRANSITIONS[0])).toThrow(TypeError);
  });

  it("jeder nicht-terminale Status ist erreichbar und hat einen Ausgang", () => {
    const reachable = new Set<BookingStatus>(["requested"]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const r of TRANSITIONS) {
        if (reachable.has(r.from) && !reachable.has(r.to)) {
          reachable.add(r.to);
          grew = true;
        }
      }
    }
    expect([...reachable].sort()).toEqual([...BOOKING_STATUSES].sort());
    for (const status of BOOKING_STATUSES) {
      const hasExit = TRANSITIONS.some((r) => r.from === status);
      expect(hasExit, status).toBe(!(TERMINAL_STATUSES as readonly string[]).includes(status));
    }
  });
});

// ---------------------------------------------------------------------------
// Bedingungen an ihren Grenzen
// ---------------------------------------------------------------------------
describe("Antwortfrist (confirm, decline, withdraw, cancel bei Anfrage, expire)", () => {
  const beforeExpiry: [BookingEvent, ActorType][] = [
    ["confirm", "owner"],
    ["confirm", "admin"],
    ["decline", "owner"],
    ["decline", "admin"],
    ["withdraw", "renter"],
    ["cancel", "admin"],
  ];

  it.each(beforeExpiry)(
    "%s durch %s: 1 ms vor Fristende ok, ab Fristende nicht mehr",
    (event, type) => {
      const b = booking("requested");
      expectOk(transition(b, event, actor(type), ctx(EXPIRES_AT - MS)));
      const atDeadline = expectError(
        transition(b, event, actor(type), ctx(EXPIRES_AT)),
        "guard_failed",
      );
      expect(atDeadline.message).toMatch(/Antwortfrist/);
      expectError(transition(b, event, actor(type), ctx(EXPIRES_AT + MS)), "guard_failed");
    },
  );

  it("confirm ist direkt nach der Anfrage möglich", () => {
    expectOk(transition(booking("requested"), "confirm", actor("owner"), ctx(REQUESTED_AT)));
  });

  it("expire durch system: 1 ms vor Fristende nicht, genau zum Fristende und danach ja", () => {
    const b = booking("requested");
    const early = expectError(
      transition(b, "expire", actor("system"), ctx(EXPIRES_AT - MS)),
      "guard_failed",
    );
    expect(early.message).toMatch(/läuft noch/);
    expect(expectOk(transition(b, "expire", actor("system"), ctx(EXPIRES_AT))).to).toBe("expired");
    expect(expectOk(transition(b, "expire", actor("system"), ctx(EXPIRES_AT + MS))).to).toBe(
      "expired",
    );
    expect(
      expectOk(transition(b, "expire", actor("system"), ctx(END_AT + 30 * DAY))).timestamps,
    ).toEqual({});
  });

  it("confirm und expire schließen sich zu jedem Zeitpunkt gegenseitig aus", () => {
    const b = booking("requested");
    for (const now of [EXPIRES_AT - MS, EXPIRES_AT, EXPIRES_AT + MS]) {
      const confirm = transition(b, "confirm", actor("owner"), ctx(now)).ok;
      const expire = transition(b, "expire", actor("system"), ctx(now)).ok;
      expect(confirm !== expire, `now=${now}`).toBe(true);
    }
  });
});

describe("cancel bei bestätigter Buchung", () => {
  it.each(["renter", "owner"] as const)(
    "%s: bis 1 ms vor Mietbeginn ok, ab Mietbeginn nicht",
    (type) => {
      const b = booking("confirmed");
      const ok = expectOk(transition(b, "cancel", actor(type), ctx(START_AT - MS)));
      expect(ok.timestamps).toEqual({ cancelled_at: at(START_AT - MS).toISOString() });
      const atStart = expectError(
        transition(b, "cancel", actor(type), ctx(START_AT)),
        "guard_failed",
      );
      expect(atStart.message).toMatch(/Support/);
      expectError(transition(b, "cancel", actor(type), ctx(START_AT + MS)), "guard_failed");
    },
  );

  it("admin darf auch nach Mietbeginn stornieren, solange nicht abgeholt", () => {
    const b = booking("confirmed");
    for (const now of [START_AT - MS, START_AT, START_AT + MS, END_AT + DAY]) {
      expect(expectOk(transition(b, "cancel", actor("admin"), ctx(now))).to).toBe("cancelled");
    }
  });

  it("nach der Abholung (active) kann niemand mehr stornieren", () => {
    for (const type of ACTOR_TYPES) {
      expectError(
        transition(booking("active"), "cancel", actor(type), ctx(START_AT + HOUR)),
        "invalid_transition",
      );
    }
  });

  it("unabhängig von der Antwortfrist", () => {
    // bestätigte Buchung: abgelaufene Antwortfrist spielt keine Rolle mehr
    expectOk(transition(booking("confirmed"), "cancel", actor("renter"), ctx(EXPIRES_AT + HOUR)));
  });
});

describe("start_rental (Abhol-Check fertig)", () => {
  const b = booking("confirmed");

  it("Standard: frühestens 30 Minuten vor Mietbeginn", () => {
    expect(DEFAULT_PICKUP_EARLY_MINUTES).toBe(30);
    const windowOpens = START_AT - 30 * MIN;
    const early = expectError(
      transition(b, "start_rental", actor("renter"), ctx(windowOpens - MS)),
      "guard_failed",
    );
    expect(early.message).toMatch(/30 Minuten/);
    const ok = expectOk(transition(b, "start_rental", actor("renter"), ctx(windowOpens)));
    expect(ok).toMatchObject({ from: "confirmed", to: "active", event: "start_rental" });
    expect(ok.timestamps).toEqual({ picked_up_at: at(windowOpens).toISOString() });
    expectOk(transition(b, "start_rental", actor("renter"), ctx(windowOpens + MS)));
    expectOk(transition(b, "start_rental", actor("admin"), ctx(START_AT + 2 * HOUR)));
  });

  it("eigener Vorlauf (pickupEarlyMinutes)", () => {
    expectError(
      transition(
        b,
        "start_rental",
        actor("renter"),
        ctx(START_AT - 60 * MIN - MS, { pickupEarlyMinutes: 60 }),
      ),
      "guard_failed",
    );
    expectOk(
      transition(
        b,
        "start_rental",
        actor("renter"),
        ctx(START_AT - 60 * MIN, { pickupEarlyMinutes: 60 }),
      ),
    );

    const zero = expectError(
      transition(b, "start_rental", actor("renter"), ctx(START_AT - MS, { pickupEarlyMinutes: 0 })),
      "guard_failed",
    );
    expect(zero.message).toMatch(/ab Mietbeginn/);
    expectOk(
      transition(b, "start_rental", actor("renter"), ctx(START_AT, { pickupEarlyMinutes: 0 })),
    );
  });

  it("ungültiger Vorlauf ist ein Programmierfehler", () => {
    for (const pickupEarlyMinutes of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        transition(b, "start_rental", actor("renter"), ctx(START_AT, { pickupEarlyMinutes })),
      ).toThrow(RangeError);
    }
  });

  it.each([false, undefined])(
    "ohne abgeschlossenen Abhol-Check (%s) nicht möglich",
    (pickupInspectionComplete) => {
      const result = expectError(
        transition(b, "start_rental", actor("renter"), ctx(START_AT, { pickupInspectionComplete })),
        "guard_failed",
      );
      expect(result.message).toMatch(/Abhol-Check/);
    },
  );
});

describe("return_vehicle", () => {
  it.each([
    [true, true],
    [false, false],
    [undefined, false],
  ] as const)("returnInspectionComplete=%s → ok=%s", (returnInspectionComplete, ok) => {
    const result = transition(
      booking("active"),
      "return_vehicle",
      actor("renter"),
      ctx(END_AT, { returnInspectionComplete }),
    );
    if (ok) expect(expectOk(result).timestamps).toEqual({ returned_at: at(END_AT).toISOString() });
    else expect(expectError(result, "guard_failed").message).toMatch(/Rückgabe-Check/);
  });

  it("ist nicht zeitabhängig (auch nach Mietende möglich)", () => {
    expectOk(
      transition(booking("active"), "return_vehicle", actor("admin"), ctx(END_AT + 3 * DAY)),
    );
    expectOk(
      transition(booking("active"), "return_vehicle", actor("renter"), ctx(START_AT - HOUR)),
    );
  });
});

describe("start_service", () => {
  it.each(["partner", "admin", "system"] as const)("%s darf ohne weitere Bedingung", (type) => {
    const result = expectOk(
      transition(booking("returned"), "start_service", actor(type), failingCtx(END_AT)),
    );
    expect(result.to).toBe("in_service");
    expect(result.timestamps).toEqual({});
  });
});

describe("complete_service", () => {
  it.each([
    [true, true],
    [false, false],
    [undefined, false],
  ] as const)("servicePhotosComplete=%s → ok=%s", (servicePhotosComplete, ok) => {
    const result = transition(
      booking("in_service"),
      "complete_service",
      actor("partner"),
      ctx(END_AT, { servicePhotosComplete }),
    );
    if (ok) expect(expectOk(result).timestamps).toEqual({ ready_at: at(END_AT).toISOString() });
    else expect(expectError(result, "guard_failed").message).toMatch(/Service-Fotos/);
  });
});

describe("close", () => {
  it("nur ohne offene Schadensfälle und mit abgerechneter Kaution", () => {
    const b = booking("ready");
    const ok = expectOk(transition(b, "close", actor("system"), ctx(END_AT)));
    expect(ok.timestamps).toEqual({ completed_at: at(END_AT).toISOString() });

    for (const openDamageCases of [1, 2, -1, Number.NaN, undefined]) {
      const result = expectError(
        transition(b, "close", actor("system"), ctx(END_AT, { openDamageCases })),
        "guard_failed",
      );
      expect(result.message).toMatch(/Schadensfälle/);
    }
    for (const depositSettled of [false, undefined]) {
      const result = expectError(
        transition(b, "close", actor("admin"), ctx(END_AT, { depositSettled })),
        "guard_failed",
      );
      expect(result.message).toMatch(/Kaution/);
    }
  });
});

// ---------------------------------------------------------------------------
// Robustheit
// ---------------------------------------------------------------------------
describe("transition – Robustheit", () => {
  it("Fehlermeldungen sind deutsch und nennen Ereignis, Status bzw. Rolle", () => {
    const invalid = expectError(
      transition(booking("completed"), "confirm", actor("owner"), ctx(REQUESTED_AT)),
      "invalid_transition",
    );
    expect(invalid.message).toBe("„Bestätigen“ ist im Status „Abgeschlossen“ nicht möglich.");

    const forbidden = expectError(
      transition(booking("requested"), "confirm", actor("renter"), ctx(REQUESTED_AT)),
      "forbidden_actor",
    );
    expect(forbidden.message).toBe("„Bestätigen“ ist für die Rolle „Mieter“ nicht erlaubt.");
  });

  it("Prüfreihenfolge: Übergang → Rolle → Bedingungen", () => {
    // falsches Ereignis gewinnt vor falscher Rolle
    expectError(
      transition(booking("active"), "confirm", actor("renter"), failingCtx(END_AT)),
      "invalid_transition",
    );
    // falsche Rolle gewinnt vor verletzter Bedingung
    expectError(
      transition(booking("ready"), "close", actor("renter"), failingCtx(END_AT)),
      "forbidden_actor",
    );
  });

  it("unbekannte Werte zur Laufzeit werden abgewiesen statt zu crashen", () => {
    const now = ctx(REQUESTED_AT);
    for (const event of ["foo", "__proto__", "constructor", "toString", ""]) {
      expectError(
        transition(booking("requested"), event as BookingEvent, actor("owner"), now),
        "invalid_transition",
      );
    }
    for (const status of ["bogus", "__proto__"]) {
      expectError(
        transition(booking(status as BookingStatus), "confirm", actor("owner"), now),
        "invalid_transition",
      );
    }
    for (const type of ["hacker", "__proto__", ""]) {
      expectError(
        transition(booking("requested"), "confirm", { type: type as ActorType }, now),
        "forbidden_actor",
      );
    }
  });

  it("ungültige Zeitpunkte sind Programmierfehler", () => {
    const invalid = new Date(Number.NaN);
    expect(() =>
      transition(booking("requested"), "confirm", actor("owner"), { now: invalid }),
    ).toThrow(RangeError);
    for (const key of ["expiresAt", "startAt", "endAt"] as const) {
      expect(() =>
        transition(
          booking("requested", { [key]: invalid }),
          "confirm",
          actor("owner"),
          ctx(REQUESTED_AT),
        ),
      ).toThrow(RangeError);
    }
  });

  it("verändert Buchung und Kontext nicht", () => {
    const b = Object.freeze(booking("confirmed"));
    const c = Object.freeze(ctx(START_AT));
    const before = JSON.stringify([b, c]);
    expectOk(transition(b, "start_rental", actor("renter"), c));
    expect(JSON.stringify([b, c])).toBe(before);
  });

  it("die Akteur-ID beeinflusst das Ergebnis nicht (Zuordnung prüft der Aufrufer)", () => {
    const b = booking("requested");
    expectOk(transition(b, "confirm", { type: "owner" }, ctx(REQUESTED_AT)));
    expectOk(transition(b, "confirm", { type: "owner", id: "x" }, ctx(REQUESTED_AT)));
  });
});

describe("allowedEvents", () => {
  const b = booking("requested");

  it("Anfrage vor Fristende", () => {
    const now = ctx(REQUESTED_AT + HOUR);
    expect(allowedEvents(b, actor("owner"), now)).toEqual(["confirm", "decline"]);
    expect(allowedEvents(b, actor("renter"), now)).toEqual(["withdraw"]);
    expect(allowedEvents(b, actor("admin"), now)).toEqual(["confirm", "decline", "cancel"]);
    expect(allowedEvents(b, actor("system"), now)).toEqual([]);
    expect(allowedEvents(b, actor("partner"), now)).toEqual([]);
  });

  it("Anfrage nach Fristende: nur noch expire (passt zu effectiveStatus)", () => {
    const now = ctx(EXPIRES_AT);
    for (const type of ["owner", "renter", "admin", "partner"] as const) {
      expect(allowedEvents(b, actor(type), now), type).toEqual([]);
    }
    expect(allowedEvents(b, actor("system"), now)).toEqual(["expire"]);
  });

  it("bestätigte Buchung vor und im Abholfenster", () => {
    const confirmed = booking("confirmed");
    expect(allowedEvents(confirmed, actor("renter"), ctx(START_AT - DAY))).toEqual(["cancel"]);
    expect(allowedEvents(confirmed, actor("renter"), ctx(START_AT - 10 * MIN))).toEqual([
      "cancel",
      "start_rental",
    ]);
    expect(allowedEvents(confirmed, actor("renter"), ctx(START_AT))).toEqual(["start_rental"]);
    expect(
      allowedEvents(confirmed, actor("renter"), ctx(START_AT, { pickupInspectionComplete: false })),
    ).toEqual([]);
    expect(allowedEvents(confirmed, actor("owner"), ctx(START_AT - 10 * MIN))).toEqual(["cancel"]);
    expect(allowedEvents(confirmed, actor("admin"), ctx(START_AT + HOUR))).toEqual([
      "cancel",
      "start_rental",
    ]);
  });

  it("Endzustände erlauben niemandem etwas", () => {
    for (const status of TERMINAL_STATUSES) {
      for (const type of ACTOR_TYPES) {
        for (const now of PROBE_TIMES) {
          expect(
            allowedEvents(booking(status), actor(type), ctx(now)),
            `${status}/${type}`,
          ).toEqual([]);
        }
      }
    }
  });

  it("stimmt mit transition überein", () => {
    for (const status of BOOKING_STATUSES) {
      for (const type of ACTOR_TYPES) {
        for (const now of PROBE_TIMES) {
          const c = ctx(now);
          const expected = BOOKING_EVENTS.filter(
            (e) => transition(booking(status), e, actor(type), c).ok,
          );
          expect(allowedEvents(booking(status), actor(type), c)).toEqual(expected);
        }
      }
    }
  });
});

describe("effectiveStatus", () => {
  it("Anfrage gilt ab Fristende als abgelaufen (Lazy-Auswertung)", () => {
    const b = booking("requested");
    expect(effectiveStatus(b, at(REQUESTED_AT))).toBe("requested");
    expect(effectiveStatus(b, at(EXPIRES_AT - MS))).toBe("requested");
    expect(effectiveStatus(b, at(EXPIRES_AT))).toBe("expired");
    expect(effectiveStatus(b, at(EXPIRES_AT + MS))).toBe("expired");
  });

  it("andere Status bleiben unverändert, auch lange nach der Frist", () => {
    for (const status of BOOKING_STATUSES.filter((s) => s !== "requested")) {
      expect(effectiveStatus(booking(status), at(EXPIRES_AT - MS))).toBe(status);
      expect(effectiveStatus(booking(status), at(END_AT + 365 * DAY))).toBe(status);
    }
  });

  it("braucht nur status und expiresAt", () => {
    expect(
      effectiveStatus({ status: "requested", expiresAt: at(EXPIRES_AT) }, at(EXPIRES_AT)),
    ).toBe("expired");
  });

  it("ungültige Zeitpunkte sind Programmierfehler", () => {
    expect(() => effectiveStatus(booking("requested"), new Date(Number.NaN))).toThrow(RangeError);
    expect(() =>
      effectiveStatus(booking("requested", { expiresAt: new Date("x") }), at(REQUESTED_AT)),
    ).toThrow(RangeError);
  });
});

describe("computeExpiresAt", () => {
  const requestedAt = at(REQUESTED_AT);

  it("Frist = Anfrage + Antwortstunden, wenn der Mietbeginn später liegt", () => {
    expect(computeExpiresAt(requestedAt, at(START_AT), 24).toISOString()).toBe(
      at(REQUESTED_AT + 24 * HOUR).toISOString(),
    );
    expect(computeExpiresAt(requestedAt, at(START_AT), 1.5).getTime()).toBe(
      REQUESTED_AT + 90 * MIN,
    );
  });

  it("höchstens bis Mietbeginn", () => {
    expect(computeExpiresAt(requestedAt, at(REQUESTED_AT + 10 * HOUR), 24).getTime()).toBe(
      REQUESTED_AT + 10 * HOUR,
    );
    expect(computeExpiresAt(requestedAt, at(REQUESTED_AT + MS), 24).getTime()).toBe(
      REQUESTED_AT + MS,
    );
  });

  it("Grenze: Mietbeginn genau am Fristende bzw. 1 ms davor/danach", () => {
    const deadline = REQUESTED_AT + 24 * HOUR;
    expect(computeExpiresAt(requestedAt, at(deadline), 24).getTime()).toBe(deadline);
    expect(computeExpiresAt(requestedAt, at(deadline - MS), 24).getTime()).toBe(deadline - MS);
    expect(computeExpiresAt(requestedAt, at(deadline + MS), 24).getTime()).toBe(deadline);
  });

  it("rechnet echte Stunden, auch über die Zeitumstellung", () => {
    // Nacht vom 28. auf den 29.03.2026: in Berlin nur 23 Stunden Wanduhrzeit
    const req = new Date("2026-03-28T12:00:00.000Z");
    expect(computeExpiresAt(req, new Date("2026-04-10T08:00:00.000Z"), 24).toISOString()).toBe(
      "2026-03-29T12:00:00.000Z",
    );
  });

  it("liefert ein neues Date-Objekt", () => {
    const startAt = at(REQUESTED_AT + HOUR);
    const result = computeExpiresAt(requestedAt, startAt, 24);
    expect(result).not.toBe(startAt);
    expect(result).not.toBe(requestedAt);
  });

  it("wirft, wenn der Mietbeginn nicht nach der Anfrage liegt", () => {
    expect(() => computeExpiresAt(requestedAt, at(REQUESTED_AT), 24)).toThrow(RangeError);
    expect(() => computeExpiresAt(requestedAt, at(REQUESTED_AT - MS), 24)).toThrow(RangeError);
    expect(() => computeExpiresAt(requestedAt, at(REQUESTED_AT - DAY), 24)).toThrow(RangeError);
  });

  it("wirft bei unsinnigen Antwortstunden oder ungültigen Zeitpunkten", () => {
    for (const hours of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => computeExpiresAt(requestedAt, at(START_AT), hours), String(hours)).toThrow(
        RangeError,
      );
    }
    expect(() => computeExpiresAt(new Date("x"), at(START_AT), 24)).toThrow(RangeError);
    expect(() => computeExpiresAt(requestedAt, new Date("x"), 24)).toThrow(RangeError);
  });
});

describe("resolveActor", () => {
  const parties = { renterId: "r", ownerId: "o" };

  it("Beteiligte handeln in ihrer Rolle – auch wenn sie Admin sind", () => {
    expect(resolveActor(parties, { id: "r" })).toEqual({ type: "renter", id: "r" });
    expect(resolveActor(parties, { id: "o", isAdmin: true })).toEqual({ type: "owner", id: "o" });
    expect(resolveActor(parties, { id: "r", isAdmin: true })).toEqual({ type: "renter", id: "r" });
  });

  it("fremde Admins handeln als admin, fremde Nutzer gar nicht", () => {
    expect(resolveActor(parties, { id: "a", isAdmin: true })).toEqual({ type: "admin", id: "a" });
    expect(resolveActor(parties, { id: "x" })).toBeNull();
    expect(resolveActor(parties, { id: "x", isAdmin: false })).toBeNull();
    expect(resolveActor(parties, null)).toBeNull();
    expect(resolveActor(parties, undefined)).toBeNull();
    expect(resolveActor(parties, { id: "" })).toBeNull();
  });
});

describe("Typen, Listen und Texte", () => {
  it("ACTOR_TYPES deckt das DB-Enum actor_type exakt ab", () => {
    expect([...ACTOR_TYPES]).toEqual([...Constants.public.Enums.actor_type]);
  });

  it("isBookingEvent", () => {
    for (const event of BOOKING_EVENTS) expect(isBookingEvent(event)).toBe(true);
    for (const value of ["", "CONFIRM", "toString", null, 1])
      expect(isBookingEvent(value)).toBe(false);
  });

  it("Labels und Beschreibungen sind vollständig", () => {
    expect(Object.keys(EVENT_LABELS).sort()).toEqual([...BOOKING_EVENTS].sort());
    expect(Object.keys(ACTOR_LABELS).sort()).toEqual([...ACTOR_TYPES].sort());
    const usedGuards = new Set(TRANSITIONS.flatMap((r) => r.guards));
    expect(Object.keys(GUARD_DESCRIPTIONS).sort()).toEqual([...usedGuards].sort());
    for (const text of [
      ...Object.values(EVENT_LABELS),
      ...Object.values(ACTOR_LABELS),
      ...Object.values(GUARD_DESCRIPTIONS),
    ]) {
      expect(text.trim()).not.toBe("");
    }
  });
});
