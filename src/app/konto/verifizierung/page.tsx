import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { todayInBerlin } from "@/domain/verification/eligibility";
import { requireUser } from "@/lib/auth/dal";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { RENTER_DOCUMENT_KINDS } from "@/lib/verification/schema";
import { getRenterVerification, type RenterVerification } from "@/lib/verification/service";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, PageHeader } from "@/components/ui/feedback";
import { verificationText } from "@/i18n/de/verification";
import { DocumentUploads } from "./document-uploads";
import { RestartButton } from "./restart-button";
import { VerificationForm } from "./verification-form";

export const metadata: Metadata = { title: verificationText.page.title };

const t = verificationText;

export default async function VerificationPage() {
  const user = await requireUser("/konto/verifizierung");
  const [settings, verification] = await Promise.all([
    getSettings(),
    getRenterVerification(user.id),
  ]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Link
        href="/konto"
        className="text-primary mb-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
      >
        <span aria-hidden="true">←</span> {t.page.back}
      </Link>
      <PageHeader title={t.page.heading} description={t.page.description} />

      {/* Mobil: Infos → Hauptbereich → Datenschutz; ab lg: Hauptbereich links, Infos rechts */}
      <div className="grid gap-6 lg:grid-cols-5 lg:grid-rows-[auto_1fr] lg:items-start">
        <Card className="lg:col-span-2 lg:col-start-4 lg:row-start-1">
          <CardHeader>
            <CardTitle>{t.why.title}</CardTitle>
            <CardDescription>{t.why.body}</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="mb-2 text-sm font-semibold">{t.requirements.title}</h3>
            <ul className="space-y-2 text-sm" data-testid="requirements">
              <Requirement>{t.requirements.minAge(settings.min_renter_age)}</Requirement>
              <Requirement>{t.requirements.licenseYears(settings.min_license_years)}</Requirement>
              <Requirement>{t.requirements.documents}</Requirement>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <MainSection verification={verification} />
        </div>

        <Card className="lg:col-span-2 lg:col-start-4 lg:row-start-2">
          <CardHeader>
            <CardTitle>{t.privacy.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>{t.privacy.encrypted}</p>
            <p>{t.privacy.access}</p>
            <p>
              {t.privacy.retention(
                settings.verification_doc_retention_days,
                settings.rejected_doc_retention_days,
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MainSection({ verification }: { verification: RenterVerification | null }) {
  const status = verification?.status;

  if (verification && status === "approved") {
    return (
      <Alert tone="success" title={t.status.approvedTitle} data-testid="verification-approved">
        <p>{t.status.approvedBody}</p>
        {verification.reviewedAt ? (
          <p className="text-muted-foreground mt-1">
            {t.status.approvedSince(formatDate(verification.reviewedAt))}
          </p>
        ) : null}
        {verification.expiresAt ? (
          <p className="text-muted-foreground">
            {t.status.approvedValidUntil(formatDate(verification.expiresAt))}
          </p>
        ) : null}
        <ButtonLink href="/" className="mt-4 w-full sm:w-auto">
          {t.status.approvedCta}
        </ButtonLink>
      </Alert>
    );
  }

  if (verification && status === "pending") {
    return (
      <Card data-testid="verification-pending">
        <CardHeader>
          <Badge tone="info" className="w-fit">
            {t.status.pendingBadge}
          </Badge>
          <CardTitle>{t.status.pendingTitle}</CardTitle>
          {verification.submittedAt ? (
            <CardDescription>
              {t.status.pendingSince(formatDate(verification.submittedAt))}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm">{t.status.pendingBody}</CardContent>
      </Card>
    );
  }

  if (verification && status === "rejected") {
    return (
      <Alert tone="danger" title={t.status.rejectedTitle} data-testid="verification-rejected">
        {verification.rejectionReason ? (
          <p>
            <span className="font-medium">{t.status.rejectedReason}</span>{" "}
            {verification.rejectionReason}
          </p>
        ) : (
          <p>{t.status.rejectedNoReason}</p>
        )}
        <div className="mt-4">
          <RestartButton />
        </div>
      </Alert>
    );
  }

  if (verification && status === "expired") {
    return (
      <Alert tone="warning" title={t.status.expiredTitle} data-testid="verification-expired">
        <p>{t.status.expiredBody}</p>
        <div className="mt-4">
          <RestartButton />
        </div>
      </Alert>
    );
  }

  // Noch keine Verifizierung oder Entwurf: Fotos hochladen und Angaben machen
  const uploaded = verification?.documents.map((doc) => doc.kind) ?? [];
  const documentsComplete = RENTER_DOCUMENT_KINDS.every((kind) => uploaded.includes(kind));
  return (
    <>
      <DocumentUploads uploaded={uploaded} />
      <VerificationForm documentsComplete={documentsComplete} today={todayInBerlin()} />
    </>
  );
}

function Requirement({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="text-success mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}
