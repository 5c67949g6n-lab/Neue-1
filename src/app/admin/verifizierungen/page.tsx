import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { parseStatusFilter, VERIFICATION_STATUSES } from "@/lib/admin/schemas";
import { listVerifications, VERIFICATION_LIST_LIMIT } from "@/lib/admin/verifications";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { PersonLabel, VerificationStatusBadge } from "../ui";

export const metadata: Metadata = { title: adminText.verifications.title };

const t = adminText.verifications;

export default async function AdminVerificationsPage({
  searchParams,
}: PageProps<"/admin/verifizierungen">) {
  await requireAdmin();
  const params = await searchParams;
  const status = parseStatusFilter(params.status);
  const items = await listVerifications({ status });

  return (
    <>
      <PageHeader title={t.title} description={t.description} />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">{t.filterLabel}</Label>
          <Select id="status" name="status" defaultValue={status} className="w-48">
            {VERIFICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {adminText.verificationStatus[value]}
              </option>
            ))}
            <option value="all">{t.filterAll}</option>
          </Select>
        </div>
        <Button type="submit" variant="outline">
          {t.filterSubmit}
        </Button>
      </form>

      {items.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">{t.empty}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-border divide-y" data-testid="verification-list">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/verifizierungen/${item.id}`}
                  prefetch={false}
                  className="hover:bg-muted grid gap-2 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto_auto_auto] sm:items-center sm:gap-4"
                >
                  <PersonLabel {...item} />
                  <span className="text-muted-foreground truncate text-sm">
                    {item.email || adminText.common.unknown}
                  </span>
                  <span className="text-sm">{adminText.verificationKind[item.kind]}</span>
                  <span className="text-muted-foreground text-sm">
                    {item.submittedAt ? formatDateTime(item.submittedAt) : t.notSubmitted}
                  </span>
                  <span className="flex items-center justify-between gap-3 sm:justify-end">
                    <VerificationStatusBadge status={item.status} />
                    <span className="text-primary text-sm font-medium">
                      {item.status === "pending" ? t.open : t.details}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {items.length >= VERIFICATION_LIST_LIMIT ? (
        <p className="text-muted-foreground mt-3 text-sm">{t.limitHint(VERIFICATION_LIST_LIMIT)}</p>
      ) : null}
    </>
  );
}
