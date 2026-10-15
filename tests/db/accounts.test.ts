// Konten, Rollen, Einstellungen, Verifizierung: RLS und Spalten-Grants
import { afterAll, describe, expect, test } from "vitest";
import {
  asAnon,
  asPostgres,
  asUser,
  closePool,
  createSecureDocument,
  createUser,
  createVerification,
  expectDenied,
  expectRows,
  one,
  scalar,
  suspendUser,
  withTx,
} from "./helpers";

afterAll(closePool);

describe("profiles", () => {
  test("anon und andere Nutzer lesen öffentliche Profile", () =>
    withTx(async (db) => {
      const alice = await createUser(db, { name: "Alice" });
      const bob = await createUser(db, { name: "Bob" });

      await asAnon(db);
      const [anonView] = await expectRows(
        db,
        1,
        "select display_name from public.profiles where id = $1",
        [alice],
      );
      expect(anonView.display_name).toBe("Alice");

      await asUser(db, bob);
      await expectRows(db, 1, "select display_name, bio from public.profiles where id = $1", [
        alice,
      ]);
    }));

  test("Nutzer ändert den eigenen Anzeigenamen, aber kein fremdes Profil", () =>
    withTx(async (db) => {
      const alice = await createUser(db, { name: "Alice" });
      const bob = await createUser(db, { name: "Bob" });

      await asUser(db, alice);
      await expectRows(db, 1, "update public.profiles set display_name = 'Ali' where id = $1", [
        alice,
      ]);
      // fremdes Profil: RLS filtert die Zeile weg
      await expectRows(db, 0, "update public.profiles set display_name = 'Gehackt' where id = $1", [
        bob,
      ]);
      // nicht freigegebene Spalten und Anlegen/Löschen: kein Recht
      await expectDenied(db, "update public.profiles set created_at = now() where id = $1", [
        alice,
      ]);
      await expectDenied(db, "delete from public.profiles where id = $1", [alice]);
      await expectDenied(db, "insert into public.profiles (id) values (gen_random_uuid())");

      await asAnon(db);
      await expectDenied(db, "update public.profiles set display_name = 'Anon' where id = $1", [
        alice,
      ]);

      await asPostgres(db);
      const bobRow = await one(db, "select display_name from public.profiles where id = $1", [bob]);
      expect(bobRow.display_name).toBe("Bob");
    }));
});

describe("profile_private", () => {
  test("fremde Zeilen sind unsichtbar, die eigene ist sichtbar", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const bob = await createUser(db);

      await asUser(db, alice);
      await expectRows(db, 1, "select * from public.profile_private where user_id = $1", [alice]);
      await expectRows(db, 0, "select * from public.profile_private where user_id = $1", [bob]);
      await expectRows(db, 1, "select * from public.profile_private where user_id in ($1, $2)", [
        alice,
        bob,
      ]);

      await asAnon(db);
      await expectRows(db, 0, "select * from public.profile_private where user_id in ($1, $2)", [
        alice,
        bob,
      ]);
    }));

  test("Nutzer kann is_admin und status nicht selbst setzen", () =>
    withTx(async (db) => {
      const alice = await createUser(db);

      await asUser(db, alice);
      await expectDenied(
        db,
        "update public.profile_private set is_admin = true where user_id = $1",
        [alice],
      );
      await expectDenied(
        db,
        "update public.profile_private set status = 'active' where user_id = $1",
        [alice],
      );
      await expectDenied(
        db,
        "update public.profile_private set suspended_reason = null where user_id = $1",
        [alice],
      );
      await expectDenied(db, "insert into public.profile_private (user_id) values ($1)", [alice]);
      await expectDenied(db, "delete from public.profile_private where user_id = $1", [alice]);

      await asPostgres(db);
      expect(
        await scalar(db, "select is_admin from public.profile_private where user_id = $1", [alice]),
      ).toBe(false);
    }));

  test("Nutzer ändert eigenen Vornamen und Telefonnummer, aber keine fremden Kontaktdaten", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const bob = await createUser(db);

      await asUser(db, alice);
      await expectRows(
        db,
        1,
        "update public.profile_private set first_name = 'Alice', last_name = 'Muster', phone = '+49 711 123456' where user_id = $1",
        [alice],
      );
      await expectRows(
        db,
        0,
        "update public.profile_private set phone = '+49 000' where user_id = $1",
        [bob],
      );
    }));

  test("Admin sieht alle privaten Kontodaten", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const bob = await createUser(db);
      const admin = await createUser(db, { admin: true });

      await asUser(db, admin);
      await expectRows(db, 2, "select * from public.profile_private where user_id in ($1, $2)", [
        alice,
        bob,
      ]);
    }));
});

describe("is_admin()", () => {
  test("gesperrter Admin ist kein Admin mehr", () =>
    withTx(async (db) => {
      const admin = await createUser(db, { admin: true });
      const alice = await createUser(db);

      await asUser(db, admin);
      expect(await scalar(db, "select public.is_admin()")).toBe(true);

      await asPostgres(db);
      await suspendUser(db, admin);

      await asUser(db, admin);
      expect(await scalar(db, "select public.is_admin()")).toBe(false);
      await expectRows(db, 0, "select * from public.profile_private where user_id = $1", [alice]);

      await asUser(db, alice);
      expect(await scalar(db, "select public.is_admin()")).toBe(false);

      await asAnon(db);
      expect(await scalar(db, "select public.is_admin()")).toBe(false);
    }));
});

describe("platform_settings", () => {
  test("anon liest Einstellungen, niemand schreibt sie als Client", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const admin = await createUser(db, { admin: true });

      await asAnon(db);
      await expectRows(
        db,
        1,
        "select value from public.platform_settings where key = 'min_renter_age'",
      );

      for (const user of [null, alice, admin]) {
        if (user) await asUser(db, user);
        else await asAnon(db);
        await expectDenied(
          db,
          "update public.platform_settings set value = '18' where key = 'min_renter_age'",
        );
        await expectDenied(
          db,
          "insert into public.platform_settings (key, value) values ('db_test_key', '1')",
        );
        await expectDenied(db, "delete from public.platform_settings where key = 'min_renter_age'");
      }

      await asPostgres(db);
      expect(
        await scalar(db, "select value from public.platform_settings where key = 'min_renter_age'"),
      ).toBe(21);
    }));
});

describe("verifications und secure_documents", () => {
  test("nur eigene Verifizierungen und Dokumente sichtbar – Admin sieht alle", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const bob = await createUser(db);
      const admin = await createUser(db, { admin: true });
      const verification = await createVerification(db, alice);
      const document = await createSecureDocument(db, {
        ownerId: alice,
        verificationId: verification,
      });

      await asUser(db, alice);
      await expectRows(db, 1, "select * from public.verifications where id = $1", [verification]);
      await expectRows(db, 1, "select * from public.secure_documents where id = $1", [document]);

      await asUser(db, bob);
      await expectRows(db, 0, "select * from public.verifications where id = $1", [verification]);
      await expectRows(db, 0, "select * from public.secure_documents where id = $1", [document]);

      await asAnon(db);
      await expectRows(db, 0, "select * from public.verifications where id = $1", [verification]);
      await expectRows(db, 0, "select * from public.secure_documents where id = $1", [document]);

      await asUser(db, admin);
      await expectRows(db, 1, "select * from public.verifications where id = $1", [verification]);
      await expectRows(db, 1, "select * from public.secure_documents where id = $1", [document]);
    }));

  test("authenticated kann Verifizierungen und Dokumente weder anlegen noch ändern noch löschen", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const admin = await createUser(db, { admin: true });
      const verification = await createVerification(db, alice);
      const document = await createSecureDocument(db, {
        ownerId: alice,
        verificationId: verification,
      });

      for (const user of [alice, admin]) {
        await asUser(db, user);
        await expectDenied(
          db,
          "insert into public.verifications (user_id, kind, status) values ($1, 'owner', 'approved')",
          [user],
        );
        await expectDenied(
          db,
          "update public.verifications set status = 'approved' where id = $1",
          [verification],
        );
        await expectDenied(db, "delete from public.verifications where id = $1", [verification]);

        await expectDenied(
          db,
          `insert into public.secure_documents
             (owner_id, kind, storage_path, sha256, mime_type, size_bytes, key_id)
           values ($1, 'id_front', 'x/y', repeat('a', 64), 'image/jpeg', 1, 'v1')`,
          [user],
        );
        await expectDenied(
          db,
          "update public.secure_documents set storage_path = 'woanders' where id = $1",
          [document],
        );
        await expectDenied(db, "delete from public.secure_documents where id = $1", [document]);
      }

      await asPostgres(db);
      expect(
        await scalar(db, "select status from public.verifications where id = $1", [verification]),
      ).toBe("pending");
    }));
});
