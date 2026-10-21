"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { LICENSE_CLASSES } from "@/lib/verification/schema";
import { verificationText } from "@/i18n/de/verification";
import { submitVerificationAction, type SubmitFormState } from "./actions";

const initialState: SubmitFormState = {};
const t = verificationText.form;

function describedBy(id: string, error: unknown, hint = false) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export function VerificationForm({
  documentsComplete,
  today,
}: {
  documentsComplete: boolean;
  /** heutiges Datum (YYYY-MM-DD) als Obergrenze der Datumsfelder */
  today: string;
}) {
  const [state, formAction, pending] = useActionState(submitVerificationAction, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const selectedClasses = new Set<string>(values?.licenseClasses ?? ["B"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5" noValidate>
          {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
          {state.reasons && state.reasons.length > 0 ? (
            <Alert tone="danger" title={t.notEligibleTitle} data-testid="not-eligible">
              <ul className="list-disc space-y-1 pl-5">
                {state.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="mt-2">{t.notEligibleHint}</p>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="dateOfBirth" label={t.dateOfBirth} error={errors.dateOfBirth}>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                autoComplete="bday"
                min="1900-01-01"
                max={today}
                required
                defaultValue={values?.dateOfBirth}
                aria-invalid={Boolean(errors.dateOfBirth)}
                aria-describedby={describedBy("dateOfBirth", errors.dateOfBirth)}
              />
            </Field>
            <Field
              id="licenseIssuedOn"
              label={t.licenseIssuedOn}
              hint={t.licenseIssuedOnHint}
              error={errors.licenseIssuedOn}
            >
              <Input
                id="licenseIssuedOn"
                name="licenseIssuedOn"
                type="date"
                min="1900-01-01"
                max={today}
                required
                defaultValue={values?.licenseIssuedOn}
                aria-invalid={Boolean(errors.licenseIssuedOn)}
                aria-describedby={describedBy("licenseIssuedOn", errors.licenseIssuedOn, true)}
              />
            </Field>
          </div>

          <fieldset
            className="space-y-2"
            aria-describedby={
              errors.licenseClasses ? "licenseClasses-error" : "licenseClasses-hint"
            }
            aria-invalid={Boolean(errors.licenseClasses)}
          >
            <legend className="text-sm font-medium">{t.licenseClasses}</legend>
            <p id="licenseClasses-hint" className="text-muted-foreground text-sm">
              {t.licenseClassesHint}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LICENSE_CLASSES.map((licenseClass) => (
                <label
                  key={licenseClass}
                  className={cn(
                    "border-input bg-card flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    "has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:outline-ring has-focus-visible:outline-2",
                  )}
                >
                  <input
                    type="checkbox"
                    name="licenseClasses"
                    value={licenseClass}
                    defaultChecked={selectedClasses.has(licenseClass)}
                    className="accent-primary size-4 shrink-0"
                  />
                  <span>{verificationText.licenseClasses[licenseClass]}</span>
                </label>
              ))}
            </div>
            {errors.licenseClasses ? (
              <p id="licenseClasses-error" className="text-destructive text-sm" role="alert">
                {errors.licenseClasses[0]}
              </p>
            ) : null}
          </fieldset>

          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                required
                defaultChecked={values?.consent}
                className="accent-primary mt-0.5 size-5 shrink-0"
                aria-invalid={Boolean(errors.consent)}
                aria-describedby={errors.consent ? "consent-error" : undefined}
              />
              <span>{t.consent}</span>
            </label>
            {errors.consent ? (
              <p id="consent-error" className="text-destructive text-sm" role="alert">
                {errors.consent[0]}
              </p>
            ) : null}
          </div>

          {!documentsComplete ? (
            <p className="text-muted-foreground text-sm">{t.missingDocumentsHint}</p>
          ) : null}

          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
            {pending ? t.submitting : t.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
