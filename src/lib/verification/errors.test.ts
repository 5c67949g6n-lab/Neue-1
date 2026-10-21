import { describe, expect, it } from "vitest";
import { VerificationError, verificationErrorMessage } from "./errors";
import { verificationText } from "@/i18n/de/verification";

const t = verificationText.errors;

describe("verificationErrorMessage", () => {
  it("übersetzt bekannte Fehler in verständliche Meldungen", () => {
    expect(verificationErrorMessage(new VerificationError("file_unsupported"))).toBe(
      t.fileUnsupported,
    );
    expect(verificationErrorMessage(new VerificationError("already_pending"))).toBe(
      t.alreadySubmitted,
    );
    expect(verificationErrorMessage(new VerificationError("not_draft"))).toBe(t.notDraft);
  });

  it("verrät bei unerwarteten Fehlern keine technischen Details", () => {
    expect(verificationErrorMessage(new Error("duplicate key value violates …"))).toBe(t.generic);
    expect(verificationErrorMessage("kaputt")).toBe(t.generic);
  });

  it("behält die Ursache für Logs", () => {
    const cause = new Error("storage");
    const error = new VerificationError("upload_failed", { cause });
    expect(error.code).toBe("upload_failed");
    expect(error.cause).toBe(cause);
  });
});
