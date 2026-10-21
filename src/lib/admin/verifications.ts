import "server-only";
import {
  checkRenterEligibility,
  todayInBerlin,
  type EligibilityResult,
} from "@/domain/verification/eligibility";
import { writeAuditLog } from "@/lib/audit";
import { decryptSecret } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { daysFromNow, type VerificationStatusFilter } from "./schemas";
import { getEmails, getPeople, type PersonInfo } from "./users";

/**
 * Verifizierungen prüfen. Alle Funktionen setzen `requireAdmin()` beim Aufrufer voraus.
 * Entschlüsselte Daten verlassen den Server nur als gerenderter Text der Detailseite.
 */

type VerificationStatus = Database["public"]["Enums"]["verification_status"];
type VerificationKind = Database["public"]["Enums"]["verification_kind"];
type DocumentKind = Database["public"]["Enums"]["document_kind"];

export const VERIFICATION_LIST_LIMIT = 100;

export type VerificationListItem = PersonInfo & {
  id: string;
  userId: string;
  email: string;
  kind: VerificationKind;
  status: VerificationStatus;
  submittedAt: string | null;
  createdAt: string;
};

export async function listVerifications(opts: {
  status: VerificationStatusFilter;
  limit?: number;
}): Promise<VerificationListItem[]> {
  const admin = createAdminClient();
  let query = admin
    .from("verifications")
    .select("id, user_id, kind, status, submitted_at, created_at")
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(opts.limit ?? VERIFICATION_LIST_LIMIT);
  if (opts.status !== "all") query = query.eq("status", opts.status);

  const { data, error } = await query;
  if (error) throw new Error("Verifizierungen konnten nicht geladen werden");
  const rows = data ?? [];
  const userIds = rows.map((row) => row.user_id);
  const [people, emails] = await Promise.all([
    getPeople(userIds, admin),
    getEmails(userIds, admin),
  ]);

  return rows.map((row) => {
    const person = people.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      email: emails.get(row.user_id) ?? "",
      kind: row.kind,
      status: row.status,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      displayName: person?.displayName ?? "",
      firstName: person?.firstName ?? null,
      lastName: person?.lastName ?? null,
    };
  });
}

export type DecryptedDate = { value: string | null; failed: boolean };

export type VerificationDocument = {
  id: string;
  kind: DocumentKind;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type VerificationDetail = VerificationListItem & {
  provider: Database["public"]["Enums"]["identity_provider"];
  dateOfBirth: DecryptedDate;
  licenseIssuedOn: DecryptedDate;
  licenseClasses: string[];
  reviewedAt: string | null;
  reviewedBy: { id: string; name: string | null } | null;
  rejectionReason: string | null;
  expiresAt: string | null;
  deleteAfter: string | null;
  documents: VerificationDocument[];
  eligibility: EligibilityResult | null;
  settings: { minAge: number; minLicenseYears: number };
};

function decrypt(token: string | null): DecryptedDate {
  if (!token) return { value: null, failed: false };
  try {
    return { value: decryptSecret(token), failed: false };
  } catch {
    return { value: null, failed: true };
  }
}

/** Reihenfolge der Dokumente in der Ansicht. */
const DOCUMENT_ORDER: DocumentKind[] = [
  "id_front",
  "id_back",
  "license_front",
  "license_back",
  "vehicle_registration",
];

/**
 * Lädt eine Verifizierung inkl. entschlüsselter Angaben und schreibt "verification.view"
 * ins Audit-Log (bevor irgendetwas angezeigt wird).
 */
export async function getVerificationForReview(
  id: string,
  viewerId: string,
): Promise<VerificationDetail | null> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("verifications")
    .select(
      "id, user_id, kind, status, provider, date_of_birth_enc, license_issued_on_enc, license_classes, submitted_at, reviewed_by, reviewed_at, rejection_reason, expires_at, delete_after, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Verifizierung konnte nicht geladen werden");
  if (!row) return null;

  const hasSecrets = Boolean(row.date_of_birth_enc || row.license_issued_on_enc);
  if (hasSecrets) {
    await writeAuditLog({
      adminId: viewerId,
      action: "verification.view",
      targetType: "verification",
      targetId: row.id,
      details: { user_id: row.user_id, status: row.status },
    });
  }

  const personIds = [row.user_id, ...(row.reviewed_by ? [row.reviewed_by] : [])];
  const [people, emails, docsResult, settings] = await Promise.all([
    getPeople(personIds, admin),
    getEmails([row.user_id], admin),
    admin
      .from("secure_documents")
      .select("id, kind, mime_type, size_bytes, created_at")
      .eq("verification_id", row.id)
      .order("created_at", { ascending: false }),
    getSettings(),
  ]);
  if (docsResult.error) throw new Error("Dokumente konnten nicht geladen werden");

  // Pro Art nur das neueste Dokument
  const latest = new Map<DocumentKind, VerificationDocument>();
  for (const doc of docsResult.data ?? []) {
    if (latest.has(doc.kind)) continue;
    latest.set(doc.kind, {
      id: doc.id,
      kind: doc.kind,
      mimeType: doc.mime_type,
      sizeBytes: doc.size_bytes,
      createdAt: doc.created_at,
    });
  }

  const dateOfBirth = decrypt(row.date_of_birth_enc);
  const licenseIssuedOn = decrypt(row.license_issued_on_enc);
  const eligibility = evaluate(dateOfBirth, licenseIssuedOn, settings);

  const person = people.get(row.user_id);
  const reviewer = row.reviewed_by ? people.get(row.reviewed_by) : undefined;
  return {
    id: row.id,
    userId: row.user_id,
    email: emails.get(row.user_id) ?? "",
    kind: row.kind,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    displayName: person?.displayName ?? "",
    firstName: person?.firstName ?? null,
    lastName: person?.lastName ?? null,
    provider: row.provider,
    dateOfBirth,
    licenseIssuedOn,
    licenseClasses: row.license_classes,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by
      ? {
          id: row.reviewed_by,
          name: reviewer
            ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ") ||
              reviewer.displayName
            : null,
        }
      : null,
    rejectionReason: row.rejection_reason,
    expiresAt: row.expires_at,
    deleteAfter: row.delete_after,
    documents: DOCUMENT_ORDER.flatMap((kind) => latest.get(kind) ?? []),
    eligibility,
    settings: { minAge: settings.min_renter_age, minLicenseYears: settings.min_license_years },
  };
}

function evaluate(
  dateOfBirth: DecryptedDate,
  licenseIssuedOn: DecryptedDate,
  settings: { min_renter_age: number; min_license_years: number },
): EligibilityResult | null {
  if (!dateOfBirth.value || !licenseIssuedOn.value) return null;
  return checkRenterEligibility({
    dateOfBirth: dateOfBirth.value,
    licenseIssuedOn: licenseIssuedOn.value,
    today: todayInBerlin(),
    minAge: settings.min_renter_age,
    minLicenseYears: settings.min_license_years,
  });
}

export type DecisionResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_found" | "own" | "already_processed" | "not_eligible" | "data_unreadable";
      reasons?: string[];
    };

/**
 * Bestätigen oder ablehnen. Der Statuswechsel ist atomar (UPDATE … WHERE status = 'pending'),
 * die eigene Verifizierung ist auch auf DB-Ebene ausgeschlossen (user_id <> Admin).
 */
export async function decideVerification(input: {
  adminId: string;
  verificationId: string;
  decision: "approve" | "reject";
  reason?: string;
}): Promise<DecisionResult> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("verifications")
    .select("id, user_id, kind, status, date_of_birth_enc, license_issued_on_enc")
    .eq("id", input.verificationId)
    .maybeSingle();
  if (error) throw new Error("Verifizierung konnte nicht geladen werden");
  if (!row) return { ok: false, error: "not_found" };
  if (row.user_id === input.adminId) return { ok: false, error: "own" };
  if (row.status !== "pending") return { ok: false, error: "already_processed" };

  const settings = await getSettings();

  // Vor dem Bestätigen die Vorprüfung serverseitig wiederholen (Mieter-Verifizierung)
  if (input.decision === "approve" && row.kind === "renter") {
    const eligibility = evaluate(
      decrypt(row.date_of_birth_enc),
      decrypt(row.license_issued_on_enc),
      settings,
    );
    if (!eligibility) return { ok: false, error: "data_unreadable" };
    if (!eligibility.eligible) {
      return { ok: false, error: "not_eligible", reasons: eligibility.reasons };
    }
  }

  const now = new Date();
  const retentionDays =
    input.decision === "approve"
      ? settings.verification_doc_retention_days
      : settings.rejected_doc_retention_days;
  const deleteAfter = daysFromNow(retentionDays, now);

  const { data: updated, error: updateError } = await admin
    .from("verifications")
    .update(
      input.decision === "approve"
        ? {
            status: "approved",
            reviewed_by: input.adminId,
            reviewed_at: now.toISOString(),
            rejection_reason: null,
            delete_after: deleteAfter,
          }
        : {
            status: "rejected",
            reviewed_by: input.adminId,
            reviewed_at: now.toISOString(),
            rejection_reason: input.reason ?? null,
            delete_after: deleteAfter,
          },
    )
    .eq("id", row.id)
    .eq("status", "pending")
    .neq("user_id", input.adminId)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error("Verifizierung konnte nicht gespeichert werden");
  if (!updated) return { ok: false, error: "already_processed" };

  const { error: docsError } = await admin
    .from("secure_documents")
    .update({ delete_after: deleteAfter })
    .eq("verification_id", row.id);
  if (docsError) console.error("Admin: Löschfrist der Dokumente konnte nicht gesetzt werden");

  await writeAuditLog({
    adminId: input.adminId,
    action: input.decision === "approve" ? "verification.approve" : "verification.reject",
    targetType: "verification",
    targetId: row.id,
    details: {
      user_id: row.user_id,
      kind: row.kind,
      delete_after: deleteAfter,
      ...(input.decision === "reject" ? { reason: input.reason ?? null } : {}),
    },
  });
  return { ok: true };
}
