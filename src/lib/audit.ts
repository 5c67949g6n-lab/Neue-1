import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Schreibt einen Eintrag ins Admin-Audit-Log (wer hat was wann gemacht oder angesehen).
 * Pflicht bei jedem Zugriff auf Ausweisdaten und bei jeder Admin-Entscheidung.
 */
export async function writeAuditLog(entry: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Json;
}) {
  const { error } = await createAdminClient()
    .from("admin_audit_log")
    .insert({
      admin_id: entry.adminId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    });
  if (error) throw new Error(`Audit-Log fehlgeschlagen: ${error.message}`);
}
