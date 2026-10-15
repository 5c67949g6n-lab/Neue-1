// Inspektionsfotos: Beweissicherung per Trigger – gilt auch für postgres/Secret Key
import { afterAll, describe, test } from "vitest";
import {
  asAnon,
  asPostgres,
  asUser,
  closePool,
  createInspection,
  createInspectionPhoto,
  createScenario,
  expectDenied,
  expectPgError,
  expectRows,
  withTx,
  type Db,
} from "./helpers";

afterAll(closePool);

async function photoScenario(db: Db, deleteAfterSql?: string) {
  const s = await createScenario(db, { bookingStatus: "returned" });
  const inspection = await createInspection(db, s.booking);
  const photo = await createInspectionPhoto(db, inspection, { deleteAfterSql });
  return { ...s, inspection, photo };
}

describe("inspection_photos", () => {
  test("Inhalt, Hash, Ort und Zeit sind auch für postgres unveränderbar", () =>
    withTx(async (db) => {
      const s = await photoScenario(db);

      for (const set of [
        "storage_path = 'manipuliert.jpg'",
        "sha256 = repeat('0', 64)",
        "perspective = 'rear'",
        "captured_at = now()",
        "received_at = now() - interval '1 year'",
        "latitude = 52.52",
        "longitude = 13.40",
        "inspection_id = gen_random_uuid()",
      ]) {
        await expectPgError(
          db,
          "P0001",
          `update public.inspection_photos set ${set} where id = $1`,
          [s.photo],
        );
      }
    }));

  test("Löschen vor Ablauf von delete_after ist verboten, danach erlaubt", () =>
    withTx(async (db) => {
      const fresh = await photoScenario(db, "now() + interval '1 day'");
      await expectPgError(db, "P0001", "delete from public.inspection_photos where id = $1", [
        fresh.photo,
      ]);
      // auch nicht über die Kaskade (Inspektion bzw. Buchung löschen)
      await expectPgError(db, "P0001", "delete from public.inspections where id = $1", [
        fresh.inspection,
      ]);

      const withoutDeadline = await photoScenario(db, "null");
      await expectPgError(db, "P0001", "delete from public.inspection_photos where id = $1", [
        withoutDeadline.photo,
      ]);

      const expired = await photoScenario(db, "now() - interval '1 day'");
      await expectRows(db, 1, "delete from public.inspection_photos where id = $1", [
        expired.photo,
      ]);
    }));

  test("delete_after lässt sich nur verlängern", () =>
    withTx(async (db) => {
      const s = await photoScenario(db, "now() + interval '90 days'");
      const sql = "update public.inspection_photos set delete_after = $2 where id = $1";

      await expectPgError(
        db,
        "P0001",
        "update public.inspection_photos set delete_after = delete_after - interval '1 day' where id = $1",
        [s.photo],
      );
      await expectPgError(db, "P0001", sql, [s.photo, null]);
      await expectRows(
        db,
        1,
        "update public.inspection_photos set delete_after = delete_after + interval '30 days' where id = $1",
        [s.photo],
      );
      // ohne Frist (null) darf eine Frist gesetzt werden
      const open = await photoScenario(db, "null");
      await expectRows(db, 1, sql, [open.photo, "2030-01-01T00:00:00Z"]);
    }));

  test("Beteiligte lesen Fotos, aber kein Client schreibt sie", () =>
    withTx(async (db) => {
      const s = await photoScenario(db, "now() - interval '1 day'");
      const sql = "select id from public.inspection_photos where id = $1";

      for (const user of [s.renter, s.owner, s.admin]) {
        await asUser(db, user);
        await expectRows(db, 1, sql, [s.photo]);
        await expectDenied(
          db,
          "update public.inspection_photos set delete_after = null where id = $1",
          [s.photo],
        );
        await expectDenied(db, "delete from public.inspection_photos where id = $1", [s.photo]);
        await expectDenied(
          db,
          `insert into public.inspection_photos (inspection_id, perspective, storage_path, sha256, mime_type)
           values ($1, 'front', 'x.jpg', repeat('a', 64), 'image/jpeg')`,
          [s.inspection],
        );
        await expectDenied(db, "update public.inspections set odometer_km = 1 where id = $1", [
          s.inspection,
        ]);
      }

      await asUser(db, s.stranger);
      await expectRows(db, 0, sql, [s.photo]);
      await asAnon(db);
      await expectRows(db, 0, sql, [s.photo]);
      await asPostgres(db);
    }));
});
