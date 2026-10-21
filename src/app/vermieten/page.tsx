import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSettings } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { marketingText } from "@/i18n/de/marketing";
import { Icon, IconBubble, NumberedSteps, SectionHeading } from "@/components/marketing/marketing";

export const metadata: Metadata = {
  title: marketingText.owner.metaTitle,
  description: marketingText.owner.metaDescription,
};

/** Mindestanforderungen an Mieter aus den Plattform-Einstellungen (ohne Einstellungen: weglassen). */
async function loadRenterRequirements() {
  try {
    const settings = await getSettings();
    return { minAge: settings.min_renter_age, minLicenseYears: settings.min_license_years };
  } catch {
    return null;
  }
}

export default async function OwnerLandingPage() {
  const [user, requirements] = await Promise.all([getCurrentUser(), loadRenterRequirements()]);
  const t = marketingText.owner;
  const primaryCta = user
    ? { href: "/konto", label: t.ctaAccount }
    : { href: "/registrieren", label: t.ctaRegister };

  return (
    <>
      {/* Hero */}
      <section
        aria-labelledby="owner-title"
        className="from-primary/10 via-background to-background border-border border-b bg-linear-to-b"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="border-primary/20 bg-card text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium">
              <Icon name="key" className="size-4" />
              {t.badge}
            </p>
            <h1
              id="owner-title"
              className="mt-5 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]"
            >
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg text-pretty">{t.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={primaryCta.href} size="lg" className="w-full sm:w-auto">
                {primaryCta.label}
                <Icon name="arrow" />
              </ButtonLink>
              <ButtonLink href="#ablauf" size="lg" variant="outline" className="w-full sm:w-auto">
                {t.ctaHow}
              </ButtonLink>
            </div>
          </div>
          <Alert tone="info" title={t.comingSoon.title} className="mt-10 max-w-3xl">
            {t.comingSoon.text}
          </Alert>
        </div>
      </section>

      {/* Parkgebühren-Argument */}
      <section aria-labelledby="parking-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <SectionHeading id="parking-title" title={t.parking.title} description={t.parking.text} />
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="border-border bg-card rounded-2xl border p-5 sm:p-6">
            <h3 className="text-muted-foreground font-semibold">{t.parking.without.title}</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {t.parking.without.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="bg-danger-bg text-destructive grid size-6 shrink-0 place-items-center rounded-full">
                    <Icon name="x" className="size-3.5" />
                  </span>
                  <span className="pt-0.5">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-primary bg-card rounded-2xl border-2 p-5 shadow-sm sm:p-6">
            <h3 className="text-primary font-semibold">{t.parking.with.title}</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {t.parking.with.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="bg-success-bg text-success grid size-6 shrink-0 place-items-center rounded-full">
                    <Icon name="check" className="size-3.5" />
                  </span>
                  <span className="pt-0.5 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Ablauf Urlaubsmodus */}
      <section
        id="ablauf"
        aria-labelledby="vacation-title"
        className="border-border bg-muted/60 scroll-mt-20 border-y"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              id="vacation-title"
              title={t.vacationMode.title}
              description={t.vacationMode.description}
              className="lg:mx-0 lg:text-left"
            />
          </div>
          <div className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-8">
            <NumberedSteps steps={t.vacationMode.steps} />
          </div>
        </div>
      </section>

      {/* Sicherheit */}
      <section aria-labelledby="safety-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <SectionHeading id="safety-title" title={t.safety.title} />
        <ul className="grid gap-4 md:grid-cols-3">
          {t.safety.items.map((item) => (
            <li key={item.title} className="border-border bg-card rounded-xl border p-5 shadow-sm">
              <IconBubble name={item.icon} />
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">{item.text}</p>
            </li>
          ))}
        </ul>
        {requirements ? (
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-sm">
            {t.safety.requirements(requirements.minAge, requirements.minLicenseYears)}
          </p>
        ) : null}
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 pb-14 sm:pb-20">
        <SectionHeading id="faq-title" title={t.faq.title} />
        <div className="space-y-3">
          {t.faq.items.map((item) => (
            <details
              key={item.q}
              className="group border-border bg-card rounded-xl border p-4 open:shadow-sm sm:p-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="text-muted-foreground text-xl leading-none transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="text-muted-foreground mt-3 text-sm leading-6">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Abschluss-CTA */}
      <section aria-labelledby="owner-cta-title" className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <div className="bg-primary text-primary-foreground rounded-2xl p-6 text-center sm:p-10">
          <h2 id="owner-cta-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t.finalCta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty opacity-90">{t.finalCta.text}</p>
          <ButtonLink
            href={primaryCta.href}
            size="lg"
            variant="outline"
            className="mt-6 w-full border-transparent sm:w-auto"
          >
            {primaryCta.label}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
