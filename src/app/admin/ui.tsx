import type { ReactNode } from "react";
import { Badge } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import type { Database } from "@/lib/supabase/database.types";

type VerificationStatus = Database["public"]["Enums"]["verification_status"];

const statusTone = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  expired: "neutral",
} as const;

export function VerificationStatusBadge({ status }: { status: VerificationStatus | null }) {
  if (!status) return <Badge tone="neutral">{adminText.verificationStatus.none}</Badge>;
  return <Badge tone={statusTone[status]}>{adminText.verificationStatus[status]}</Badge>;
}

/** Name für Listen: "Vorname Nachname" plus Anzeigename (falls abweichend). */
export function PersonLabel({
  displayName,
  firstName,
  lastName,
}: {
  displayName: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  const primary = full || displayName || adminText.common.noName;
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium">{primary}</span>
      {full && displayName && displayName !== full ? (
        <span className="text-muted-foreground block truncate text-xs">„{displayName}“</span>
      ) : null}
    </span>
  );
}

/** Definitionsliste für Detailansichten (mobil untereinander, ab sm zweispaltig). */
export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">{children}</dl>;
}

export function DetailItem({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="-mt-2 text-sm font-medium break-words sm:mt-0">{children}</dd>
    </>
  );
}
