import { ButtonLink } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-primary text-sm font-semibold">403</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Kein Zugriff</h1>
      <p className="text-muted-foreground mt-2">
        Für diesen Bereich fehlen dir die Berechtigungen.
      </p>
      <ButtonLink href="/" variant="outline" className="mt-6">
        Zur Startseite
      </ButtonLink>
    </section>
  );
}
