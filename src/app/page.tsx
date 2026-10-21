import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { marketingText } from "@/i18n/de/marketing";
import { Icon, IconBubble, NumberedSteps, SectionHeading } from "@/components/marketing/marketing";

export default async function HomePage() {
  const user = await getCurrentUser();
  const t = marketingText.home;
  // Mieter-CTA: Suche kommt später – bis dahin Registrierung bzw. Konto (Verifizierung)
  const renterHref = user ? "/konto" : "/registrieren";

  return (
    <>
      {/* Hero */}
      <section
        aria-labelledby="hero-title"
        className="from-primary/10 via-background to-background border-border relative overflow-hidden border-b bg-linear-to-b"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-24">
          <div>
            <p className="border-primary/20 bg-card text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium">
              <Icon name="pin" className="size-4" />
              {t.badge}
            </p>
            <h1
              id="hero-title"
              className="mt-5 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]"
            >
              {t.title} <span className="text-primary">{t.titleAccent}</span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg text-pretty">{t.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/vermieten" size="lg" className="w-full sm:w-auto">
                {t.ctaOwner}
                <Icon name="arrow" />
              </ButtonLink>
              <ButtonLink
                href={renterHref}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                {user ? t.ctaRenterLoggedIn : t.ctaRenter}
              </ButtonLink>
            </div>
            <ul className="text-muted-foreground mt-8 grid gap-2 text-sm sm:flex sm:flex-wrap sm:gap-x-6">
              {t.trust.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Icon name="check" className="text-success size-4" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Illustration: Ablauf eines Urlaubs als Karte */}
          <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="bg-accent/20 absolute -top-6 -right-6 hidden size-40 rounded-full blur-2xl sm:block"
            />
            <div className="border-border bg-card relative rounded-2xl border p-5 shadow-lg sm:p-6">
              <figcaption className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {t.example.label}
              </figcaption>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-lg font-semibold">{t.example.title}</p>
                <span className="bg-success-bg text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                  <span aria-hidden className="bg-success size-2 rounded-full" />
                  {t.example.status}
                </span>
              </div>
              <ol className="mt-5 space-y-4">
                {t.example.steps.map((step, index) => (
                  <li key={step.when} className="flex gap-3">
                    <span
                      aria-hidden
                      className={
                        index === t.example.steps.length - 1
                          ? "bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full"
                          : "bg-muted text-primary grid size-8 shrink-0 place-items-center rounded-full"
                      }
                    >
                      <Icon
                        name={index === 0 ? "key" : index === 1 ? "calendar" : "sparkle"}
                        className="size-4"
                      />
                    </span>
                    <div className="text-sm">
                      <p className="font-semibold">{step.when}</p>
                      <p className="text-muted-foreground">{step.what}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="bg-muted mt-5 rounded-lg px-3 py-2 text-sm font-medium">
                {t.example.footer}
              </p>
            </div>
          </figure>
        </div>
      </section>

      {/* Vorteile */}
      <section aria-labelledby="benefits-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <SectionHeading
          id="benefits-title"
          title={t.benefits.title}
          description={t.benefits.description}
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.benefits.items.map((item, index) =>
            index === 0 ? (
              // Hauptvorteil hervorgehoben, auf großen Bildschirmen über zwei Zeilen
              <li
                key={item.title}
                className="bg-primary text-primary-foreground flex flex-col rounded-xl p-5 shadow-sm sm:col-span-2 sm:p-6 lg:col-span-1 lg:row-span-2"
              >
                <IconBubble
                  name={item.icon}
                  className="bg-primary-foreground/15 text-primary-foreground"
                />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 opacity-90">{item.text}</p>
                <ul className="mt-6 flex flex-wrap gap-2 lg:mt-auto lg:pt-6">
                  {t.benefits.handoverPoints.map((point) => (
                    <li
                      key={point}
                      className="bg-primary-foreground/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                    >
                      <Icon name="pin" className="size-4" />
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            ) : (
              <li
                key={item.title}
                className="border-border bg-card rounded-xl border p-5 shadow-sm sm:p-6"
              >
                <IconBubble name={item.icon} />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">{item.text}</p>
              </li>
            ),
          )}
        </ul>
      </section>

      {/* So funktioniert's */}
      <section
        id="so-funktionierts"
        aria-labelledby="how-title"
        className="border-border bg-muted/60 scroll-mt-20 border-y"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <SectionHeading
            id="how-title"
            title={t.howItWorks.title}
            description={t.howItWorks.description}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <IconBubble name="key" />
                <h3 className="text-xl font-semibold">{t.howItWorks.ownerTitle}</h3>
              </div>
              <NumberedSteps steps={t.howItWorks.owner} headingLevel="h4" />
              <Link
                href="/vermieten"
                className="text-primary mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              >
                {t.finalCta.secondary}
                <Icon name="arrow" className="size-4" />
              </Link>
            </div>
            <div className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <IconBubble name="calendar" />
                <h3 className="text-xl font-semibold">{t.howItWorks.renterTitle}</h3>
              </div>
              <NumberedSteps steps={t.howItWorks.renter} headingLevel="h4" />
              <Link
                href={renterHref}
                className="text-primary mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              >
                {user ? t.ctaRenterLoggedIn : t.ctaRenter}
                <Icon name="arrow" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Zielgruppen */}
      <section aria-labelledby="audiences-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <SectionHeading
          id="audiences-title"
          title={t.audiences.title}
          description={t.audiences.description}
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.audiences.items.map((item) => (
            <li key={item.title} className="border-border bg-card rounded-xl border p-5 shadow-sm">
              <IconBubble name={item.icon} className="bg-accent/15 text-foreground" />
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Start in Stuttgart + Abschluss-CTA */}
      <section aria-labelledby="city-title" className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <div className="bg-primary text-primary-foreground overflow-hidden rounded-2xl p-6 sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium opacity-90">
                <Icon name="pin" className="size-4" />
                {brand.city}
              </p>
              <h2 id="city-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {t.city.title}
              </h2>
              <p className="mt-3 text-pretty opacity-90">{t.city.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {t.city.points.map((point) => (
                  <li
                    key={point}
                    className="bg-primary-foreground/15 rounded-full px-3 py-1 text-sm font-medium"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card text-card-foreground rounded-xl p-5 shadow-sm sm:p-6 lg:col-span-2">
              <p className="text-lg font-semibold">{t.finalCta.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t.finalCta.text}</p>
              <div className="mt-5 flex flex-col gap-3">
                {user ? (
                  <ButtonLink href="/konto" className="w-full">
                    {t.ctaRenterLoggedIn}
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/registrieren" className="w-full">
                    {t.finalCta.primary}
                  </ButtonLink>
                )}
                <ButtonLink href="/vermieten" variant="outline" className="w-full">
                  {t.finalCta.secondary}
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
