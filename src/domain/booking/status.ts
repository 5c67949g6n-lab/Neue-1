import type { Database } from "@/lib/supabase/database.types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

/** Alle Buchungsstatus in Ablaufreihenfolge (deckt das DB-Enum `booking_status` exakt ab). */
export const BOOKING_STATUSES = [
  "requested",
  "declined",
  "expired",
  "withdrawn",
  "confirmed",
  "cancelled",
  "active",
  "returned",
  "in_service",
  "ready",
  "completed",
] as const satisfies readonly BookingStatus[];

export const STATUS_LABELS: Readonly<Record<BookingStatus, string>> = Object.freeze({
  requested: "Angefragt",
  declined: "Abgelehnt",
  expired: "Abgelaufen",
  withdrawn: "Zurückgezogen",
  confirmed: "Bestätigt",
  cancelled: "Storniert",
  active: "Miete läuft",
  returned: "Zurückgegeben",
  in_service: "Im Service",
  ready: "Bereit",
  completed: "Abgeschlossen",
});

/** Endzustände: von hier aus gibt es keinen Übergang mehr. */
export const TERMINAL_STATUSES = [
  "declined",
  "expired",
  "withdrawn",
  "cancelled",
  "completed",
] as const satisfies readonly BookingStatus[];

/**
 * Status, die das Auto im Mietzeitraum blockieren. Muss exakt der WHERE-Bedingung des
 * Exclusion-Constraints `bookings_no_overlap` entsprechen (per Test gegen die Migration geprüft).
 */
export const BLOCKING_STATUSES = [
  "confirmed",
  "active",
  "returned",
  "in_service",
  "ready",
  "completed",
] as const satisfies readonly BookingStatus[];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: BookingStatus): boolean {
  return (TERMINAL_STATUSES as readonly BookingStatus[]).includes(status);
}

export function isBlockingStatus(status: BookingStatus): boolean {
  return (BLOCKING_STATUSES as readonly BookingStatus[]).includes(status);
}
