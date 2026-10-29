import Link from "next/link";
import { brand } from "@/config/brand";

const legalLinks = [
  { href: "/vermieten", label: "Auto vermieten" },
  { href: "/agb", label: "AGB" },
  { href: "/mietvertrag", label: "Mietvertrag" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/impressum", label: "Impressum" },
];

export function SiteFooter() {
  return (
    <footer className="border-border bg-card border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {brand.name} · Testprojekt · Start in {brand.city}
        </p>
        <nav aria-label="Weitere Links" className="-my-1.5 flex flex-wrap gap-x-4">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // py für ausreichend große Touch-Ziele auf dem Handy
              className="hover:text-foreground inline-block py-1.5"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
