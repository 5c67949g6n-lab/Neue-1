import "server-only";
import { timingSafeEqual } from "node:crypto";
import { writeAuditLog } from "@/lib/audit";
import { decryptDocument, sha256Hex } from "@/lib/crypto";
import { BUCKETS, IDENTITY_IMAGE_TYPES } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Entschlüsselt ein Dokument aus dem privaten Bucket für die Admin-Ansicht.
 * Setzt `requireAdmin`-gleichwertige Prüfung beim Aufrufer voraus.
 */

export type DocumentLoadResult =
  | { ok: true; bytes: Buffer; contentType: string }
  | { ok: false; error: "not_found" | "integrity" | "failed" };

/** Nur bekannte Bildformate werden als solche ausgeliefert. */
export function safeContentType(mimeType: string): string {
  return (IDENTITY_IMAGE_TYPES as readonly string[]).includes(mimeType)
    ? mimeType
    : "application/octet-stream";
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase(), "utf8");
  const right = Buffer.from(b.trim().toLowerCase(), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function loadDocumentForAdmin(
  documentId: string,
  adminId: string,
): Promise<DocumentLoadResult> {
  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("secure_documents")
    .select("id, owner_id, kind, verification_id, storage_path, sha256, mime_type")
    .eq("id", documentId)
    .maybeSingle();
  if (error) return { ok: false, error: "failed" };
  if (!doc) return { ok: false, error: "not_found" };

  const { data: blob, error: downloadError } = await admin.storage
    .from(BUCKETS.secureDocuments)
    .download(doc.storage_path);
  if (downloadError || !blob) return { ok: false, error: "not_found" };

  let plain: Buffer;
  try {
    plain = decryptDocument(new Uint8Array(await blob.arrayBuffer()));
  } catch {
    plain = Buffer.alloc(0);
  }

  // GCM erkennt Manipulationen bereits; der Hash sichert zusätzlich gegen vertauschte Dateien ab
  if (plain.length === 0 || !sameHash(sha256Hex(plain), doc.sha256)) {
    await writeAuditLog({
      adminId,
      action: "document.integrity_failed",
      targetType: "secure_document",
      targetId: doc.id,
      details: { kind: doc.kind, verification_id: doc.verification_id, owner_id: doc.owner_id },
    });
    return { ok: false, error: "integrity" };
  }

  await writeAuditLog({
    adminId,
    action: "document.view",
    targetType: "secure_document",
    targetId: doc.id,
    details: { kind: doc.kind, verification_id: doc.verification_id, owner_id: doc.owner_id },
  });
  return { ok: true, bytes: plain, contentType: safeContentType(doc.mime_type) };
}
