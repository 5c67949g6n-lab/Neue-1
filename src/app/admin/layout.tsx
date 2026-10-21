import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { Badge } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: { default: adminText.nav.overview, template: `%s · ${adminText.badge}` },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Vorab-Prüfung für den ganzen Bereich – jede Seite und Action prüft zusätzlich selbst
  const admin = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <div className="border-border mb-6 space-y-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning" className="tracking-wide uppercase">
            {adminText.badge}
          </Badge>
          <span className="text-muted-foreground truncate text-sm">
            {adminText.areaLabel} · {admin.email}
          </span>
        </div>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
