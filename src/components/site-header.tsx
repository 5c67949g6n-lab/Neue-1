import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

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

        <nav aria-label="Hauptnavigation" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/vermieten"
            className="hover:bg-muted hidden rounded-lg px-3 py-2 text-sm font-medium sm:inline-block"
          >
            Auto vermieten
          </Link>
          {user ? (
            <>
              {user.isAdmin ? (
                <Link
                  href="/admin"
                  className="hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium"
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/konto"
                className="hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium"
              >
                Mein Konto
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-muted-foreground hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium"
                >
                  Abmelden
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium"
              >
                Anmelden
              </Link>
              <ButtonLink href="/registrieren" size="sm">
                Registrieren
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
