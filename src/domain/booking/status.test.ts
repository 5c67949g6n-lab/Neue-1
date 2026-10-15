import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/database.types";
import {
  BLOCKING_STATUSES,
  BOOKING_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  isBlockingStatus,
  isBookingStatus,
  isTerminalStatus,
} from "./status";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const BOOKINGS_MIGRATION = join(MIGRATIONS_DIR, "20261015000400_bookings_payments.sql");

/** Entfernt SQL-Zeilenkommentare, damit auskommentierter Code nicht mitgeparst wird. */
function readSql(path: string): string {
  return readFileSync(path, "utf8").replace(/--[^\n]*/g, "");
}

/** Liest die Werte einer Liste wie `'a', 'b', 'c'`. */
function parseQuotedList(list: string): string[] {
  return [...list.matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("BOOKING_STATUSES", () => {
  it("deckt das generierte DB-Enum exakt ab (gleiche Werte, gleiche Reihenfolge)", () => {
    expect([...BOOKING_STATUSES]).toEqual([...Constants.public.Enums.booking_status]);
  });

  it("deckt das Enum aus der Migration exakt ab", () => {
    const sql = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readSql(join(MIGRATIONS_DIR, f)))
      .join("\n");
    const match = /create type public\.booking_status as enum \(([^)]*)\)/i.exec(sql);
    expect(match, "Enum booking_status in den Migrationen nicht gefunden").not.toBeNull();
    expect([...BOOKING_STATUSES]).toEqual(parseQuotedList(match![1]));
  });

  it("enthält keine Duplikate", () => {
    expect(new Set(BOOKING_STATUSES).size).toBe(BOOKING_STATUSES.length);
  });

  it("isBookingStatus erkennt nur echte Status", () => {
    for (const status of BOOKING_STATUSES) expect(isBookingStatus(status)).toBe(true);
    for (const value of ["", "REQUESTED", "pending", "toString", null, undefined, 1, {}]) {
      expect(isBookingStatus(value)).toBe(false);
    }
  });
});

describe("STATUS_LABELS", () => {
  it("hat für jeden Status ein deutsches Label und sonst nichts", () => {
    expect(sorted(Object.keys(STATUS_LABELS))).toEqual(sorted(BOOKING_STATUSES));
    for (const label of Object.values(STATUS_LABELS)) expect(label.trim()).not.toBe("");
  });

  it("vergibt jedes Label nur einmal", () => {
    const labels = Object.values(STATUS_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("ist unveränderlich", () => {
    expect(Object.isFrozen(STATUS_LABELS)).toBe(true);
  });
});

describe("TERMINAL_STATUSES", () => {
  it("sind genau die Endzustände", () => {
    expect(sorted(TERMINAL_STATUSES)).toEqual(
      sorted(["declined", "expired", "withdrawn", "cancelled", "completed"]),
    );
  });

  it("isTerminalStatus passt zur Liste", () => {
    for (const status of BOOKING_STATUSES) {
      expect(isTerminalStatus(status)).toBe(
        (TERMINAL_STATUSES as readonly string[]).includes(status),
      );
    }
  });
});

describe("BLOCKING_STATUSES", () => {
  const sql = readSql(BOOKINGS_MIGRATION);
  const constraint =
    /constraint\s+bookings_no_overlap\s+exclude\s+using\s+gist\s*\([\s\S]*?\)\s*where\s*\(\s*status\s+in\s*\(([^)]*)\)\s*\)/i.exec(
      sql,
    );

  it("findet den Exclusion-Constraint in der Migration", () => {
    expect(
      constraint,
      "bookings_no_overlap mit WHERE status in (...) nicht gefunden",
    ).not.toBeNull();
  });

  it("entspricht exakt der WHERE-Bedingung von bookings_no_overlap", () => {
    const fromMigration = parseQuotedList(constraint![1]);
    expect(fromMigration.length).toBeGreaterThan(0);
    expect(sorted(BLOCKING_STATUSES)).toEqual(sorted(fromMigration));
  });

  it("nennt in der Migration nur echte Status", () => {
    for (const status of parseQuotedList(constraint![1])) {
      expect(isBookingStatus(status), status).toBe(true);
    }
  });

  it("isBlockingStatus passt zur Liste", () => {
    for (const status of BOOKING_STATUSES) {
      expect(isBlockingStatus(status)).toBe(
        (BLOCKING_STATUSES as readonly string[]).includes(status),
      );
    }
  });

  it("Anfragen und abgebrochene Buchungen blockieren das Auto nicht", () => {
    for (const status of ["requested", "declined", "expired", "withdrawn", "cancelled"] as const) {
      expect(isBlockingStatus(status), status).toBe(false);
    }
  });
});
