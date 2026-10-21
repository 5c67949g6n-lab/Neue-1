import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

const linkClass = "hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap";
const menuItemClass =
  "hover:bg-muted block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-border bg-background/90 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span
            aria-hidden
            className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg text-sm"
          >
            S
          </span>
          {brand.name}
        </Link>

        {/* ab sm: Links direkt in der Leiste */}
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 sm:flex">
          <Link href="/vermieten" className={linkClass}>
            Auto vermieten
          </Link>
          {user ? (
            <>
              {user.isAdmin ? (
                <Link href="/admin" className={linkClass}>
                  Admin
                </Link>
              ) : null}
              <Link href="/konto" className={linkClass}>
                Mein Konto
              </Link>
              <form action={signOut}>
                <button type="submit" className={`${linkClass} text-muted-foreground`}>
                  Abmelden
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                Anmelden
              </Link>
              <ButtonLink href="/registrieren" size="sm">
                Registrieren
              </ButtonLink>
            </>
          )}
        </nav>

        {/* Mobile: kompaktes Menü ohne JavaScript */}
        <div className="flex items-center gap-2 sm:hidden">
          {user ? null : (
            <ButtonLink href="/login" size="sm" variant="outline">
              Anmelden
            </ButtonLink>
          )}
          <details className="group relative">
            <summary
              aria-label="Menü öffnen"
              className="hover:bg-muted grid size-10 cursor-pointer list-none place-items-center rounded-lg [&::-webkit-details-marker]:hidden"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 7h16M4 12h16M4 17h16" className="group-open:hidden" />
                <path d="M6 6l12 12M18 6L6 18" className="hidden group-open:block" />
              </svg>
            </summary>
            <nav
              aria-label="Hauptnavigation (mobil)"
              className="border-border bg-card absolute right-0 mt-2 w-56 rounded-xl border p-2 shadow-lg"
            >
              <Link href="/vermieten" className={menuItemClass}>
                Auto vermieten
              </Link>
              {user ? (
                <>
                  {user.isAdmin ? (
                    <Link href="/admin" className={menuItemClass}>
                      Admin
                    </Link>
                  ) : null}
                  <Link href="/konto" className={menuItemClass}>
                    Mein Konto
                  </Link>
                  <form action={signOut}>
                    <button type="submit" className={`${menuItemClass} text-muted-foreground`}>
                      Abmelden
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/registrieren" className={menuItemClass}>
                  Registrieren
                </Link>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
