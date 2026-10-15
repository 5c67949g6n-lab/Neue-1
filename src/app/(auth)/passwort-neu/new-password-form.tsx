"use client";

import { useActionState } from "react";
import { updatePassword, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { authText } from "@/i18n/de/auth";

const initialState: FormState = {};

export function NewPasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const t = authText.reset;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <Field id="password" label={t.password} hint={t.passwordHint} error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : "password-hint"}
        />
      </Field>

      <Field id="passwordRepeat" label={t.passwordRepeat} error={errors.passwordRepeat}>
        <Input
          id="passwordRepeat"
          name="passwordRepeat"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.passwordRepeat)}
          aria-describedby={errors.passwordRepeat ? "passwordRepeat-error" : undefined}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
