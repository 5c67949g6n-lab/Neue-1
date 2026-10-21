import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { checkRenterEligibility, todayInBerlin } from "@/domain/verification/eligibility";
import { encryptDocument, encryptSecret, sha256Hex } from "@/lib/crypto";
import { getIdentityProvider } from "@/lib/identity/provider";
import { getSettings } from "@/lib/settings";
import { BUCKETS, MAX_IDENTITY_IMAGE_BYTES, secureDocumentPath } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { VerificationError } from "./errors";
import { detectImageType, type DetectedImageType } from "./file-type";
import {
  RENTER_DOCUMENT_KINDS,
  renterDocumentKindSchema,
  verificationDataSchema,
  type LicenseClass,
  type RenterDocumentKind,
  type VerificationDataInput,
} from "./schema";

/**
 * Mieter-Verifizierung (Ausweis + Führerschein).
 *
 * Alle Zugriffe laufen mit dem Secret Key, weil Nutzer verifications/secure_documents nicht
 * selbst schreiben dürfen. Deshalb bekommt jede Funktion die userId vom Aufrufer (Action nach
 * requireUser) und filtert IMMER zusätzlich auf user_id bzw. owner_id.
 */

type VerificationStatus = Database["public"]["Enums"]["verification_status"];
type AdminClient = ReturnType<typeof createAdminClient>;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RenterDocumentInfo = {
  kind: RenterDocumentKind;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type RenterVerification = {
  id: string;
  /** "approved" mit abgelaufenem expires_at wird hier bereits als "expired" geliefert */
  status: VerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  expiresAt: string | null;
  licenseClasses: string[];
  createdAt: string;
  /** nur Metadaten, nie Inhalte */
  documents: RenterDocumentInfo[];
};

export type SubmitResult =
  | { status: "submitted"; verificationId: string; redirectUrl?: string }
  | { status: "invalid"; fieldErrors: Record<string, string[] | undefined> }
  | { status: "not_eligible"; reasons: string[] }
  | { status: "missing_documents"; missing: RenterDocumentKind[] };

function isPast(timestamp: string | null): boolean {
  return timestamp !== null && new Date(timestamp).getTime() <= Date.now();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function isRenterKind(kind: string): kind is RenterDocumentKind {
  return (RENTER_DOCUMENT_KINDS as readonly string[]).includes(kind);
}

/** Neueste Mieter-Verifizierung inkl. hochgeladener Dokumentarten – oder null. */
export async function getRenterVerification(userId: string): Promise<RenterVerification | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("verifications")
    .select(
      "id, status, submitted_at, reviewed_at, rejection_reason, expires_at, license_classes, created_at",
    )
    .eq("user_id", userId)
    .eq("kind", "renter")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Verifizierung konnte nicht geladen werden: ${error.message}`);
  if (!data) return null;

  const { data: docs, error: docsError } = await admin
    .from("secure_documents")
    .select("kind, mime_type, size_bytes, created_at")
    .eq("owner_id", userId)
    .eq("verification_id", data.id)
    .order("created_at", { ascending: false });
  if (docsError) throw new Error(`Dokumente konnten nicht geladen werden: ${docsError.message}`);

  // Pro Art nur das neueste Dokument (während eines Austauschs können kurz zwei existieren)
  const documents = new Map<RenterDocumentKind, RenterDocumentInfo>();
  for (const doc of docs ?? []) {
    if (!isRenterKind(doc.kind) || documents.has(doc.kind)) continue;
    documents.set(doc.kind, {
      kind: doc.kind,
      mimeType: doc.mime_type,
      sizeBytes: doc.size_bytes,
      uploadedAt: doc.created_at,
    });
  }

  return {
    id: data.id,
    status: data.status === "approved" && isPast(data.expires_at) ? "expired" : data.status,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    rejectionReason: data.rejection_reason,
    expiresAt: data.expires_at,
    licenseClasses: data.license_classes,
    createdAt: data.created_at,
    documents: RENTER_DOCUMENT_KINDS.flatMap((kind) => documents.get(kind) ?? []),
  };
}

/** Offene (draft/pending/approved) Mieter-Verifizierung – laut Unique-Index höchstens eine. */
async function findOpenVerification(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("verifications")
    .select("id, status, expires_at")
    .eq("user_id", userId)
    .eq("kind", "renter")
    .in("status", ["draft", "pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Verifizierung konnte nicht geladen werden: ${error.message}`);
  return data;
}

/**
 * Liefert den vorhandenen Entwurf oder legt einen neuen an.
 * Wirft, wenn bereits eine Verifizierung in Prüfung oder (noch gültig) bestätigt ist.
 */
export async function getOrCreateDraft(userId: string): Promise<{ id: string; created: boolean }> {
  const admin = createAdminClient();

  // Mehrere Durchläufe: parallel angelegte Entwürfe (Unique-Index) oder abgelaufene Freigaben
  for (let attempt = 0; attempt < 3; attempt++) {
    const open = await findOpenVerification(admin, userId);
    if (open?.status === "draft") return { id: open.id, created: false };
    if (open?.status === "pending") throw new VerificationError("already_pending");
    if (open?.status === "approved") {
      if (!isPast(open.expires_at)) throw new VerificationError("already_approved");
      // Gültigkeit abgelaufen → als "expired" abschließen, damit neu eingereicht werden kann
      const { error } = await admin
        .from("verifications")
        .update({ status: "expired" })
        .eq("id", open.id)
        .eq("user_id", userId)
        .eq("status", "approved");
      if (error) throw new Error(`Verifizierung konnte nicht beendet werden: ${error.message}`);
      continue;
    }

    const { data, error } = await admin
      .from("verifications")
      .insert({ user_id: userId, kind: "renter", status: "draft", provider: "manual" })
      .select("id")
      .single();
    if (!error) return { id: data.id, created: true };
    // 23505 = unique_violation: ein paralleler Request war schneller → erneut lesen
    if (error.code !== "23505") {
      throw new Error(`Entwurf konnte nicht angelegt werden: ${error.message}`);
    }
  }
  throw new Error("Entwurf konnte nicht angelegt werden (zu viele parallele Versuche)");
}

async function removeObjects(admin: AdminClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(BUCKETS.secureDocuments).remove(paths);
  // Kein Pfad im Log – er enthält die Nutzer-ID
  if (error) console.error("Verifizierung: Speicherobjekte konnten nicht gelöscht werden");
}

async function isStillDraft(admin: AdminClient, userId: string, verificationId: string) {
  const { data } = await admin
    .from("verifications")
    .select("status")
    .eq("id", verificationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.status === "draft";
}

/**
 * Lädt ein Foto verschlüsselt hoch. Legt bei Bedarf den Entwurf an und ersetzt ein vorhandenes
 * Dokument derselben Art. Der Dateityp wird ausschließlich anhand der Bytes erkannt.
 */
export async function uploadDocument(
  userId: string,
  kind: RenterDocumentKind,
  bytes: Uint8Array,
): Promise<{ kind: RenterDocumentKind; mimeType: DetectedImageType; sizeBytes: number }> {
  const parsedKind = renterDocumentKindSchema.safeParse(kind);
  if (!parsedKind.success) throw new VerificationError("invalid_kind");
  if (bytes.byteLength === 0) throw new VerificationError("file_empty");
  if (bytes.byteLength > MAX_IDENTITY_IMAGE_BYTES) throw new VerificationError("file_too_large");
  const mimeType = detectImageType(bytes);
  if (!mimeType) throw new VerificationError("file_unsupported");

  const admin = createAdminClient();
  const [draft, settings] = await Promise.all([getOrCreateDraft(userId), getSettings()]);

  const path = secureDocumentPath(userId, draft.id, parsedKind.data, randomUUID());
  const sha256 = sha256Hex(bytes); // Prüfsumme des Klartexts (Integrität beim Entschlüsseln)
  const { blob, keyId } = encryptDocument(bytes);

  const { error: uploadError } = await admin.storage
    .from(BUCKETS.secureDocuments)
    .upload(path, blob, { contentType: "application/octet-stream", upsert: false });
  if (uploadError) throw new VerificationError("upload_failed", { cause: uploadError });

  const { data: row, error: insertError } = await admin
    .from("secure_documents")
    .insert({
      owner_id: userId,
      kind: parsedKind.data,
      verification_id: draft.id,
      storage_path: path,
      sha256,
      mime_type: mimeType,
      size_bytes: bytes.byteLength,
      key_id: keyId,
      delete_after: daysFromNow(settings.verification_doc_retention_days),
    })
    .select("id")
    .single();
  if (insertError) {
    await removeObjects(admin, [path]);
    throw new VerificationError("upload_failed", { cause: insertError });
  }

  // Wurde parallel eingereicht? Dann gehört das neue Foto nicht mehr dazu.
  if (!(await isStillDraft(admin, userId, draft.id))) {
    await admin.from("secure_documents").delete().eq("id", row.id).eq("owner_id", userId);
    await removeObjects(admin, [path]);
    throw new VerificationError("not_draft");
  }

  // Vorheriges Foto derselben Art ersetzen: erst das Objekt, dann die Zeile löschen
  // (bleibt beim Löschen etwas hängen, findet die Löschfrist es über die Zeile)
  const { data: previous } = await admin
    .from("secure_documents")
    .select("id, storage_path")
    .eq("owner_id", userId)
    .eq("verification_id", draft.id)
    .eq("kind", parsedKind.data)
    .neq("id", row.id);
  if (previous && previous.length > 0) {
    await removeObjects(
      admin,
      previous.map((doc) => doc.storage_path),
    );
    const { error } = await admin
      .from("secure_documents")
      .delete()
      .eq("owner_id", userId)
      .in(
        "id",
        previous.map((doc) => doc.id),
      );
    if (error) console.error("Verifizierung: altes Dokument konnte nicht gelöscht werden");
  }

  return { kind: parsedKind.data, mimeType, sizeBytes: bytes.byteLength };
}

/**
 * Reicht die Angaben zur Prüfung ein. Wer laut Mindestalter/Führerschein-Dauer nicht
 * berechtigt ist, bekommt die Gründe sofort zurück – der Entwurf bleibt dann unverändert.
 */
export async function submit(userId: string, input: VerificationDataInput): Promise<SubmitResult> {
  const parsed = verificationDataSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  const settings = await getSettings();
  const eligibility = checkRenterEligibility({
    dateOfBirth: data.dateOfBirth,
    licenseIssuedOn: data.licenseIssuedOn,
    today: todayInBerlin(),
    minAge: settings.min_renter_age,
    minLicenseYears: settings.min_license_years,
  });
  if (!eligibility.eligible) return { status: "not_eligible", reasons: eligibility.reasons };

  const admin = createAdminClient();
  const open = await findOpenVerification(admin, userId);
  if (open?.status === "pending") throw new VerificationError("already_pending");
  if (open?.status === "approved" && !isPast(open.expires_at)) {
    throw new VerificationError("already_approved");
  }
  if (open?.status !== "draft") {
    return { status: "missing_documents", missing: [...RENTER_DOCUMENT_KINDS] };
  }

  const { data: docs, error: docsError } = await admin
    .from("secure_documents")
    .select("kind")
    .eq("owner_id", userId)
    .eq("verification_id", open.id);
  if (docsError) throw new Error(`Dokumente konnten nicht geladen werden: ${docsError.message}`);
  const present = new Set<string>((docs ?? []).map((doc) => doc.kind));
  const missing = RENTER_DOCUMENT_KINDS.filter((kind) => !present.has(kind));
  if (missing.length > 0) return { status: "missing_documents", missing };

  const provider = getIdentityProvider("manual");
  const started = await provider.startVerification({ userId, verificationId: open.id });

  const licenseClasses: LicenseClass[] = data.licenseClasses;
  const deleteAfter = daysFromNow(settings.verification_doc_retention_days);
  const { data: updated, error } = await admin
    .from("verifications")
    .update({
      status: "pending",
      submitted_at: new Date().toISOString(),
      provider: provider.id,
      provider_ref: started.providerRef ?? null,
      date_of_birth_enc: encryptSecret(data.dateOfBirth),
      license_issued_on_enc: encryptSecret(data.licenseIssuedOn),
      license_classes: licenseClasses,
      rejection_reason: null,
      delete_after: deleteAfter,
    })
    .eq("id", open.id)
    .eq("user_id", userId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Verifizierung konnte nicht eingereicht werden: ${error.message}`);
  if (!updated) throw new VerificationError("not_draft");

  // Löschfrist der Dokumente ab Einreichung neu setzen ("letzte Aktivität")
  await admin
    .from("secure_documents")
    .update({ delete_after: deleteAfter })
    .eq("owner_id", userId)
    .eq("verification_id", open.id);

  return { status: "submitted", verificationId: open.id, redirectUrl: started.redirectUrl };
}
