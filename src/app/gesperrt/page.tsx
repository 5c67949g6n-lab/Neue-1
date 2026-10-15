import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Konto gesperrt" };

export default function SuspendedPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Dein Konto ist gesperrt</h1>
      <p className="text-muted-foreground mt-2">
        Wenn du glaubst, dass das ein Fehler ist, schreib uns an {brand.supportEmail}.
      </p>
    </section>
  );
}
