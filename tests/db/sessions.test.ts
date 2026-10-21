import { afterAll, describe, test } from "vitest";
import { asUser, closePool, createUser, expectDenied, makeAdmin, withTx } from "./helpers";

afterAll(closePool);

describe("admin_revoke_user_sessions", () => {
  test("weder normale Nutzer noch Admins können die Funktion direkt aufrufen", () =>
    withTx(async (db) => {
      const victim = await createUser(db);
      const user = await createUser(db);
      const admin = await createUser(db);
      await makeAdmin(db, admin);

      await asUser(db, user);
      await expectDenied(db, "select public.admin_revoke_user_sessions($1)", [victim]);

      // auch ein Admin nicht über PostgREST – nur der Server mit Secret Key (service_role)
      await asUser(db, admin);
      await expectDenied(db, "select public.admin_revoke_user_sessions($1)", [victim]);
    }));
});
