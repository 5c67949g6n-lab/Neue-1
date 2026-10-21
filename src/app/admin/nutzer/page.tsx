import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { parsePage, parseSearchQuery } from "@/lib/admin/schemas";
import { listUsersForAdmin, personName, SEARCH_SCAN_LIMIT } from "@/lib/admin/users";
import { formatDate } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { Alert, Badge, PageHeader } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { PersonLabel, VerificationStatusBadge } from "../ui";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: adminText.users.title };

const t = adminText.users;

function pageHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("seite", String(page));
  const search = params.toString();
  return search ? `/admin/nutzer?${search}` : "/admin/nutzer";
}

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/nutzer">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const query = parseSearchQuery(params.q);
  const result = await listUsersForAdmin({ query, page: parsePage(params.seite) });

  return (
    <>
      <PageHeader title={t.title} description={t.description} />

      <form method="get" role="search" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-sm">
          <Label htmlFor="q">{t.searchLabel}</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={t.searchPlaceholder}
            maxLength={100}
          />
        </div>
        <Button type="submit" variant="outline">
          {t.searchSubmit}
        </Button>
        {query ? (
          <ButtonLink href="/admin/nutzer" variant="ghost">
            {t.searchReset}
          </ButtonLink>
        ) : null}
      </form>

      <p className="text-muted-foreground mb-3 text-sm" aria-live="polite">
        {t.resultCount(result.total)}
        {result.truncated ? ` · ${t.searchLimit(SEARCH_SCAN_LIMIT)}` : null}
      </p>

      {result.users.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground text-sm">{t.empty}</p>
        </Card>
      ) : (
        <ul className="space-y-3" data-testid="user-list">
          {result.users.map((user) => {
            const isSelf = user.id === admin.id;
            const name = personName(user) ?? user.email;
            return (
              <li key={user.id} data-testid="user-row" data-email={user.email}>
                <Card className="p-4">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <PersonLabel {...user} />
                        {isSelf ? <Badge tone="info">{adminText.common.you}</Badge> : null}
                      </div>
                      <p className="truncate text-sm">{user.email}</p>
                      <dl className="text-muted-foreground grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
                        <dt>{t.columns.createdAt}</dt>
                        <dd>{formatDate(user.createdAt)}</dd>
                        <dt>{t.columns.status}</dt>
                        <dd>
                          <Badge tone={user.status === "active" ? "success" : "danger"}>
                            {t.status[user.status]}
                          </Badge>
                        </dd>
                        <dt>{t.columns.admin}</dt>
                        <dd>{user.isAdmin ? adminText.common.yes : adminText.common.no}</dd>
                        <dt>{t.columns.verification}</dt>
                        <dd className="flex flex-wrap gap-1">
                          <VerificationStatusBadge status={user.renterVerification} />
                          {user.ownerVerification ? (
                            <Badge tone="neutral">
                              {adminText.verificationKind.owner}:{" "}
                              {adminText.verificationStatus[user.ownerVerification]}
                            </Badge>
                          ) : null}
                        </dd>
                      </dl>
                      {user.status === "suspended" && user.suspendedReason ? (
                        <Alert tone="danger" className="p-3">
                          <span className="font-medium">{t.suspendedReason}:</span>{" "}
                          {user.suspendedReason}
                        </Alert>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      {isSelf ? null : (
                        <UserActions
                          userId={user.id}
                          name={name}
                          suspended={user.status === "suspended"}
                          isAdmin={user.isAdmin}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {result.pages > 1 ? (
        <nav aria-label={t.title} className="mt-4 flex items-center justify-between gap-3 text-sm">
          {result.page > 1 ? (
            <Link href={pageHref(query, result.page - 1)} className="text-primary font-medium">
              ← {adminText.common.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {adminText.common.page(result.page, result.pages)}
          </span>
          {result.page < result.pages ? (
            <Link href={pageHref(query, result.page + 1)} className="text-primary font-medium">
              {adminText.common.next} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <p className="text-muted-foreground mt-6 text-xs">{t.sessionsNote}</p>
    </>
  );
}
