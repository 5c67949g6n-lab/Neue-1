// Hilfen für Datenbank-Sicherheitstests gegen die lokale Supabase-Datenbank.
//
// Jeder Test läuft in withTx() – die Transaktion wird am Ende immer zurückgerollt,
// es bleibt nichts in der Datenbank zurück. Fixtures legen Daten als postgres an
// (BYPASSRLS); geprüft wird danach mit asUser()/asAnon() in der Rolle des Clients.

import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { expect } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type BookingStatus = Enums["booking_status"];
export type ListingStatus = Enums["listing_status"];
export type VerificationStatus = Enums["verification_status"];
export type DocumentKind = Enums["document_kind"];

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !/@(127\.0\.0\.1|localhost)[:/]/.test(connectionString)) {
  throw new Error("DB-Tests laufen nur gegen die lokale Datenbank (DATABASE_URL in .env.local)");
}

export const pool = new pg.Pool({ connectionString, max: 2 });

export type Db = pg.PoolClient;
type Params = unknown[];
type Row = Record<string, unknown>;

export function closePool() {
  return pool.end();
}

/** Führt fn in einer Transaktion aus, die danach immer zurückgerollt wird. */
export async function withTx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  let healthy = true;
  try {
    await db.query("begin");
    return await fn(db);
  } finally {
    await db.query("rollback").catch(() => {
      healthy = false;
    });
    db.release(!healthy);
  }
}

// ---------------------------------------------------------------------------
// Rollen (wie PostgREST: Rolle + JWT-Claims, nur für die laufende Transaktion)
// ---------------------------------------------------------------------------

export async function asUser(db: Db, userId: string) {
  await db.query(
    "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
    [userId],
  );
  await db.query("set local role authenticated");
}

export async function asAnon(db: Db) {
  await db.query(
    "select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true)",
  );
  await db.query("set local role anon");
}

export async function asPostgres(db: Db) {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims', '', true)");
}

// ---------------------------------------------------------------------------
// Abfragen und Erwartungen
// ---------------------------------------------------------------------------

export type Attempt =
  | { ok: true; rowCount: number; rows: Row[] }
  | { ok: false; code: string | undefined; message: string };

/** Führt fn in einem Savepoint aus – ein Fehler bricht die Transaktion nicht ab. */
export async function attemptFn<T>(
  db: Db,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; code: string | undefined; message: string }> {
  await db.query("savepoint attempt");
  try {
    const value = await fn();
    await db.query("release savepoint attempt");
    return { ok: true, value };
  } catch (error) {
    await db.query("rollback to savepoint attempt");
    await db.query("release savepoint attempt");
    const e = error as pg.DatabaseError;
    return { ok: false, code: e.code, message: e.message };
  }
}

/** Führt sql in einem Savepoint aus – ein Fehler bricht die Transaktion nicht ab. */
export async function attempt(db: Db, sql: string, params: Params = []): Promise<Attempt> {
  const result = await attemptFn(db, () => db.query(sql, params));
  return result.ok
    ? { ok: true, rowCount: result.value.rowCount ?? 0, rows: result.value.rows }
    : result;
}

function describeAttempt(result: Attempt) {
  return result.ok
    ? `kein Fehler (${result.rowCount} Zeile(n))`
    : `${result.code}: ${result.message}`;
}

/** Erwartet einen Postgres-Fehler mit genau diesem Code (z. B. 42501, 23P01, P0001). */
export async function expectPgError(db: Db, code: string, sql: string, params: Params = []) {
  const result = await attempt(db, sql, params);
  expect(result.ok ? null : result.code, `${sql.trim()}\n→ ${describeAttempt(result)}`).toBe(code);
}

/** Wie expectPgError, aber für eine beliebige Abfolge (z. B. einen Fixture-Helfer). */
export async function expectPgErrorFrom(db: Db, code: string, fn: () => Promise<unknown>) {
  const result = await attemptFn(db, fn);
  expect(
    result.ok ? null : result.code,
    result.ok ? "kein Fehler" : `${result.code}: ${result.message}`,
  ).toBe(code);
}

/** Erwartet, dass fn fehlerfrei durchläuft (Gegenprobe zu expectPgErrorFrom). */
export async function expectOkFrom<T>(db: Db, fn: () => Promise<T>) {
  const result = await attemptFn(db, fn);
  expect(result.ok ? null : `${result.code}: ${result.message}`).toBeNull();
  return result.ok ? result.value : undefined;
}

/** Erwartet "permission denied" bzw. "new row violates row-level security policy" (42501). */
export function expectDenied(db: Db, sql: string, params: Params = []) {
  return expectPgError(db, "42501", sql, params);
}

/**
 * Erwartet, dass sql fehlerfrei läuft und genau n Zeilen liefert bzw. betrifft.
 * RLS-gefilterte SELECT/UPDATE/DELETE liefern 0 Zeilen statt eines Fehlers.
 */
export async function expectRows(db: Db, n: number, sql: string, params: Params = []) {
  const result = await attempt(db, sql, params);
  expect(result.ok ? result.rowCount : null, `${sql.trim()}\n→ ${describeAttempt(result)}`).toBe(n);
  return result.ok ? result.rows : [];
}

export async function rows<T extends Row = Row>(db: Db, sql: string, params: Params = []) {
  return (await db.query(sql, params)).rows as T[];
}

/** Erster Wert der einzigen Ergebniszeile, z. B. für "select public.is_admin()". */
export async function scalar<T = unknown>(db: Db, sql: string, params: Params = []) {
  const row = await one(db, sql, params);
  return Object.values(row)[0] as T;
}

export async function one<T extends Row = Row>(db: Db, sql: string, params: Params = []) {
  const result = await rows<T>(db, sql, params);
  if (result.length !== 1) throw new Error(`Erwartet genau 1 Zeile, erhalten ${result.length}`);
  return result[0];
}

// ---------------------------------------------------------------------------
// Fixtures (als postgres aufrufen – RLS wird dabei umgangen)
// ---------------------------------------------------------------------------

/** Legt ein Auth-Konto an; der Trigger erzeugt profiles + profile_private. */
export async function createUser(
  db: Db,
  opts: { name?: string; admin?: boolean; suspended?: boolean } = {},
) {
  const id = randomUUID();
  await db.query(
    `insert into auth.users
       (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             $2, $3, '{"provider":"email","providers":["email"]}', now(), now())`,
    [id, `db-test-${id}@standzeit.test`, { display_name: opts.name ?? "DB-Test" }],
  );
  if (opts.admin) await makeAdmin(db, id);
  if (opts.suspended) await suspendUser(db, id);
  return id;
}

export async function makeAdmin(db: Db, userId: string) {
  await db.query("update public.profile_private set is_admin = true where user_id = $1", [userId]);
}

export async function suspendUser(db: Db, userId: string) {
  await db.query(
    "update public.profile_private set status = 'suspended', suspended_reason = 'DB-Test' where user_id = $1",
    [userId],
  );
}

/** Fahrzeug inkl. privater Daten (Kennzeichen). */
export async function createVehicle(db: Db, ownerId: string) {
  const { id } = await one<{ id: string }>(
    db,
    `insert into public.vehicles (owner_id, make, model, year, fuel, transmission, seats, vehicle_class)
     values ($1, 'VW', 'Golf', 2021, 'petrol', 'manual', 5, 'compact')
     returning id`,
    [ownerId],
  );
  await db.query(
    "insert into public.vehicle_private (vehicle_id, license_plate, vin) values ($1, 'S-ZT 1234', 'WVWZZZ1KZAW000001')",
    [id],
  );
  return id;
}

/** Inserat inkl. genauer Adresse (listing_private_details). */
export async function createListing(
  db: Db,
  opts: { ownerId: string; vehicleId: string; status?: ListingStatus },
) {
  const { id } = await one<{ id: string }>(
    db,
    `insert into public.listings (owner_id, vehicle_id, status, title, price_day_cents)
     values ($1, $2, $3, 'Golf für die Urlaubszeit', 3900)
     returning id`,
    [opts.ownerId, opts.vehicleId, opts.status ?? "active"],
  );
  await db.query(
    `insert into public.listing_private_details (listing_id, street, postal_code, city, access_notes)
     values ($1, 'Geheimweg 1', '70173', 'Stuttgart', 'Tiefgarage, Platz 12')`,
    [id],
  );
  return id;
}

/** Mit ownerId: privater "Zuhause"-Punkt; ohne: öffentlicher Punkt (z. B. Flughafen). */
export async function createHandoverPoint(db: Db, opts: { ownerId?: string } = {}) {
  const { id } = opts.ownerId
    ? await one<{ id: string }>(
        db,
        `insert into public.handover_points (type, name, street, postal_code, is_public, owner_id)
         values ('owner_home', 'Bei mir zu Hause', 'Geheimweg 1', '70173', false, $1)
         returning id`,
        [opts.ownerId],
      )
    : await one<{ id: string }>(
        db,
        `insert into public.handover_points (type, name, is_public)
         values ('airport', 'Flughafen Stuttgart (Test)', true)
         returning id`,
      );
  return id;
}

export async function linkHandoverPoint(db: Db, listingId: string, pointId: string) {
  await db.query(
    "insert into public.listing_handover_points (listing_id, handover_point_id) values ($1, $2)",
    [listingId, pointId],
  );
}

export async function createBooking(
  db: Db,
  opts: {
    listingId: string;
    vehicleId: string;
    ownerId: string;
    renterId: string;
    pickupPointId: string;
    returnPointId?: string;
    status?: BookingStatus;
    /** Zeitraum [from, to) als ISO-Datum */
    from?: string;
    to?: string;
  },
) {
  const { id } = await one<{ id: string }>(
    db,
    `insert into public.bookings
       (listing_id, vehicle_id, owner_id, renter_id, status, rental_period,
        pickup_point_id, return_point_id, expires_at, price_snapshot, cancellation_snapshot,
        rent_cents, total_cents)
     values ($1, $2, $3, $4, $5, tstzrange($6::timestamptz, $7::timestamptz, '[)'),
             $8, $9, now() + interval '1 day',
             '{"price_day_cents": 3900, "days": 14}', '{"slug": "moderat"}',
             54600, 54600)
     returning id`,
    [
      opts.listingId,
      opts.vehicleId,
      opts.ownerId,
      opts.renterId,
      opts.status ?? "requested",
      opts.from ?? "2027-03-01T10:00:00Z",
      opts.to ?? "2027-03-15T10:00:00Z",
      opts.pickupPointId,
      opts.returnPointId ?? opts.pickupPointId,
    ],
  );
  return id;
}

export async function setBookingStatus(db: Db, bookingId: string, status: BookingStatus) {
  await db.query("update public.bookings set status = $2 where id = $1", [bookingId, status]);
}

export async function createInspection(db: Db, bookingId: string, kind = "pickup") {
  const { id } = await one<{ id: string }>(
    db,
    "insert into public.inspections (booking_id, kind) values ($1, $2) returning id",
    [bookingId, kind],
  );
  return id;
}

/** deleteAfter als SQL-Ausdruck, z. B. "now() + interval '1 day'" oder "null". */
export async function createInspectionPhoto(
  db: Db,
  inspectionId: string,
  opts: { deleteAfterSql?: string } = {},
) {
  const { id } = await one<{ id: string }>(
    db,
    `insert into public.inspection_photos
       (inspection_id, perspective, storage_path, sha256, mime_type, captured_at, latitude, longitude, delete_after)
     values ($1, 'front', $2, $3, 'image/jpeg', now() - interval '1 minute', 48.69, 9.19,
             ${opts.deleteAfterSql ?? "now() + interval '90 days'"})
     returning id`,
    [inspectionId, `test/${randomUUID()}.jpg`, randomHash()],
  );
  return id;
}

export async function createVerification(
  db: Db,
  userId: string,
  opts: { kind?: "renter" | "owner"; status?: VerificationStatus } = {},
) {
  const { id } = await one<{ id: string }>(
    db,
    `insert into public.verifications (user_id, kind, status, date_of_birth_enc, submitted_at)
     values ($1, $2, $3, 'v1.dGVzdA.dGVzdA.dGVzdA', now())
     returning id`,
    [userId, opts.kind ?? "renter", opts.status ?? "pending"],
  );
  return id;
}

export async function createSecureDocument(
  db: Db,
  opts: { ownerId: string; verificationId?: string; kind?: DocumentKind },
) {
  const fileId = randomUUID();
  const { id } = await one<{ id: string }>(
    db,
    `insert into public.secure_documents
       (owner_id, kind, verification_id, storage_path, sha256, mime_type, size_bytes, key_id)
     values ($1, $2, $3, $4, $5, 'image/jpeg', 12345, 'v1')
     returning id`,
    [
      opts.ownerId,
      opts.kind ?? "id_front",
      opts.verificationId ?? null,
      `${opts.ownerId}/${opts.verificationId ?? "none"}/${opts.kind ?? "id_front"}/${fileId}`,
      randomHash(),
    ],
  );
  return id;
}

export async function createMessage(db: Db, bookingId: string, senderId: string, body = "Hallo!") {
  const { id } = await one<{ id: string }>(
    db,
    "insert into public.messages (booking_id, sender_id, body) values ($1, $2, $3) returning id",
    [bookingId, senderId, body],
  );
  return id;
}

/**
 * Standard-Szenario: Besitzerin mit aktivem Inserat, Mieter mit Buchung (Status wählbar),
 * ein unbeteiligter Nutzer und ein Admin.
 */
export async function createScenario(
  db: Db,
  opts: { bookingStatus?: BookingStatus; listingStatus?: ListingStatus } = {},
) {
  const owner = await createUser(db, { name: "Besitzerin" });
  const renter = await createUser(db, { name: "Mieter" });
  const stranger = await createUser(db, { name: "Fremder" });
  const admin = await createUser(db, { name: "Admin", admin: true });
  const vehicle = await createVehicle(db, owner);
  const listing = await createListing(db, {
    ownerId: owner,
    vehicleId: vehicle,
    status: opts.listingStatus ?? "active",
  });
  const homePoint = await createHandoverPoint(db, { ownerId: owner });
  const publicPoint = await createHandoverPoint(db);
  const booking = await createBooking(db, {
    listingId: listing,
    vehicleId: vehicle,
    ownerId: owner,
    renterId: renter,
    pickupPointId: homePoint,
    status: opts.bookingStatus ?? "requested",
  });
  return { owner, renter, stranger, admin, vehicle, listing, homePoint, publicPoint, booking };
}

export function randomHash() {
  return randomBytes(32).toString("hex");
}

/** Keybox am Fahrzeug, verwaltet vom Besitzer, plus Zugangs-Code für den Mieter. */
export async function createKeyAccessGrant(
  db: Db,
  opts: { vehicleId: string; managerId: string; bookingId: string; granteeId: string },
) {
  const { id: keyboxId } = await one<{ id: string }>(
    db,
    "insert into public.keyboxes (vehicle_id, managed_by, label) values ($1, $2, 'Keybox (Test)') returning id",
    [opts.vehicleId, opts.managerId],
  );
  const { id } = await one<{ id: string }>(
    db,
    `insert into public.key_access_grants
       (keybox_id, booking_id, grantee_user_id, purpose, code_enc, valid_from, valid_until)
     values ($1, $2, $3, 'renter', 'v1.dGVzdA.dGVzdA.dGVzdA', now(), now() + interval '14 days')
     returning id`,
    [keyboxId, opts.bookingId, opts.granteeId],
  );
  return { keyboxId, grantId: id };
}

export async function createServicePartner(db: Db) {
  const { id } = await one<{ id: string }>(
    db,
    "insert into public.service_partners (name, email) values ('Waschpark (Test)', 'partner@standzeit.test') returning id",
  );
  return id;
}

export async function createStripeEvent(db: Db) {
  const id = `evt_test_${randomUUID()}`;
  await db.query(
    "insert into public.stripe_events (id, type, payload) values ($1, 'payment_intent.succeeded', '{}')",
    [id],
  );
  return id;
}
