"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminText } from "@/i18n/de/admin";

const t = adminText.nav;

const ITEMS = [
  { href: "/admin", label: t.overview, exact: true },
  { href: "/admin/verifizierungen", label: t.verifications },
  { href: "/admin/nutzer", label: t.users },
  { href: "/admin/einstellungen", label: t.settings },
  { href: "/admin/audit", label: t.audit },
] as const;

/** Admin-Navigation – auf schmalen Bildschirmen horizontal scrollbar. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label={t.label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {ITEMS.map((item) => {
          const active =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
