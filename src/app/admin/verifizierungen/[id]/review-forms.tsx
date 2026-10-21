"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { approveVerification, rejectVerification, type ReviewState } from "./actions";

const t = adminText.verificationDetail;
const initialState: ReviewState = {};

function ErrorAlert({ state }: { state: ReviewState }) {
  if (!state.message) return null;
  return (
    <Alert tone="danger">
      {state.message}
      {state.reasons && state.reasons.length > 0 ? (
        <ul className="mt-2 list-disc pl-5">
          {state.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </Alert>
  );
}

export function ApproveForm({ verificationId }: { verificationId: string }) {
  const [state, formAction, pending] = useActionState(approveVerification, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="verificationId" value={verificationId} />
      <ErrorAlert state={state} />
      <p className="text-muted-foreground text-sm">{t.approveHint}</p>
      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? t.approving : t.approve}
      </Button>
    </form>
  );
}

export function RejectForm({ verificationId }: { verificationId: string }) {
  const [state, formAction, pending] = useActionState(rejectVerification, initialState);
  const [reason, setReason] = useState(state.values?.reason ?? "");
  const error = state.fieldErrors?.reason;

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="verificationId" value={verificationId} />
      <ErrorAlert state={state} />

      <div>
        <p className="text-muted-foreground mb-2 text-sm" id="reason-templates">
          {t.templatesLabel}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="reason-templates">
          {t.templates.map((template) => (
            <Button
              key={template}
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto min-h-9 py-1.5 text-left"
              onClick={() => setReason(template)}
            >
              {template}
            </Button>
          ))}
        </div>
      </div>

      <Field id="reason" label={t.rejectReason} hint={t.rejectReasonHint} error={error}>
        <Textarea
          id="reason"
          name="reason"
          required
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "reason-error" : "reason-hint"}
        />
      </Field>

      <Button type="submit" variant="destructive" className="w-full sm:w-auto" disabled={pending}>
        {pending ? t.rejecting : t.reject}
      </Button>
    </form>
  );
}
