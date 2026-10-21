import { verificationText } from "@/i18n/de/verification";

/** Erwartbare Fehler der Verifizierung – werden in verständliche Meldungen übersetzt. */
export type VerificationErrorCode =
  | "already_pending"
  | "already_approved"
  | "not_draft"
  | "invalid_kind"
  | "file_empty"
  | "file_too_large"
  | "file_unsupported"
  | "upload_failed";

export class VerificationError extends Error {
  constructor(
    public readonly code: VerificationErrorCode,
    options?: { cause?: unknown },
  ) {
    super(`Verifizierung: ${code}`, options);
    this.name = "VerificationError";
  }
}

const t = verificationText.errors;

const messages: Record<VerificationErrorCode, string> = {
  already_pending: t.alreadySubmitted,
  already_approved: t.alreadyApproved,
  not_draft: t.notDraft,
  invalid_kind: t.generic,
  file_empty: t.fileEmpty,
  file_too_large: t.fileTooLarge,
  file_unsupported: t.fileUnsupported,
  upload_failed: t.uploadFailed,
};

/** Deutsche, nicht-technische Meldung für den Client – unbekannte Fehler werden neutral. */
export function verificationErrorMessage(error: unknown): string {
  return error instanceof VerificationError ? messages[error.code] : t.generic;
}
