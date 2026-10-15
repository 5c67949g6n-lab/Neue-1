// Nur-Server-Tabellen: Keybox-Codes, Stripe-Webhooks, Service-Partner – und gesperrte Nutzer
import { afterAll, describe, test } from "vitest";
import {
  asAnon,
  asPostgres,
  asUser,
  closePool,
  createKeyAccessGrant,
  createScenario,
  createServicePartner,
  createStripeEvent,
  expectDenied,
  expectRows,
  suspendUser,
  withTx,
} from "./helpers";

afterAll(closePool);

describe("key_access_grants, stripe_events, service_partners", () => {
  test("für normale Nutzer unsichtbar", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "active" });
      const { keyboxId, grantId } = await createKeyAccessGrant(db, {
        vehicleId: s.vehicle,
        managerId: s.owner,
        bookingId: s.booking,
        granteeId: s.renter,
      });
      const partner = await createServicePartner(db);
      const stripeEvent = await createStripeEvent(db);

      for (const user of [s.renter, s.owner, s.stranger, null]) {
        if (user) await asUser(db, user);
        else await asAnon(db);
        // auch der berechtigte Mieter liest den Code nie direkt – nur über den Server
        await expectRows(db, 0, "select code_enc from public.key_access_grants where id = $1", [
          grantId,
        ]);
        await expectRows(db, 0, "select id from public.service_partners where id = $1", [partner]);
        await expectDenied(db, "select id from public.stripe_events where id = $1", [stripeEvent]);
      }

      // Verwalter sieht seine Keybox, aber nicht die Codes
      await asUser(db, s.owner);
      await expectRows(db, 1, "select id from public.keyboxes where id = $1", [keyboxId]);

      // Admin liest Grants und Partner, Stripe-Events bleiben reine Server-Sache
      await asUser(db, s.admin);
      await expectRows(db, 1, "select id from public.key_access_grants where id = $1", [grantId]);
      await expectRows(db, 1, "select id from public.service_partners where id = $1", [partner]);
      await expectDenied(db, "select id from public.stripe_events where id = $1", [stripeEvent]);
      await asPostgres(db);
    }));

  test("für normale Nutzer und Admins als Client unschreibbar", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "active" });
      const { keyboxId, grantId } = await createKeyAccessGrant(db, {
        vehicleId: s.vehicle,
        managerId: s.owner,
        bookingId: s.booking,
        granteeId: s.renter,
      });
      const partner = await createServicePartner(db);
      const stripeEvent = await createStripeEvent(db);

      for (const user of [s.renter, s.owner, s.admin, null]) {
        if (user) await asUser(db, user);
        else await asAnon(db);
        await expectDenied(
          db,
          `insert into public.key_access_grants (keybox_id, booking_id, grantee_user_id, purpose, valid_from, valid_until)
           values ($1, $2, $3, 'renter', now(), now() + interval '1 day')`,
          [keyboxId, s.booking, s.renter],
        );
        await expectDenied(
          db,
          "update public.key_access_grants set valid_until = now() + interval '1 year' where id = $1",
          [grantId],
        );
        await expectDenied(db, "delete from public.key_access_grants where id = $1", [grantId]);
        await expectDenied(db, "update public.keyboxes set active = false where id = $1", [
          keyboxId,
        ]);

        await expectDenied(
          db,
          "insert into public.stripe_events (id, type, payload) values ('evt_fake', 'charge.succeeded', '{}')",
        );
        await expectDenied(
          db,
          "update public.stripe_events set processed_at = now() where id = $1",
          [stripeEvent],
        );
        await expectDenied(db, "delete from public.stripe_events where id = $1", [stripeEvent]);

        await expectDenied(
          db,
          "insert into public.service_partners (name, email) values ('Fake', 'fake@example.com')",
        );
        await expectDenied(
          db,
          "update public.service_partners set email = 'phish@example.com' where id = $1",
          [partner],
        );
        await expectDenied(db, "delete from public.service_partners where id = $1", [partner]);
      }
      await asPostgres(db);
    }));
});

describe("gesperrte Nutzer", () => {
  test("gesperrter Nutzer kann kein Fahrzeug, kein Inserat und keine Nachricht anlegen", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });
      const insertVehicle = `insert into public.vehicles (owner_id, make, model, year, fuel, transmission, seats, vehicle_class)
         values ($1, 'Opel', 'Corsa', 2019, 'petrol', 'manual', 5, 'small')`;
      const insertListing =
        "insert into public.listings (owner_id, vehicle_id, title) values ($1, $2, 'Zweites Inserat')";
      const insertMessage =
        "insert into public.messages (booking_id, sender_id, body) values ($1, $2, 'Hallo')";

      // Gegenprobe: aktiv geht es
      await asUser(db, s.owner);
      await expectRows(db, 1, insertVehicle, [s.owner]);
      await expectRows(db, 1, insertListing, [s.owner, s.vehicle]);
      await asUser(db, s.renter);
      await expectRows(db, 1, insertMessage, [s.booking, s.renter]);

      await asPostgres(db);
      await suspendUser(db, s.owner);
      await suspendUser(db, s.renter);

      await asUser(db, s.owner);
      await expectDenied(db, insertVehicle, [s.owner]);
      await expectDenied(db, insertListing, [s.owner, s.vehicle]);
      await expectDenied(db, insertMessage, [s.booking, s.owner]);
      await asUser(db, s.renter);
      await expectDenied(db, insertMessage, [s.booking, s.renter]);
      await expectDenied(db, insertVehicle, [s.renter]);
      await asPostgres(db);
    }));
});
