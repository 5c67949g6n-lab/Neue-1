import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-primary text-sm font-semibold">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Seite nicht gefunden</h1>
      <p className="text-muted-foreground mt-2">Diese Seite gibt es nicht (mehr).</p>
      <ButtonLink href="/" variant="outline" className="mt-6">
        Zur Startseite
      </ButtonLink>
    </section>
  );
}
