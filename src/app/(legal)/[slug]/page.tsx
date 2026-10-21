import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { marketingText } from "@/i18n/de/marketing";

/** Nur diese Rechtstexte gibt es – alle anderen Pfade landen auf der 404-Seite. */
const LEGAL_SLUGS = ["agb", "datenschutz", "impressum", "mietvertrag"] as const;
type LegalSlug = (typeof LEGAL_SLUGS)[number];

function isLegalSlug(slug: string): slug is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(slug);
}

/** Einmal pro Request laden (generateMetadata + Seite). */
const getLegalPage = cache(async (slug: LegalSlug) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_pages")
    .select("slug, title, version, content_md, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Rechtstext konnte nicht geladen werden");
  return data;
});

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return {};
  const page = await getLegalPage(slug);
  return page ? { title: page.title } : {};
}

/** react-markdown reicht `node` mit durch – nicht ans DOM weitergeben. */
function omitNode<T extends ExtraProps>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

// Eigene Styles statt Typography-Plugin; Überschriften eine Ebene tiefer (h1 ist der Seitentitel)
const markdownComponents: Components = {
  h1: (props) => (
    <h2 className="mt-10 mb-3 text-2xl font-bold tracking-tight" {...omitNode(props)} />
  ),
  h2: (props) => <h2 className="mt-10 mb-3 text-xl font-semibold" {...omitNode(props)} />,
  h3: (props) => <h3 className="mt-8 mb-2 text-lg font-semibold" {...omitNode(props)} />,
  h4: (props) => <h4 className="mt-6 mb-2 font-semibold" {...omitNode(props)} />,
  h5: (props) => <h4 className="mt-6 mb-2 font-semibold" {...omitNode(props)} />,
  h6: (props) => <h4 className="mt-6 mb-2 font-semibold" {...omitNode(props)} />,
  p: (props) => <p className="my-4 leading-7" {...omitNode(props)} />,
  ul: (props) => <ul className="my-4 list-disc space-y-2 pl-6" {...omitNode(props)} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-2 pl-6" {...omitNode(props)} />,
  li: (props) => (
    <li className="marker:text-muted-foreground pl-1 leading-7" {...omitNode(props)} />
  ),
  a: ({ href, ...props }) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="text-primary font-medium break-words underline underline-offset-2"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...omitNode(props)}
      />
    );
  },
  blockquote: (props) => (
    <blockquote
      className="border-warning bg-warning-bg my-6 rounded-r-lg border-l-4 px-4 py-1"
      {...omitNode(props)}
    />
  ),
  strong: (props) => <strong className="font-semibold" {...omitNode(props)} />,
  hr: (props) => <hr className="border-border my-8" {...omitNode(props)} />,
  code: (props) => (
    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm" {...omitNode(props)} />
  ),
  pre: (props) => (
    <pre className="bg-muted my-4 overflow-x-auto rounded-lg p-4 text-sm" {...omitNode(props)} />
  ),
  img: () => null,
};

export default async function LegalPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();

  const page = await getLegalPage(slug);
  if (!page) notFound();

  const t = marketingText.legal;
  const others = t.pages.filter((p) => p.slug !== slug);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="border-border mb-6 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{page.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm" data-testid="legal-meta">
          {t.meta(formatDate(page.updated_at), page.version)}
        </p>
      </header>

      <div className="text-foreground text-base break-words">
        <Markdown components={markdownComponents} skipHtml>
          {page.content_md}
        </Markdown>
      </div>

      <nav aria-label={t.otherPages} className="border-border mt-12 border-t pt-6">
        <h2 className="text-muted-foreground text-sm font-medium">{t.otherPages}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                href={`/${other.slug}`}
                className="border-border bg-card hover:bg-muted inline-block rounded-full border px-3 py-1.5 text-sm font-medium"
              >
                {other.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
