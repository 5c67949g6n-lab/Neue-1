"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { reasonSchema, uuidSchema } from "@/lib/admin/schemas";
import { decideVerification, type DecisionResult } from "@/lib/admin/verifications";
import { adminText } from "@/i18n/de/admin";

export type ReviewState = {
  message?: string;
  /** Gründe der Vorprüfung, falls Bestätigen daran scheitert */
  reasons?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { reason?: string };
};

const t = adminText.verificationDetail;

const errorMessages: Record<Extract<DecisionResult, { ok: false }>["error"], string> = {
  not_found: t.errors.notFound,
  own: t.errors.ownVerification,
  already_processed: t.errors.alreadyProcessed,
  not_eligible: t.errors.notEligible,
  data_unreadable: t.errors.dataUnreadable,
};

const approveSchema = z.object({ verificationId: uuidSchema });
const rejectSchema = z.object({
  verificationId: uuidSchema,
  reason: reasonSchema({ required: t.errors.reasonRequired, tooLong: t.errors.reasonTooLong }),
});

async function decide(
  adminId: string,
  verificationId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<ReviewState | null> {
  try {
    const result = await decideVerification({ adminId, verificationId, decision, reason });
    if (result.ok) return null;
    return { message: errorMessages[result.error], reasons: result.reasons };
  } catch {
    return { message: adminText.common.genericError };
  }
}

export async function approveVerification(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const parsed = approveSchema.safeParse({ verificationId: formData.get("verificationId") });
  if (!parsed.success) return { message: adminText.common.invalidId };

  const failure = await decide(admin.id, parsed.data.verificationId, "approve");
  if (failure) return failure;

  revalidatePath("/admin", "layout");
  redirect(`/admin/verifizierungen/${parsed.data.verificationId}?erledigt=bestaetigt`);
}

export async function rejectVerification(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const values = { reason: String(formData.get("reason") ?? "") };
  const parsed = rejectSchema.safeParse({
    verificationId: formData.get("verificationId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    if (fieldErrors.verificationId) return { message: adminText.common.invalidId, values };
    return { fieldErrors, values };
  }

  const failure = await decide(admin.id, parsed.data.verificationId, "reject", parsed.data.reason);
  if (failure) return { ...failure, values };

  revalidatePath("/admin", "layout");
  redirect(`/admin/verifizierungen/${parsed.data.verificationId}?erledigt=abgelehnt`);
}
