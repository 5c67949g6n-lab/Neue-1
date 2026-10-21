"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { changeUser, type UserActionState } from "./actions";

const t = adminText.users.actions;
type Kind = "suspend" | "unsuspend" | "grant_admin" | "revoke_admin";

const labels: Record<Kind, string> = {
  suspend: t.suspend,
  unsuspend: t.unsuspend,
  grant_admin: t.grantAdmin,
  revoke_admin: t.revokeAdmin,
};

const confirmTexts: Record<Kind, (name: string) => string> = {
  suspend: t.confirmSuspend,
  unsuspend: t.confirmUnsuspend,
  grant_admin: t.confirmGrantAdmin,
  revoke_admin: t.confirmRevokeAdmin,
};

const initialState: UserActionState = {};

/** Zweistufig: erst Aktion wählen, dann ausdrücklich bestätigen. */
export function UserActions({
  userId,
  name,
  suspended,
  isAdmin,
}: {
  userId: string;
  name: string;
  suspended: boolean;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(changeUser, initialState);
  // Auswahl merkt sich den Formularzustand, unter dem sie getroffen wurde
  const [choice, setChoice] = useState<{ kind: Kind; after: UserActionState } | null>(null);
  const reasonId = `reason-${userId}`;
  const reasonError = state.fieldErrors?.reason;

  const available: Kind[] = [
    suspended ? "unsuspend" : "suspend",
    isAdmin ? "revoke_admin" : "grant_admin",
  ];
  // Nach erfolgreicher Aktion zurück zur Auswahl (der neue Zustand kommt vom Server)
  const active = choice && (state === choice.after || !state.ok) ? choice.kind : null;
  const showMessage = Boolean(state.message) && !(active && state.ok);

  return (
    <div className="space-y-2">
      {showMessage ? (
        <Alert tone={state.ok ? "success" : "danger"} className="p-3">
          {state.message}
        </Alert>
      ) : null}

      {active ? (
        <form
          action={formAction}
          className="border-border space-y-3 rounded-lg border p-3"
          noValidate
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="action" value={active} />
          <p className="text-sm font-medium">{confirmTexts[active](name)}</p>
          {active === "suspend" ? (
            <Field
              id={reasonId}
              label={t.suspendReason}
              hint={t.suspendReasonHint}
              error={reasonError}
            >
              <Textarea
                id={reasonId}
                name="reason"
                required
                maxLength={500}
                defaultValue={state.values?.reason}
                aria-invalid={Boolean(reasonError)}
                aria-describedby={reasonError ? `${reasonId}-error` : `${reasonId}-hint`}
                className="min-h-20"
              />
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              variant={
                active === "suspend" || active === "revoke_admin" ? "destructive" : "primary"
              }
              disabled={pending}
            >
              {pending ? t.working : `${labels[active]}: ${t.confirm}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setChoice(null)}
            >
              {adminText.common.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setChoice({ kind, after: state })}
            >
              {labels[kind]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
