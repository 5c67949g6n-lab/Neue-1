import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getAdminStats } from "@/lib/admin/stats";
import { listVerifications } from "@/lib/admin/verifications";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { PersonLabel } from "./ui";

export const metadata: Metadata = { title: adminText.overview.title };

const t = adminText.overview;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [stats, oldest, settings] = await Promise.all([
    getAdminStats(),
    listVerifications({ status: "pending", limit: 5 }),
    getSettings(),
  ]);

  const tiles = [
    {
      label: t.stats.pendingVerifications,
      value: stats.pendingVerifications,
      href: "/admin/verifizierungen",
    },
    { label: t.stats.users, value: stats.users, href: "/admin/nutzer" },
    { label: t.stats.activeListings, value: stats.activeListings },
    { label: t.stats.openDamageCases, value: stats.openDamageCases },
    {
      label: t.stats.bookings,
      value: stats.bookings,
      sub: `${stats.runningBookings} ${t.stats.runningBookings}`,
    },
  ];

  return (
    <>
      <PageHeader title={t.title} description={t.description} />

      <Alert tone={settings.live_bookings_enabled ? "warning" : "neutral"} className="mb-6">
        {settings.live_bookings_enabled ? t.liveBookingsOn : t.liveBookingsOff}
      </Alert>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label={t.title}>
        {tiles.map((tile) => {
          const body = (
            <>
              <span className="text-muted-foreground block text-sm">{tile.label}</span>
              <span className="mt-1 block text-3xl font-bold tabular-nums">{tile.value}</span>
              {tile.sub ? (
                <span className="text-muted-foreground mt-1 block text-xs">{tile.sub}</span>
              ) : null}
            </>
          );
          return (
            <li key={tile.label} data-testid="admin-stat">
              {tile.href ? (
                <Link
                  href={tile.href}
                  className="border-border bg-card hover:bg-muted block h-full rounded-xl border p-4 shadow-sm transition-colors"
                >
                  {body}
                </Link>
              ) : (
                <div className="border-border bg-card h-full rounded-xl border p-4 shadow-sm">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t.oldestTitle}</CardTitle>
          <ButtonLink href="/admin/verifizierungen" variant="outline" size="sm">
            {t.showAll}
          </ButtonLink>
        </CardHeader>
        <CardContent>
          {oldest.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.oldestEmpty}</p>
          ) : (
            <ul className="divide-border divide-y">
              {oldest.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/admin/verifizierungen/${item.id}`}
                    prefetch={false}
                    className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3"
                  >
                    <PersonLabel {...item} />
                    <span className="text-muted-foreground shrink-0 text-right text-xs">
                      {adminText.verificationKind[item.kind]}
                      <br />
                      {item.submittedAt ? formatDateTime(item.submittedAt) : "–"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
