"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { reasonSchema, uuidSchema } from "@/lib/admin/schemas";
import { applyUserAction, type UserActionKind } from "@/lib/admin/users";
import { adminText } from "@/i18n/de/admin";

export type UserActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { reason?: string };
};

const t = adminText.users;

const ACTIONS = [
  "suspend",
  "unsuspend",
  "grant_admin",
  "revoke_admin",
] as const satisfies readonly UserActionKind[];

const baseSchema = z.object({ userId: uuidSchema, action: z.enum(ACTIONS) });
const reason = reasonSchema({ required: t.errors.reasonRequired, tooLong: t.errors.reasonTooLong });

const doneMessages: Record<UserActionKind, string> = {
  suspend: t.done.suspend,
  unsuspend: t.done.unsuspend,
  grant_admin: t.done.grantAdmin,
  revoke_admin: t.done.revokeAdmin,
};

/** Sperren/Entsperren und Admin-Rechte – nie für das eigene Konto. */
export async function changeUser(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  const values = { reason: String(formData.get("reason") ?? "") };

  const parsed = baseSchema.safeParse({
    userId: formData.get("userId"),
    action: formData.get("action"),
  });
  if (!parsed.success) return { message: adminText.common.invalidId, values };
  const { userId, action } = parsed.data;
  if (userId === admin.id) return { message: t.errors.self, values };

  let suspendReason: string | undefined;
  if (action === "suspend") {
    const parsedReason = reason.safeParse(formData.get("reason"));
    if (!parsedReason.success) {
      return {
        fieldErrors: { reason: parsedReason.error.issues.map((issue) => issue.message) },
        values,
      };
    }
    suspendReason = parsedReason.data;
  }

  let result;
  try {
    result = await applyUserAction({
      adminId: admin.id,
      targetId: userId,
      action,
      reason: suspendReason,
    });
  } catch {
    return { message: adminText.common.genericError, values };
  }
  if (!result.ok) {
    const message =
      result.error === "self"
        ? t.errors.self
        : result.error === "not_found"
          ? t.errors.notFound
          : t.errors.unchanged;
    return { message, values };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: doneMessages[action] };
}
