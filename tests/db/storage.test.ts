// Storage: private Buckets nur über den Server, Fahrzeugfotos nur in den eigenen Ordner
import { afterAll, describe, expect, test } from "vitest";
import {
  asAnon,
  asPostgres,
  asUser,
  closePool,
  createUser,
  expectDenied,
  expectRows,
  one,
  rows,
  withTx,
} from "./helpers";

afterAll(closePool);

const PRIVATE_BUCKETS = ["secure-documents", "inspection-photos", "documents"];
const insertObject = "insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3)";

describe("storage: private Buckets", () => {
  test("Buckets secure-documents, inspection-photos und documents sind privat", () =>
    withTx(async (db) => {
      const buckets = await rows<{ id: string; public: boolean }>(
        db,
        "select id, public from storage.buckets where id = any($1)",
        [PRIVATE_BUCKETS],
      );
      expect(buckets).toHaveLength(PRIVATE_BUCKETS.length);
      for (const bucket of buckets) expect(bucket.public, bucket.id).toBe(false);
    }));

  test("keine Storage-Policy öffnet einen privaten Bucket für anon/authenticated", () =>
    withTx(async (db) => {
      const policies = await rows<{
        tablename: string;
        policyname: string;
        roles: string[];
        qual: string | null;
        with_check: string | null;
      }>(
        db,
        `select tablename, policyname, roles::text[] as roles, qual, with_check
           from pg_policies
          where schemaname = 'storage'
            and roles && array['public', 'anon', 'authenticated']::name[]`,
      );
      for (const policy of policies) {
        const text = `${policy.qual ?? ""} ${policy.with_check ?? ""}`;
        // Jede Client-Policy ist ausdrücklich auf den öffentlichen Fotos-Bucket beschränkt …
        expect(policy.tablename, policy.policyname).toBe("objects");
        expect(text, policy.policyname).toContain("bucket_id = 'vehicle-photos'::text");
        // … und erwähnt keinen privaten Bucket
        for (const bucket of PRIVATE_BUCKETS) expect(text, policy.policyname).not.toContain(bucket);
      }
    }));

  test("authenticated und anon können nicht in private Buckets hochladen oder daraus lesen", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      for (const bucket of PRIVATE_BUCKETS) {
        await db.query(insertObject, [bucket, `${alice}/vorhanden.bin`, alice]);
      }

      for (const user of [alice, null]) {
        if (user) await asUser(db, user);
        else await asAnon(db);
        for (const bucket of PRIVATE_BUCKETS) {
          await expectDenied(db, insertObject, [bucket, `${alice}/neu.bin`, alice]);
          await expectRows(
            db,
            0,
            "select id from storage.objects where bucket_id = $1 and name like $2",
            [bucket, `${alice}/%`],
          );
          await expectRows(
            db,
            0,
            "update storage.objects set name = name || '.x' where bucket_id = $1 and name like $2",
            [bucket, `${alice}/%`],
          );
        }
      }
      await asPostgres(db);
    }));
});

describe("storage: vehicle-photos", () => {
  test("Upload nur in den eigenen Ordner, kein Verschieben in private Buckets", () =>
    withTx(async (db) => {
      const alice = await createUser(db);
      const bob = await createUser(db);

      await asUser(db, alice);
      await expectRows(db, 1, insertObject, ["vehicle-photos", `${alice}/golf-1.jpg`, alice]);
      await expectDenied(db, insertObject, ["vehicle-photos", `${bob}/golf-1.jpg`, alice]);
      await expectDenied(db, insertObject, ["vehicle-photos", "golf-ohne-ordner.jpg", alice]);

      await asPostgres(db);
      const { id } = await one<{ id: string }>(
        db,
        "select id from storage.objects where bucket_id = 'vehicle-photos' and name = $1",
        [`${alice}/golf-1.jpg`],
      );

      // Verschieben in einen privaten Bucket oder fremden Ordner: ohne SELECT-Policy findet
      // UPDATE die Zeile gar nicht erst (0 Zeilen) – für niemanden
      for (const user of [alice, bob]) {
        await asUser(db, user);
        await expectRows(
          db,
          0,
          "update storage.objects set bucket_id = 'secure-documents' where id = $1",
          [id],
        );
        await expectRows(db, 0, "update storage.objects set name = $2 where id = $1", [
          id,
          `${bob}/golf-1.jpg`,
        ]);
      }

      await asPostgres(db);
      const moved = await one(db, "select bucket_id, name from storage.objects where id = $1", [
        id,
      ]);
      expect(moved).toEqual({ bucket_id: "vehicle-photos", name: `${alice}/golf-1.jpg` });

      await asAnon(db);
      await expectDenied(db, insertObject, ["vehicle-photos", `${alice}/anon.jpg`, null]);
      await asPostgres(db);
    }));
});
