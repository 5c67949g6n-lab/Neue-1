"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { accountText } from "@/i18n/de/account";

const initialState: ProfileFormState = {};

type Profile = {
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

function describedBy(id: string, error: unknown, hint = false) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const t = accountText.profile;
  const errors = state.fieldErrors ?? {};
  // Nach dem Absenden die eingegebenen Werte behalten, sonst die gespeicherten zeigen
  const values = state.values ?? {
    displayName: profile.displayName,
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
  };
  const optional = <span className="text-muted-foreground font-normal">{t.optional}</span>;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {!state.ok && state.message ? <Alert tone="danger">{state.message}</Alert> : null}

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
          defaultValue={values.displayName}
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={describedBy("displayName", errors.displayName, true)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="firstName"
          label={
            <>
              {t.firstName} {optional}
            </>
          }
          error={errors.firstName}
        >
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            maxLength={100}
            defaultValue={values.firstName}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={describedBy("firstName", errors.firstName)}
          />
        </Field>
        <Field
          id="lastName"
          label={
            <>
              {t.lastName} {optional}
            </>
          }
          error={errors.lastName}
        >
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            maxLength={100}
            defaultValue={values.lastName}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={describedBy("lastName", errors.lastName)}
          />
        </Field>
      </div>

      <Field
        id="phone"
        label={
          <>
            {t.phone} {optional}
          </>
        }
        hint={t.phoneHint}
        error={errors.phone}
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={40}
          defaultValue={values.phone}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describedBy("phone", errors.phone, true)}
        />
      </Field>

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
