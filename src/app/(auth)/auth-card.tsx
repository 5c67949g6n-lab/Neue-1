import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Schmale Karte für alle Auth-Seiten (Login, Registrierung, Passwort). */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle as="h1" className="text-2xl">
            {title}
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
