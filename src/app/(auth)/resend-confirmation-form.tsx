"use client";

import { useActionState } from "react";
import { resendConfirmation, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { authText } from "@/i18n/de/auth";

const initialState: FormState = {};

/**
 * "Mail erneut senden". Ist die Adresse bekannt, wird sie versteckt mitgeschickt,
 * sonst fragt das Formular danach.
 */
export function ResendConfirmationForm({
  email,
  variant = "outline",
}: {
  email?: string;
  variant?: "primary" | "outline";
}) {
  const [state, formAction, pending] = useActionState(resendConfirmation, initialState);
  const t = authText.confirm;
  const error = state.fieldErrors?.email;

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {!state.ok && state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field id="resend-email" label={t.email} error={error}>
          <Input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={state.values?.email}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "resend-email-error" : undefined}
          />
        </Field>
      )}

      <Button type="submit" variant={variant} className="w-full" disabled={pending}>
        {pending ? t.resending : t.resend}
      </Button>
    </form>
  );
}
