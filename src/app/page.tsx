import { brand } from "@/config/brand";

// Platzhalter – die richtige Startseite folgt.
export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
      <p className="text-muted-foreground mt-2">{brand.claim}</p>
    </section>
  );
}
