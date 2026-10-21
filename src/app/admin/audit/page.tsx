import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import {
  AUDIT_ACTIONS,
  AUDIT_LIMIT,
  AUDIT_TARGET_TYPES,
  listAuditEntries,
  type AuditEntry,
} from "@/lib/admin/audit";
import { isUuid } from "@/lib/admin/schemas";
import { formatDateTime } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";

export const metadata: Metadata = { title: adminText.audit.title };

const t = adminText.audit;

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return (allowed as readonly unknown[]).includes(value) ? (value as T) : undefined;
}

function targetHref(entry: AuditEntry): string | null {
  if (!entry.targetId) return null;
  if (entry.targetType === "verification" && isUuid(entry.targetId)) {
    return `/admin/verifizierungen/${entry.targetId}`;
  }
  return null;
}

function Details({ details }: { details: AuditEntry["details"] }) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const entries = Object.entries(details);
  if (entries.length === 0) return null;
  return (
    <dl className="text-muted-foreground grid grid-cols-[max-content_1fr] gap-x-2 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-mono">{key}</dt>
          <dd className="font-mono break-all">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const params = await searchParams;
  const action = pick(params.aktion, AUDIT_ACTIONS);
  const targetType = pick(params.ziel, AUDIT_TARGET_TYPES);
  const rawTargetId = typeof params.zielId === "string" ? params.zielId.trim().slice(0, 100) : "";
  const targetId = rawTargetId || undefined;
  const entries = await listAuditEntries({ action, targetType, targetId });
  const filtered = Boolean(action || targetType || targetId);

  return (
    <>
      <PageHeader title={t.title} description={t.description(AUDIT_LIMIT)} />

      <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="aktion">{t.filterAction}</Label>
          <Select id="aktion" name="aktion" defaultValue={action ?? ""}>
            <option value="">{t.filterAll}</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {t.actions[value] ?? value}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ziel">{t.filterTarget}</Label>
          <Select id="ziel" name="ziel" defaultValue={targetType ?? ""}>
            <option value="">{t.filterAll}</option>
            {AUDIT_TARGET_TYPES.map((value) => (
              <option key={value} value={value}>
                {t.targets[value] ?? value}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zielId">{t.filterTargetId}</Label>
          <Input id="zielId" name="zielId" defaultValue={rawTargetId} maxLength={100} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            {t.filterSubmit}
          </Button>
          {filtered ? (
            <ButtonLink href="/admin/audit" variant="ghost">
              {t.filterReset}
            </ButtonLink>
          ) : null}
        </div>
      </form>

      {entries.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">{t.empty}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-border divide-y" data-testid="audit-list">
            {entries.map((entry) => {
              const href = targetHref(entry);
              const target = `${t.targets[entry.targetType] ?? entry.targetType}${
                entry.targetId ? `: ${entry.targetId}` : ""
              }`;
              return (
                <li
                  key={entry.id}
                  data-testid="audit-entry"
                  className="grid gap-1 p-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-4"
                >
                  <div className="text-sm">
                    <time dateTime={entry.createdAt} className="font-medium">
                      {formatDateTime(entry.createdAt)}
                    </time>
                    <p className="text-muted-foreground truncate text-xs">
                      {entry.adminName ??
                        (entry.adminId ? adminText.common.unknown : t.deletedAdmin)}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{t.actions[entry.action] ?? entry.action}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {href ? (
                        <Link href={href} prefetch={false} className="text-primary hover:underline">
                          {target}
                        </Link>
                      ) : (
                        target
                      )}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <Details details={entry.details} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
