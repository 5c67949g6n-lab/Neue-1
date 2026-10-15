// Buchungen: Sichtbarkeit, nur serverseitiges Schreiben, Doppelbuchungsschutz, Snapshots
import { afterAll, describe, expect, test } from "vitest";
import {
  asAnon,
  asPostgres,
  asUser,
  closePool,
  createBooking,
  createListing,
  createScenario,
  createVehicle,
  expectDenied,
  expectOkFrom,
  expectPgError,
  expectPgErrorFrom,
  expectRows,
  one,
  withTx,
  type Db,
} from "./helpers";

afterAll(closePool);

describe("bookings: Sichtbarkeit und Schreibrechte", () => {
  test("nur Mieter, Besitzer und Admin sehen eine Buchung", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });
      const sql = "select id from public.bookings where id = $1";

      for (const user of [s.renter, s.owner, s.admin]) {
        await asUser(db, user);
        await expectRows(db, 1, sql, [s.booking]);
      }
      await asUser(db, s.stranger);
      await expectRows(db, 0, sql, [s.booking]);
      await asAnon(db);
      await expectRows(db, 0, sql, [s.booking]);
    }));

  test("authenticated kann Buchungen weder anlegen noch ändern noch löschen", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "requested" });

      for (const user of [s.renter, s.owner, s.admin]) {
        await asUser(db, user);
        await expectDenied(
          db,
          `insert into public.bookings
             (listing_id, vehicle_id, owner_id, renter_id, status, rental_period,
              pickup_point_id, return_point_id, expires_at, price_snapshot, cancellation_snapshot)
           values ($1, $2, $3, $4, 'confirmed', tstzrange('2027-06-01', '2027-06-10'),
                   $5, $5, now() + interval '1 day', '{}', '{}')`,
          [s.listing, s.vehicle, s.owner, s.renter, s.publicPoint],
        );
        await expectDenied(db, "update public.bookings set status = 'confirmed' where id = $1", [
          s.booking,
        ]);
        await expectDenied(db, "update public.bookings set total_cents = 1 where id = $1", [
          s.booking,
        ]);
        await expectDenied(db, "delete from public.bookings where id = $1", [s.booking]);
        await expectDenied(
          db,
          "insert into public.booking_events (booking_id, to_status, actor_type) values ($1, 'confirmed', 'owner')",
          [s.booking],
        );
      }

      await asPostgres(db);
      const row = await one(db, "select status, total_cents from public.bookings where id = $1", [
        s.booking,
      ]);
      expect(row).toEqual({ status: "requested", total_cents: 54600 });
    }));
});

describe("bookings: Exclusion-Constraint gegen Doppelbuchung", () => {
  /** Zweite Buchung für dasselbe Fahrzeug (als postgres). */
  function book(
    db: Db,
    s: Awaited<ReturnType<typeof createScenario>>,
    opts: { status: Parameters<typeof createBooking>[1]["status"]; from: string; to: string },
  ) {
    return createBooking(db, {
      listingId: s.listing,
      vehicleId: s.vehicle,
      ownerId: s.owner,
      renterId: s.stranger,
      pickupPointId: s.publicPoint,
      ...opts,
    });
  }

  // Szenario-Buchung: [2027-03-01 10:00, 2027-03-15 10:00)
  test("zwei bestätigte überlappende Buchungen desselben Fahrzeugs → 23P01", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });

      await expectPgErrorFrom(db, "23P01", () =>
        book(db, s, {
          status: "confirmed",
          from: "2027-03-10T10:00:00Z",
          to: "2027-03-20T10:00:00Z",
        }),
      );
      // auch laufende Mieten blockieren
      await expectPgErrorFrom(db, "23P01", () =>
        book(db, s, { status: "active", from: "2027-02-20T10:00:00Z", to: "2027-03-02T10:00:00Z" }),
      );
      // vollständig enthaltener Zeitraum
      await expectPgErrorFrom(db, "23P01", () =>
        book(db, s, {
          status: "confirmed",
          from: "2027-03-05T10:00:00Z",
          to: "2027-03-06T10:00:00Z",
        }),
      );
    }));

  test("Bestätigen einer Anfrage, die eine bestätigte Buchung überlappt → 23P01", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });
      const request = await book(db, s, {
        status: "requested",
        from: "2027-03-14T10:00:00Z",
        to: "2027-03-21T10:00:00Z",
      });

      await expectPgError(
        db,
        "23P01",
        "update public.bookings set status = 'confirmed' where id = $1",
        [request],
      );
    }));

  test("überlappende Anfragen (requested) sind erlaubt", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });

      for (let i = 0; i < 2; i++) {
        await expectOkFrom(db, () =>
          book(db, s, {
            status: "requested",
            from: "2027-03-10T10:00:00Z",
            to: "2027-03-20T10:00:00Z",
          }),
        );
      }
    }));

  test("direkt aneinandergrenzende Zeiträume [) sind erlaubt", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });

      await expectOkFrom(db, () =>
        book(db, s, {
          status: "confirmed",
          from: "2027-03-15T10:00:00Z",
          to: "2027-03-29T10:00:00Z",
        }),
      );
      await expectOkFrom(db, () =>
        book(db, s, {
          status: "confirmed",
          from: "2027-02-15T10:00:00Z",
          to: "2027-03-01T10:00:00Z",
        }),
      );
    }));

  test("anderes Fahrzeug im selben Zeitraum ist erlaubt", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });
      const otherVehicle = await createVehicle(db, s.owner);
      const otherListing = await createListing(db, { ownerId: s.owner, vehicleId: otherVehicle });

      await expectOkFrom(db, () =>
        createBooking(db, {
          listingId: otherListing,
          vehicleId: otherVehicle,
          ownerId: s.owner,
          renterId: s.stranger,
          pickupPointId: s.publicPoint,
          status: "confirmed",
        }),
      );
    }));

  test("stornierte Buchung zählt nicht", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "cancelled" });

      await expectOkFrom(db, () =>
        book(db, s, {
          status: "confirmed",
          from: "2027-03-01T10:00:00Z",
          to: "2027-03-15T10:00:00Z",
        }),
      );
      await expectOkFrom(db, () =>
        book(db, s, {
          status: "cancelled",
          from: "2027-03-01T10:00:00Z",
          to: "2027-03-15T10:00:00Z",
        }),
      );
    }));

  test("Mieter und Besitzer dürfen nicht dieselbe Person sein", () =>
    withTx(async (db) => {
      const s = await createScenario(db);

      await expectPgErrorFrom(db, "23514", () =>
        createBooking(db, {
          listingId: s.listing,
          vehicleId: s.vehicle,
          ownerId: s.owner,
          renterId: s.owner,
          pickupPointId: s.publicPoint,
          from: "2027-05-01T10:00:00Z",
          to: "2027-05-10T10:00:00Z",
        }),
      );
    }));
});

describe("bookings: eingefrorene Snapshots", () => {
  test("price_snapshot und cancellation_snapshot sind auch für postgres unveränderbar", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });

      await expectPgError(
        db,
        "P0001",
        `update public.bookings set price_snapshot = '{"price_day_cents": 1, "days": 14}' where id = $1`,
        [s.booking],
      );
      await expectPgError(
        db,
        "P0001",
        "update public.bookings set price_snapshot = price_snapshot || '{\"discount\": 100}' where id = $1",
        [s.booking],
      );
      await expectPgError(
        db,
        "P0001",
        `update public.bookings set cancellation_snapshot = '{"slug": "flexibel"}' where id = $1`,
        [s.booking],
      );
      // andere Felder bleiben änderbar (Statusmaschine)
      await expectRows(db, 1, "update public.bookings set status = 'active' where id = $1", [
        s.booking,
      ]);

      const row = await one(
        db,
        "select price_snapshot, cancellation_snapshot from public.bookings where id = $1",
        [s.booking],
      );
      expect(row).toEqual({
        price_snapshot: { price_day_cents: 3900, days: 14 },
        cancellation_snapshot: { slug: "moderat" },
      });
    }));
});
