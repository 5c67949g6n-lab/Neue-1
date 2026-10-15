"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { authText } from "@/i18n/de/auth";

const initialState: FormState = {};

function describedBy(id: string, error: unknown, hint = false) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const t = authText.register;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field
        id="displayName"
        label={t.displayName}
        hint={t.displayNameHint}
        error={errors.displayName}
      >
        <Input
          id="displayName"
          name="displayName"
          autoComplete="nickname"
          required
          maxLength={60}
          defaultValue={state.values?.displayName}
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={describedBy("displayName", errors.displayName, true)}
        />
      </Field>

      <Field id="email" label={t.email} error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email", errors.email)}
        />
      </Field>

      <Field id="password" label={t.password} hint={t.passwordHint} error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy("password", errors.password, true)}
        />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-start gap-3">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            defaultChecked={state.values?.terms === "on"}
            className="border-input accent-primary mt-0.5 size-5 shrink-0 rounded"
            aria-invalid={Boolean(errors.terms)}
            aria-describedby={describedBy("terms", errors.terms)}
          />
          <label htmlFor="terms" className="text-sm leading-6">
            {t.termsBefore}
            <Link href="/agb" target="_blank" className="text-primary font-medium underline">
              {t.termsAgb}
            </Link>
            {t.termsBetween}
            <Link
              href="/datenschutz"
              target="_blank"
              className="text-primary font-medium underline"
            >
              {t.termsPrivacy}
            </Link>
            {t.termsAfter}
          </label>
        </div>
        {errors.terms ? (
          <p id="terms-error" className="text-destructive text-sm" role="alert">
            {errors.terms[0]}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
