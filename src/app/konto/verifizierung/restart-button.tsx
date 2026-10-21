"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { verificationText } from "@/i18n/de/verification";
import { restartVerificationAction, type RestartState } from "./actions";

const initialState: RestartState = {};

/** "Neu einreichen" nach Ablehnung oder Ablauf – legt einen neuen Entwurf an. */
export function RestartButton() {
  const [state, formAction, pending] = useActionState(
    async () => restartVerificationAction(),
    initialState,
  );
  const t = verificationText.status;

  return (
    <form action={formAction} className="space-y-3">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.restarting : t.restart}
      </Button>
    </form>
  );
}
