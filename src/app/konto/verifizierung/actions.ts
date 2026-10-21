"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { MAX_IDENTITY_IMAGE_BYTES } from "@/lib/storage";
import { verificationErrorMessage } from "@/lib/verification/errors";
import {
  readVerificationForm,
  renterDocumentKindSchema,
  verificationFormSchema,
  type RenterDocumentKind,
} from "@/lib/verification/schema";
import { getOrCreateDraft, submit, uploadDocument } from "@/lib/verification/service";
import { verificationText } from "@/i18n/de/verification";

const PATH = "/konto/verifizierung";
const t = verificationText.errors;

function revalidate() {
  revalidatePath(PATH);
  revalidatePath("/konto");
}

function logUnexpected(action: string, error: unknown) {
  // Nur Fehlertyp/-name loggen – keine Nutzerdaten, keine Dateiinhalte
  const name = error instanceof Error ? error.name : typeof error;
  if (name !== "VerificationError")
    console.error(`Verifizierung (${action}) fehlgeschlagen:`, name);
}

export type UploadResult = { ok: true; kind: RenterDocumentKind } | { ok: false; message: string };

/** Lädt EIN Foto hoch (Formularfelder: kind, file). */
export async function uploadDocumentAction(formData: FormData): Promise<UploadResult> {
  const user = await requireUser(PATH);

  const kind = renterDocumentKindSchema.safeParse(formData.get("kind"));
  if (!kind.success) return { ok: false, message: t.generic };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: t.fileMissing };
  if (file.size === 0) return { ok: false, message: t.fileEmpty };
  if (file.size > MAX_IDENTITY_IMAGE_BYTES) return { ok: false, message: t.fileTooLarge };

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadDocument(user.id, kind.data, bytes);
  } catch (error) {
    logUnexpected("upload", error);
    return { ok: false, message: verificationErrorMessage(error) };
  }

  revalidate();
  return { ok: true, kind: kind.data };
}

export type SubmitFormValues = {
  dateOfBirth: string;
  licenseIssuedOn: string;
  licenseClasses: string[];
  consent: boolean;
};

export type SubmitFormState = {
  ok?: boolean;
  message?: string;
  /** Gründe, warum jemand (noch) nicht berechtigt ist */
  reasons?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
  values?: SubmitFormValues;
};

export async function submitVerificationAction(
  _prev: SubmitFormState,
  formData: FormData,
): Promise<SubmitFormState> {
  const user = await requireUser(PATH);

  const raw = readVerificationForm(formData);
  const values: SubmitFormValues = {
    dateOfBirth: raw.dateOfBirth.slice(0, 20),
    licenseIssuedOn: raw.licenseIssuedOn.slice(0, 20),
    licenseClasses: raw.licenseClasses.slice(0, 20).map((value) => value.slice(0, 10)),
    consent: raw.consent,
  };

  const parsed = verificationFormSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  try {
    const result = await submit(user.id, parsed.data);
    switch (result.status) {
      case "submitted":
        revalidate();
        return { ok: true };
      case "invalid":
        return { fieldErrors: result.fieldErrors, values };
      case "not_eligible":
        return { reasons: result.reasons, values };
      case "missing_documents": {
        const labels = result.missing.map((kind) => verificationText.documents.kinds[kind].label);
        // Seite neu laden lassen, falls die Kacheln einen veralteten Stand zeigen
        revalidate();
        return { message: t.missingDocuments(labels), values };
      }
    }
  } catch (error) {
    logUnexpected("submit", error);
    revalidate();
    return { message: verificationErrorMessage(error), values };
  }
}

export type RestartState = { message?: string };

/** Nach Ablehnung oder Ablauf: neuen Entwurf anlegen. */
export async function restartVerificationAction(): Promise<RestartState> {
  const user = await requireUser(PATH);
  try {
    await getOrCreateDraft(user.id);
  } catch (error) {
    logUnexpected("restart", error);
    revalidate();
    return { message: verificationErrorMessage(error) };
  }
  revalidate();
  return {};
}
