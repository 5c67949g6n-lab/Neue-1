// Schema-weite Sicherheitsregeln: gelten automatisch auch für künftige Tabellen und Funktionen
import { afterAll, describe, expect, test } from "vitest";
import { closePool, rows, withTx } from "./helpers";

afterAll(closePool);

describe("Schema public", () => {
  test("jede Tabelle hat RLS aktiviert", () =>
    withTx(async (db) => {
      const tables = await rows<{ tablename: string; rowsecurity: boolean }>(
        db,
        "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
      );
      expect(tables.length).toBeGreaterThan(30);
      expect(tables.filter((t) => !t.rowsecurity).map((t) => t.tablename)).toEqual([]);
    }));

  test("jede SECURITY-DEFINER-Funktion hat einen festen search_path", () =>
    withTx(async (db) => {
      const functions = await rows<{ fn: string; config: string[] | null }>(
        db,
        `select p.oid::regprocedure::text as fn, p.proconfig as config
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.prosecdef`,
      );
      expect(functions.length).toBeGreaterThan(0);
      const unsafe = functions
        .filter((f) => !(f.config ?? []).some((c) => c.startsWith("search_path=")))
        .map((f) => f.fn);
      expect(unsafe).toEqual([]);
    }));

  test("Views laufen mit den Rechten des Aufrufers (sonst umgehen sie RLS)", () =>
    withTx(async (db) => {
      const views = await rows<{ relname: string }>(
        db,
        `select c.relname
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and (c.relkind = 'm'
                 or (c.relkind = 'v'
                     and not coalesce(c.reloptions @> array['security_invoker=true'], false)
                     and not coalesce(c.reloptions @> array['security_invoker=on'], false)))`,
      );
      expect(views.map((v) => v.relname)).toEqual([]);
    }));

  test("jede Policy nennt ihre Rollen ausdrücklich (kein implizites TO public)", () =>
    withTx(async (db) => {
      const policies = await rows<{ policy: string }>(
        db,
        `select tablename || ': ' || policyname as policy
           from pg_policies
          where schemaname = 'public' and 'public' = any(roles)`,
      );
      expect(policies.map((p) => p.policy)).toEqual([]);
    }));
});
