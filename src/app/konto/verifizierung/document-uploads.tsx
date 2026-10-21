"use client";

import { useEffect, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_IDENTITY_IMAGE_BYTES } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { RENTER_DOCUMENT_KINDS, type RenterDocumentKind } from "@/lib/verification/schema";
import { verificationText } from "@/i18n/de/verification";
import { uploadDocumentAction } from "./actions";
import { prepareImage } from "./prepare-image";

const t = verificationText.documents;
const errors = verificationText.errors;

type TileState =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "uploading" }
  | { phase: "error"; message: string };

export function DocumentUploads({ uploaded }: { uploaded: RenterDocumentKind[] }) {
  const uploadedSet = new Set(uploaded);
  const done = RENTER_DOCUMENT_KINDS.filter((kind) => uploadedSet.has(kind)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium" data-testid="upload-progress">
            {t.progress(done, RENTER_DOCUMENT_KINDS.length)}
          </p>
          <div
            className="bg-muted h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={t.title}
            aria-valuemin={0}
            aria-valuemax={RENTER_DOCUMENT_KINDS.length}
            aria-valuenow={done}
          >
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${(done / RENTER_DOCUMENT_KINDS.length) * 100}%` }}
            />
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {RENTER_DOCUMENT_KINDS.map((kind) => (
            <DocumentTile key={kind} kind={kind} uploaded={uploadedSet.has(kind)} />
          ))}
        </ul>
        <p className="text-muted-foreground text-sm">{t.replaceHint}</p>
      </CardContent>
    </Card>
  );
}

function DocumentTile({ kind, uploaded }: { kind: RenterDocumentKind; uploaded: boolean }) {
  const [state, setState] = useState<TileState>({ phase: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { label, hint } = t.kinds[kind];
  const busy = state.phase === "preparing" || state.phase === "uploading";

  // Vorschau-URL wieder freigeben
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
    event.target.value = "";
    if (!file) return;

    setState({ phase: "preparing" });
    let jpeg: Blob;
    try {
      jpeg = await prepareImage(file);
    } catch {
      setState({ phase: "error", message: errors.imageUnreadable });
      return;
    }
    if (jpeg.size > MAX_IDENTITY_IMAGE_BYTES) {
      setState({ phase: "error", message: errors.fileTooLarge });
      return;
    }

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", new File([jpeg], `${kind}.jpg`, { type: "image/jpeg" }));
    setState({ phase: "uploading" });
    startTransition(async () => {
      try {
        const result = await uploadDocumentAction(formData);
        if (result.ok) {
          setPreview(URL.createObjectURL(jpeg));
          setState({ phase: "idle" });
        } else {
          setState({ phase: "error", message: result.message });
        }
      } catch {
        setState({ phase: "error", message: errors.uploadFailed });
      }
    });
  }

  const statusId = `${kind}-status`;
  let status: ReactNode;
  if (state.phase === "preparing") status = t.preparing;
  else if (state.phase === "uploading") status = t.uploading;
  else if (state.phase === "error") status = state.message;
  else if (uploaded) status = t.uploaded;
  else status = t.missing;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4",
        state.phase === "error"
          ? "border-destructive/40"
          : uploaded
            ? "border-success/40 bg-success-bg/40"
            : "border-border",
      )}
      data-testid={`document-${kind}`}
      aria-busy={busy}
    >
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokale Blob-Vorschau
            <img src={preview} alt={t.previewAlt(label)} className="size-full object-cover" />
          ) : (
            <DocumentIcon />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground text-sm">{hint}</p>
          <p
            id={statusId}
            aria-live="polite"
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              state.phase === "error"
                ? "text-destructive"
                : busy
                  ? "text-info"
                  : uploaded
                    ? "text-success"
                    : "text-muted-foreground",
            )}
          >
            {busy ? <Spinner /> : null}
            {!busy && state.phase !== "error" && uploaded ? <CheckIcon /> : null}
            <span>{status}</span>
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <FileButton
          id={`${kind}-camera`}
          label={t.takePhoto}
          ariaLabel={`${label}: ${t.takePhoto}`}
          capture
          disabled={busy}
          describedBy={statusId}
          onChange={handleChange}
        />
        <FileButton
          id={`${kind}-file`}
          label={t.chooseFile}
          ariaLabel={`${label}: ${t.chooseFile}`}
          disabled={busy}
          describedBy={statusId}
          onChange={handleChange}
        />
      </div>
    </li>
  );
}

/** Verstecktes Datei-Feld mit sichtbarem, fokussierbarem Label im Button-Stil. */
function FileButton({
  id,
  label,
  ariaLabel,
  capture,
  disabled,
  describedBy,
  onChange,
}: {
  id: string;
  label: string;
  ariaLabel: string;
  capture?: boolean;
  disabled: boolean;
  describedBy: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1 basis-38">
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        className="peer sr-only"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onChange={onChange}
      />
      <label
        htmlFor={id}
        className={buttonClasses(
          capture ? "primary" : "outline",
          "sm",
          cn(
            "w-full cursor-pointer px-3 whitespace-nowrap",
            "peer-focus-visible:outline-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
            "peer-disabled:pointer-events-none peer-disabled:opacity-50",
          ),
        )}
      >
        {capture ? <CameraIcon /> : null}
        {label}
      </label>
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-7"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 animate-spin" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
