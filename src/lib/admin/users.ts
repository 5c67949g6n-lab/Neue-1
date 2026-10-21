import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { writeAuditLog } from "@/lib/audit";
import { sanitizeLikeTerm } from "./schemas";

/**
 * Nutzerverwaltung für Admins. Alle Funktionen setzen voraus, dass der Aufrufer vorher
 * `requireAdmin()` aufgerufen hat (Secret Key umgeht RLS).
 */

type AdminClient = ReturnType<typeof createAdminClient>;
type VerificationStatus = Database["public"]["Enums"]["verification_status"];
type ProfileStatus = Database["public"]["Enums"]["profile_status"];

export const USERS_PER_PAGE = 25;
/** Die Suche lädt Konten seitenweise aus Supabase Auth – höchstens so viele. */
export const SEARCH_SCAN_LIMIT = 5000;
const SCAN_PAGE_SIZE = 1000;

export type PersonInfo = {
  displayName: string;
  firstName: string | null;
  lastName: string | null;
};

export type AdminUserRow = PersonInfo & {
  id: string;
  email: string;
  createdAt: string;
  status: ProfileStatus;
  suspendedReason: string | null;
  isAdmin: boolean;
  renterVerification: VerificationStatus | null;
  ownerVerification: VerificationStatus | null;
};

export type AdminUserPage = {
  users: AdminUserRow[];
  total: number;
  page: number;
  pages: number;
  /** Suche hat das Scan-Limit erreicht (Treffer evtl. unvollständig) */
  truncated: boolean;
};

/** "Vorname Nachname", sonst Anzeigename, sonst null. */
export function personName(person: PersonInfo | undefined): string | null {
  if (!person) return null;
  const full = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return full || person.displayName || null;
}

/** Anzeigename + Vor-/Nachname für mehrere Profile. */
export async function getPeople(
  ids: readonly string[],
  admin: AdminClient = createAdminClient(),
): Promise<Map<string, PersonInfo>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, PersonInfo>();
  if (unique.length === 0) return result;

  const [{ data: profiles, error }, { data: privates, error: privError }] = await Promise.all([
    admin.from("profiles").select("id, display_name").in("id", unique),
    admin.from("profile_private").select("user_id, first_name, last_name").in("user_id", unique),
  ]);
  if (error || privError) throw new Error("Profile konnten nicht geladen werden");

  const privateById = new Map((privates ?? []).map((p) => [p.user_id, p]));
  for (const profile of profiles ?? []) {
    const priv = privateById.get(profile.id);
    result.set(profile.id, {
      displayName: profile.display_name,
      firstName: priv?.first_name ?? null,
      lastName: priv?.last_name ?? null,
    });
  }
  return result;
}

/** E-Mail-Adressen aus Supabase Auth (einzeln abgefragt – nur für kleine Mengen gedacht). */
export async function getEmails(
  ids: readonly string[],
  admin: AdminClient = createAdminClient(),
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data.user?.email ?? ""] as const;
    }),
  );
  return new Map(entries);
}

async function latestVerifications(admin: AdminClient, ids: readonly string[]) {
  const result = new Map<
    string,
    { renter: VerificationStatus | null; owner: VerificationStatus | null }
  >();
  if (ids.length === 0) return result;
  const { data, error } = await admin
    .from("verifications")
    .select("user_id, kind, status, expires_at, created_at")
    .in("user_id", [...ids])
    .order("created_at", { ascending: false });
  if (error) throw new Error("Verifizierungen konnten nicht geladen werden");

  const now = Date.now();
  for (const row of data ?? []) {
    const entry = result.get(row.user_id) ?? { renter: null, owner: null };
    if (entry[row.kind] === null) {
      const expired =
        row.status === "approved" && row.expires_at && new Date(row.expires_at).getTime() <= now;
      entry[row.kind] = expired ? "expired" : row.status;
    }
    result.set(row.user_id, entry);
  }
  return result;
}

async function enrich(admin: AdminClient, authUsers: readonly User[]): Promise<AdminUserRow[]> {
  const ids = authUsers.map((u) => u.id);
  if (ids.length === 0) return [];
  const [people, { data: privates, error }, verifications] = await Promise.all([
    getPeople(ids, admin),
    admin
      .from("profile_private")
      .select("user_id, status, is_admin, suspended_reason")
      .in("user_id", ids),
    latestVerifications(admin, ids),
  ]);
  if (error) throw new Error("Kontodaten konnten nicht geladen werden");
  const privateById = new Map((privates ?? []).map((p) => [p.user_id, p]));

  return authUsers.map((user) => {
    const person = people.get(user.id);
    const priv = privateById.get(user.id);
    const verification = verifications.get(user.id);
    return {
      id: user.id,
      email: user.email ?? "",
      createdAt: user.created_at,
      displayName: person?.displayName ?? "",
      firstName: person?.firstName ?? null,
      lastName: person?.lastName ?? null,
      status: priv?.status ?? "active",
      suspendedReason: priv?.suspended_reason ?? null,
      isAdmin: priv?.is_admin === true,
      renterVerification: verification?.renter ?? null,
      ownerVerification: verification?.owner ?? null,
    };
  });
}

/** IDs, deren Anzeige-, Vor- oder Nachname zum Suchbegriff passt. */
async function idsMatchingName(admin: AdminClient, query: string): Promise<Set<string>> {
  const term = sanitizeLikeTerm(query);
  const ids = new Set<string>();
  if (!term) return ids;
  const pattern = `%${term}%`;
  const parts = term.split(" ");

  const queries = [
    admin.from("profiles").select("id").ilike("display_name", pattern).limit(500),
    admin.from("profile_private").select("user_id").ilike("first_name", pattern).limit(500),
    admin.from("profile_private").select("user_id").ilike("last_name", pattern).limit(500),
  ] as const;
  const [byDisplay, byFirst, byLast] = await Promise.all(queries);
  for (const row of byDisplay.data ?? []) ids.add(row.id);
  for (const row of byFirst.data ?? []) ids.add(row.user_id);
  for (const row of byLast.data ?? []) ids.add(row.user_id);

  // "Vorname Nachname"
  if (parts.length >= 2) {
    const { data } = await admin
      .from("profile_private")
      .select("user_id")
      .ilike("first_name", `%${parts[0]}%`)
      .ilike("last_name", `%${parts.slice(1).join(" ")}%`)
      .limit(500);
    for (const row of data ?? []) ids.add(row.user_id);
  }
  return ids;
}

/** Nutzerliste: ohne Suche direkt seitenweise aus Supabase Auth, mit Suche gefiltert. */
export async function listUsersForAdmin(opts: {
  query: string;
  page: number;
}): Promise<AdminUserPage> {
  const admin = createAdminClient();

  if (!opts.query) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: opts.page,
      perPage: USERS_PER_PAGE,
    });
    if (error) throw new Error("Nutzer konnten nicht geladen werden");
    const total = data.total ?? data.users.length;
    return {
      users: await enrich(admin, data.users),
      total,
      page: opts.page,
      pages: Math.max(1, Math.ceil(total / USERS_PER_PAGE)),
      truncated: false,
    };
  }

  const needle = opts.query.toLowerCase();
  const [nameIds, scan] = await Promise.all([
    idsMatchingName(admin, opts.query),
    (async () => {
      const users: User[] = [];
      let truncated = false;
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: SCAN_PAGE_SIZE });
        if (error) throw new Error("Nutzer konnten nicht geladen werden");
        users.push(...data.users);
        if (data.users.length < SCAN_PAGE_SIZE || !data.nextPage) break;
        if (users.length >= SEARCH_SCAN_LIMIT) {
          truncated = true;
          break;
        }
      }
      return { users, truncated };
    })(),
  ]);

  const matches = scan.users.filter(
    (user) => nameIds.has(user.id) || (user.email ?? "").toLowerCase().includes(needle),
  );
  const pages = Math.max(1, Math.ceil(matches.length / USERS_PER_PAGE));
  const page = Math.min(opts.page, pages);
  const slice = matches.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);
  return {
    users: await enrich(admin, slice),
    total: matches.length,
    page,
    pages,
    truncated: scan.truncated,
  };
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

export type UserActionKind = "suspend" | "unsuspend" | "grant_admin" | "revoke_admin";

export type UserActionResult =
  { ok: true } | { ok: false; error: "self" | "not_found" | "unchanged" };

/**
 * Sperren/Entsperren, Admin-Rechte geben/entziehen – nie für das eigene Konto.
 * Die Bedingung auf den bisherigen Zustand steckt im UPDATE selbst (atomar);
 * jede wirksame Änderung landet im Audit-Log.
 *
 * Sessions: Beim Sperren löscht `admin_revoke_user_sessions` alle Sitzungen samt Refresh-Tokens.
 * Ein noch gültiges Access-Token läuft spätestens nach einer Stunde ab; in der App wirkt die
 * Sperre sofort, weil der DAL den Status bei jeder Anfrage liest und auf /gesperrt umleitet.
 */
export async function applyUserAction(input: {
  adminId: string;
  targetId: string;
  action: UserActionKind;
  reason?: string;
}): Promise<UserActionResult> {
  if (input.adminId === input.targetId) return { ok: false, error: "self" };
  const admin = createAdminClient();

  const { data: existing, error: loadError } = await admin
    .from("profile_private")
    .select("user_id, status, is_admin")
    .eq("user_id", input.targetId)
    .maybeSingle();
  if (loadError) throw new Error("Konto konnte nicht geladen werden");
  if (!existing) return { ok: false, error: "not_found" };

  const base = admin.from("profile_private");
  let update;
  switch (input.action) {
    case "suspend":
      update = base
        .update({ status: "suspended", suspended_reason: input.reason ?? null })
        .eq("user_id", input.targetId)
        .eq("status", "active");
      break;
    case "unsuspend":
      update = base
        .update({ status: "active", suspended_reason: null })
        .eq("user_id", input.targetId)
        .eq("status", "suspended");
      break;
    case "grant_admin":
      update = base.update({ is_admin: true }).eq("user_id", input.targetId).eq("is_admin", false);
      break;
    case "revoke_admin":
      update = base.update({ is_admin: false }).eq("user_id", input.targetId).eq("is_admin", true);
      break;
  }
  const { data: changed, error } = await update.select("user_id").maybeSingle();
  if (error) throw new Error("Konto konnte nicht geändert werden");
  if (!changed) return { ok: false, error: "unchanged" };

  if (input.action === "suspend") {
    const { error: revokeError } = await admin.rpc("admin_revoke_user_sessions", {
      p_user_id: input.targetId,
    });
    if (revokeError) throw new Error("Sitzungen konnten nicht beendet werden");
  }

  await writeAuditLog({
    adminId: input.adminId,
    action: `user.${input.action}`,
    targetType: "user",
    targetId: input.targetId,
    details:
      input.action === "suspend"
        ? { reason: input.reason ?? null }
        : { previous: { status: existing.status, is_admin: existing.is_admin } },
  });
  return { ok: true };
}
