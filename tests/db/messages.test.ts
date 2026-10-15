// Chat pro Buchung: nur Beteiligte, nur als sie selbst, read_at nur bei fremden Nachrichten
import { afterAll, describe, expect, test } from "vitest";
import {
  asAnon,
  asPostgres,
  asUser,
  closePool,
  createMessage,
  createScenario,
  expectDenied,
  expectRows,
  scalar,
  withTx,
} from "./helpers";

afterAll(closePool);

const insertMessage =
  "insert into public.messages (booking_id, sender_id, body) values ($1, $2, 'Hallo, wann passt die Übergabe?')";

describe("messages", () => {
  test("nur Beteiligte und Admin lesen den Chat", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });
      await createMessage(db, s.booking, s.renter);
      await createMessage(db, s.booking, s.owner);
      const sql = "select id from public.messages where booking_id = $1";

      for (const user of [s.renter, s.owner, s.admin]) {
        await asUser(db, user);
        await expectRows(db, 2, sql, [s.booking]);
      }
      await asUser(db, s.stranger);
      await expectRows(db, 0, sql, [s.booking]);
      await asAnon(db);
      await expectRows(db, 0, sql, [s.booking]);
    }));

  test("Beteiligte schreiben nur als sie selbst, Fremde gar nicht", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "requested" });

      await asUser(db, s.renter);
      await expectRows(db, 1, insertMessage, [s.booking, s.renter]);
      await expectDenied(db, insertMessage, [s.booking, s.owner]);

      await asUser(db, s.owner);
      await expectRows(db, 1, insertMessage, [s.booking, s.owner]);
      await expectDenied(db, insertMessage, [s.booking, s.renter]);

      await asUser(db, s.stranger);
      await expectDenied(db, insertMessage, [s.booking, s.stranger]);
      await expectDenied(db, insertMessage, [s.booking, s.renter]);

      // Admin ist nicht Beteiligter des Chats
      await asUser(db, s.admin);
      await expectDenied(db, insertMessage, [s.booking, s.admin]);

      await asAnon(db);
      await expectDenied(db, insertMessage, [s.booking, s.renter]);
    }));

  test("Absender kann beim Senden weder read_at noch created_at vorgeben", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });

      await asUser(db, s.renter);
      // Lücke: INSERT ist für alle Spalten freigegeben. So könnte der Absender seine eigene
      // Nachricht als "gelesen" anlegen oder sie zurückdatieren (Beweiswert im Streitfall).
      await expectDenied(
        db,
        "insert into public.messages (booking_id, sender_id, body, read_at) values ($1, $2, 'Schon gelesen', now())",
        [s.booking, s.renter],
      );
      await expectDenied(
        db,
        "insert into public.messages (booking_id, sender_id, body, created_at) values ($1, $2, 'Rückdatiert', now() - interval '30 days')",
        [s.booking, s.renter],
      );
    }));

  test("read_at nur bei fremden Nachrichten setzbar, body nicht änderbar, nichts löschbar", () =>
    withTx(async (db) => {
      const s = await createScenario(db, { bookingStatus: "confirmed" });
      const fromRenter = await createMessage(db, s.booking, s.renter, "Original");
      const markRead = "update public.messages set read_at = now() where id = $1";

      // eigene Nachricht: RLS filtert die Zeile
      await asUser(db, s.renter);
      await expectRows(db, 0, markRead, [fromRenter]);
      // Unbeteiligte ebenso
      await asUser(db, s.stranger);
      await expectRows(db, 0, markRead, [fromRenter]);
      // Empfänger darf als gelesen markieren
      await asUser(db, s.owner);
      await expectRows(db, 1, markRead, [fromRenter]);

      for (const user of [s.renter, s.owner]) {
        await asUser(db, user);
        await expectDenied(db, "update public.messages set body = 'Geändert' where id = $1", [
          fromRenter,
        ]);
        await expectDenied(db, "update public.messages set sender_id = $2 where id = $1", [
          fromRenter,
          user,
        ]);
        await expectDenied(db, "delete from public.messages where id = $1", [fromRenter]);
      }

      await asPostgres(db);
      expect(await scalar(db, "select body from public.messages where id = $1", [fromRenter])).toBe(
        "Original",
      );
    }));
});
