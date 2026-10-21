import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPeople, personName } from "./users";

/** Audit-Log lesen. Aufrufer prüft vorher `requireAdmin()`. */

export const AUDIT_LIMIT = 200;

export const AUDIT_ACTIONS = [
  "verification.view",
  "verification.approve",
  "verification.reject",
  "document.view",
  "document.integrity_failed",
  "user.suspend",
  "user.unsuspend",
  "user.grant_admin",
  "user.revoke_admin",
  "setting.update",
] as const;

export const AUDIT_TARGET_TYPES = ["verification", "secure_document", "user", "setting"] as const;

export type AuditEntry = {
  id: number;
  createdAt: string;
  adminId: string | null;
  adminName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Json;
};

export type AuditFilter = {
  action?: string;
  targetType?: string;
  targetId?: string;
  limit?: number;
};

export async function listAuditEntries(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  const admin = createAdminClient();
  let query = admin
    .from("admin_audit_log")
    .select("id, created_at, admin_id, action, target_type, target_id, details")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.min(filter.limit ?? AUDIT_LIMIT, AUDIT_LIMIT));
  // Filterwerte gehen als Parameter an PostgREST (kein String-Zusammenbau)
  if (filter.action) query = query.eq("action", filter.action);
  if (filter.targetType) query = query.eq("target_type", filter.targetType);
  if (filter.targetId) query = query.eq("target_id", filter.targetId);

  const { data, error } = await query;
  if (error) throw new Error("Audit-Log konnte nicht geladen werden");
  const rows = data ?? [];
  const people = await getPeople(
    rows.flatMap((row) => (row.admin_id ? [row.admin_id] : [])),
    admin,
  );

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    adminId: row.admin_id,
    adminName: row.admin_id ? personName(people.get(row.admin_id)) : null,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details,
  }));
}
