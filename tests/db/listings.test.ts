// Fahrzeuge, Inserate, genaue Adresse, Übergabepunkte: Sichtbarkeit und Schreibrechte
import { afterAll, describe, expect, test } from "vitest";
import {
  asAnon,
  asPostgres,
  asUser,
  closePool,
  createHandoverPoint,
  createListing,
  createScenario,
  createUser,
  createVehicle,
  expectDenied,
  expectRows,
  linkHandoverPoint,
  scalar,
  setBookingStatus,
  withTx,
} from "./helpers";

afterAll(closePool);

describe("listings", () => {
  test("Entwurf ist für andere und anon unsichtbar, aktives Inserat ist öffentlich", () =>
    withTx(async (db) => {
      const owner = await createUser(db);
      const stranger = await createUser(db);
      const admin = await createUser(db, { admin: true });
      const draftVehicle = await createVehicle(db, owner);
      const activeVehicle = await createVehicle(db, owner);
      const draft = await createListing(db, {
        ownerId: owner,
        vehicleId: draftVehicle,
        status: "draft",
      });
      const active = await createListing(db, { ownerId: owner, vehicleId: activeVehicle });

      const sql = "select id from public.listings where id = $1";
      await asAnon(db);
      await expectRows(db, 0, sql, [draft]);
      await expectRows(db, 1, sql, [active]);
      // Fahrzeug ohne aktives Inserat bleibt ebenfalls verborgen
      await expectRows(db, 0, "select id from public.vehicles where id = $1", [draftVehicle]);
      await expectRows(db, 1, "select id from public.vehicles where id = $1", [activeVehicle]);

      await asUser(db, stranger);
      await expectRows(db, 0, sql, [draft]);
      await expectRows(db, 1, sql, [active]);

      await asUser(db, owner);
      await expectRows(db, 1, sql, [draft]);

      await asUser(db, admin);
      await expectRows(db, 1, sql, [draft]);
    }));

  test("Besitzer legt Entwurf nur mit eigenem Fahrzeug und nur im Status draft an", () =>
    withTx(async (db) => {
      const owner = await createUser(db);
      const stranger = await createUser(db);
      const ownVehicle = await createVehicle(db, owner);
      const foreignVehicle = await createVehicle(db, stranger);

      await asUser(db, owner);
      await expectRows(
        db,
        1,
        "insert into public.listings (owner_id, vehicle_id, title) values ($1, $2, 'Mein Golf')",
        [owner, ownVehicle],
      );
      await expectDenied(
        db,
        "insert into public.listings (owner_id, vehicle_id, status) values ($1, $2, 'active')",
        [owner, ownVehicle],
      );
      await expectDenied(
        db,
        "insert into public.listings (owner_id, vehicle_id, status) values ($1, $2, 'pending_review')",
        [owner, ownVehicle],
      );
      await expectDenied(db, "insert into public.listings (owner_id, vehicle_id) values ($1, $2)", [
        owner,
        foreignVehicle,
      ]);
      // im Namen eines anderen anlegen
      await expectDenied(db, "insert into public.listings (owner_id, vehicle_id) values ($1, $2)", [
        stranger,
        foreignVehicle,
      ]);

      await asAnon(db);
      await expectDenied(db, "insert into public.listings (owner_id, vehicle_id) values ($1, $2)", [
        owner,
        ownVehicle,
      ]);
    }));

  test("Besitzer kann den Status nicht selbst auf active setzen (Spalten-Grant)", () =>
    withTx(async (db) => {
      const owner = await createUser(db);
      const vehicle = await createVehicle(db, owner);
      const draft = await createListing(db, {
        ownerId: owner,
        vehicleId: vehicle,
        status: "draft",
      });

      await asUser(db, owner);
      await expectDenied(db, "update public.listings set status = 'active' where id = $1", [draft]);
      await expectDenied(db, "update public.listings set published_at = now() where id = $1", [
        draft,
      ]);
      await expectDenied(db, "update public.listings set review_note = 'ok' where id = $1", [
        draft,
      ]);
      await expectDenied(db, "update public.listings set owner_id = owner_id where id = $1", [
        draft,
      ]);
      await expectDenied(db, "delete from public.listings where id = $1", [draft]);
      // freigegebene Spalten gehen
      await expectRows(
        db,
        1,
        "update public.listings set title = 'Neuer Titel', price_day_cents = 4500 where id = $1",
        [draft],
      );

      await asPostgres(db);
      expect(await scalar(db, "select status from public.listings where id = $1", [draft])).toBe(
        "draft",
      );
    }));

  test("fremdes Inserat ist nicht änderbar", () =>
    withTx(async (db) => {
      const s = await createScenario(db);

      for (const user of [s.stranger, s.renter]) {
        await asUser(db, user);
        await expectRows(db, 0, "update public.listings set title = 'Gehackt' where id = $1", [
          s.listing,
        ]);
        await expectRows(db, 0, "update public.vehicles set color = 'pink' where id = $1", [
          s.vehicle,
        ]);
        await expectRows(db, 0, "delete from public.vehicles where id = $1", [s.vehicle]);
      }

      await asPostgres(db);
      expect(await scalar(db, "select title from public.listings where id = $1", [s.listing])).toBe(
        "Golf für die Urlaubszeit",
      );
    }));
});

describe("vehicles", () => {
  test("Besitzer kann Prüfvermerk und Eigentümer seines Fahrzeugs nicht ändern", () =>
    withTx(async (db) => {
      const owner = await createUser(db);
      const vehicle = await createVehicle(db, owner);

      await asUser(db, owner);
      await expectDenied(
        db,
        "update public.vehicles set registration_verified_at = now() where id = $1",
        [vehicle],
      );
      await expectDenied(
        db,
        "update public.vehicles set registration_document_id = null where id = $1",
        [vehicle],
      );
      await expectDenied(db, "update public.vehicles set owner_id = owner_id where id = $1", [
        vehicle,
      ]);
      await expectRows(db, 1, "update public.vehicles set mileage_km = 42000 where id = $1", [
        vehicle,
      ]);
    }));

  test("Besitzer liest sein neu angelegtes Fahrzeug direkt zurück (insert … returning)", () =>
    withTx(async (db) => {
      const owner = await createUser(db);

      await asUser(db, owner);
      // Kein Sicherheitsthema, aber ein Schemafehler: supabase-js .insert().select() braucht das.
      // Die SELECT-Policy prüft nur vehicle_is_visible(id), und die Funktion sieht die gerade
      // eingefügte Zeile im selben Statement noch nicht → "new row violates row-level security".
      await expectRows(
        db,
        1,
        `insert into public.vehicles (owner_id, make, model, year, fuel, transmission, seats, vehicle_class)
         values ($1, 'VW', 'Polo', 2020, 'petrol', 'manual', 5, 'small')
         returning id`,
        [owner],
      );
    }));

  test("Besitzer kann den Fahrzeugschein-Prüfvermerk auch beim Anlegen nicht selbst setzen", () =>
    withTx(async (db) => {
      const owner = await createUser(db);

      await asUser(db, owner);
      await expectRows(
        db,
        1,
        `insert into public.vehicles (owner_id, make, model, year, fuel, transmission, seats, vehicle_class)
         values ($1, 'VW', 'Golf', 2021, 'petrol', 'manual', 5, 'compact')`,
        [owner],
      );
      // Lücke: Beim INSERT sind alle Spalten freigegeben – registration_verified_at und
      // registration_document_id darf nur der Server nach Admin-Prüfung setzen.
      await expectDenied(
        db,
        `insert into public.vehicles
           (owner_id, make, model, year, fuel, transmission, seats, vehicle_class, registration_verified_at)
         values ($1, 'VW', 'Golf', 2021, 'petrol', 'manual', 5, 'compact', now())`,
        [owner],
      );
    }));
});

describe("listing_private_details und vehicle_private", () => {
  test("genaue Adresse und Kennzeichen nur für Besitzer, Admin und Mieter mit verbindlicher Buchung", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "requested" });
      const address = "select street from public.listing_private_details where listing_id = $1";
      const plate = "select license_plate from public.vehicle_private where vehicle_id = $1";

      async function expectVisible(user: string | null, n: number) {
        if (user) await asUser(db, user);
        else await asAnon(db);
        await expectRows(db, n, address, [s.listing]);
        await expectRows(db, n, plate, [s.vehicle]);
        await asPostgres(db);
      }

      await expectVisible(null, 0);
      await expectVisible(s.stranger, 0);
      await expectVisible(s.owner, 1);
      await expectVisible(s.admin, 1);
      // nur angefragt: noch nichts
      await expectVisible(s.renter, 0);

      await setBookingStatus(db, s.booking, "confirmed");
      await expectVisible(s.renter, 1);
      await expectVisible(s.stranger, 0);

      await setBookingStatus(db, s.booking, "active");
      await expectVisible(s.renter, 1);

      await setBookingStatus(db, s.booking, "completed");
      await expectVisible(s.renter, 0);
      await expectVisible(s.owner, 1);
    }));

  test("Mieter mit Buchung kann genaue Adresse und Kennzeichen nicht ändern", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });

      await asUser(db, s.renter);
      await expectRows(
        db,
        0,
        "update public.listing_private_details set street = 'Falsch 1' where listing_id = $1",
        [s.listing],
      );
      await expectRows(
        db,
        0,
        "update public.vehicle_private set license_plate = 'S-XX 1' where vehicle_id = $1",
        [s.vehicle],
      );

      await asUser(db, s.stranger);
      await expectDenied(
        db,
        "insert into public.listing_private_details (listing_id, street) values ($1, 'x')",
        [s.listing],
      );
    }));
});

describe("handover_points", () => {
  test("privater Zuhause-Punkt nur für Besitzer, Admin und Mieter mit verbindlicher Buchung", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "requested" });
      const sql = "select street from public.handover_points where id = $1";

      async function expectVisible(user: string | null, n: number) {
        if (user) await asUser(db, user);
        else await asAnon(db);
        await expectRows(db, n, sql, [s.homePoint]);
        await expectRows(db, 1, sql, [s.publicPoint]);
        await asPostgres(db);
      }

      await expectVisible(null, 0);
      await expectVisible(s.stranger, 0);
      await expectVisible(s.renter, 0);
      await expectVisible(s.owner, 1);
      await expectVisible(s.admin, 1);

      await setBookingStatus(db, s.booking, "confirmed");
      await expectVisible(s.renter, 1);
      await expectVisible(s.stranger, 0);

      await setBookingStatus(db, s.booking, "completed");
      await expectVisible(s.renter, 0);
    }));

  test("Nutzer kann keinen öffentlichen Punkt anlegen, nur den eigenen privaten Zuhause-Punkt", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const bob = await createUser(db);

      await asUser(db, alice);
      await expectDenied(
        db,
        "insert into public.handover_points (type, name, is_public) values ('airport', 'Fake-Flughafen', true)",
      );
      await expectDenied(
        db,
        "insert into public.handover_points (type, name, is_public) values ('partner_garage', 'Fake-Werkstatt', false)",
      );
      await expectDenied(
        db,
        "insert into public.handover_points (type, name, is_public, owner_id) values ('owner_home', 'Bei Bob', false, $1)",
        [bob],
      );
      const [own] = await expectRows(
        db,
        1,
        "insert into public.handover_points (type, name, street, is_public, owner_id) values ('owner_home', 'Bei mir', 'Weg 1', false, $1) returning id",
        [alice],
      );
      await expectDenied(db, "update public.handover_points set is_public = true where id = $1", [
        own.id,
      ]);
      await expectDenied(
        db,
        "update public.handover_points set type = 'airport', owner_id = null where id = $1",
        [own.id],
      );

      // eigener Punkt und öffentliche Punkte lassen sich an das eigene Inserat hängen
      await asPostgres(db);
      const vehicle = await createVehicle(db, alice);
      const listing = await createListing(db, {
        ownerId: alice,
        vehicleId: vehicle,
        status: "draft",
      });
      const publicPoint = await createHandoverPoint(db);
      await asUser(db, alice);
      for (const point of [own.id, publicPoint]) {
        await expectRows(
          db,
          1,
          "insert into public.listing_handover_points (listing_id, handover_point_id) values ($1, $2)",
          [listing, point],
        );
      }

      await asAnon(db);
      await expectDenied(
        db,
        "insert into public.handover_points (type, name, is_public) values ('airport', 'Anon-Punkt', true)",
      );
    }));

  test("Besitzer kann keinen fremden privaten Übergabepunkt an sein Inserat hängen", () =>
    withTx(async (db) => {
      const victim = await createUser(db, { name: "Opfer" });
      const victimVehicle = await createVehicle(db, victim);
      const victimListing = await createListing(db, { ownerId: victim, vehicleId: victimVehicle });
      const victimHome = await createHandoverPoint(db, { ownerId: victim });
      await linkHandoverPoint(db, victimListing, victimHome);

      const attacker = await createUser(db, { name: "Angreifer" });
      const attackerVehicle = await createVehicle(db, attacker);
      const attackerListing = await createListing(db, {
        ownerId: attacker,
        vehicleId: attackerVehicle,
      });

      await asUser(db, attacker);
      // Die ID des fremden Zuhause-Punkts ist über das aktive Inserat öffentlich lesbar …
      await expectRows(
        db,
        1,
        "select handover_point_id from public.listing_handover_points where listing_id = $1",
        [victimListing],
      );
      // … darf aber nicht an ein eigenes Inserat gehängt werden. Sonst sähe ein Mieter mit
      // bestätigter Buchung dort (has_committed_booking_at_point) die Privatadresse des Opfers.
      await expectDenied(
        db,
        "insert into public.listing_handover_points (listing_id, handover_point_id) values ($1, $2)",
        [attackerListing, victimHome],
      );
    }));
});
