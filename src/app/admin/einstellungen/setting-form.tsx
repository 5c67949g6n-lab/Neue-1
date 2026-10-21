"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { formatCents } from "@/lib/utils";
import { formatSettingValue } from "@/lib/admin/schemas";
import { adminText } from "@/i18n/de/admin";
import { saveSetting, type SettingFormState } from "./actions";

const t = adminText.settings;
const initialState: SettingFormState = {};

export function SettingForm({
  settingKey,
  kind,
  value,
  bounds,
  label,
}: {
  settingKey: string;
  kind: "boolean" | "number";
  value: number | boolean;
  bounds: { min: number; max: number } | null;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(saveSetting, initialState);
  const [current, setCurrent] = useState(state.values?.value ?? String(value));
  const id = `setting-${settingKey}`;
  const error = state.fieldErrors?.value;
  const confirmError = state.fieldErrors?.confirm;
  const isLive = settingKey === "live_bookings_enabled";
  const needsConfirm = isLive && current === "true" && value !== true;
  const isCents = settingKey.endsWith("_cents");

  const centsPreview =
    isCents && /^\d+$/.test(current) ? t.cents(formatCents(Number(current))) : null;
  const hint = [
    bounds ? t.range(formatSettingValue(bounds.min), formatSettingValue(bounds.max)) : null,
    centsPreview,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="key" value={settingKey} />

      {state.message ? (
        <Alert tone={state.ok ? "success" : "danger"} className="p-3">
          {state.message}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field
          id={id}
          label={`${t.newValue}: ${label}`}
          hint={hint || undefined}
          error={error}
          className="min-w-0 flex-1 [&>label]:sr-only"
        >
          {kind === "boolean" ? (
            <Select
              id={id}
              name="value"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              className="sm:max-w-40"
            >
              <option value="true">{t.yes}</option>
              <option value="false">{t.no}</option>
            </Select>
          ) : (
            <Input
              id={id}
              name="value"
              type="number"
              inputMode="numeric"
              step={1}
              min={bounds?.min}
              max={bounds?.max}
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
              className="sm:max-w-40"
            />
          )}
        </Field>
        <Button type="submit" variant="outline" disabled={pending} className="shrink-0">
          {pending ? t.saving : t.save}
        </Button>
      </div>

      {needsConfirm ? (
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="confirm"
              className="accent-primary mt-0.5 size-4 shrink-0"
              aria-invalid={Boolean(confirmError)}
              aria-describedby={confirmError ? `${id}-confirm-error` : undefined}
            />
            <span>{t.liveConfirm}</span>
          </label>
          {confirmError ? (
            <p id={`${id}-confirm-error`} className="text-destructive text-sm" role="alert">
              {confirmError[0]}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
