import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { listAuditEntries } from "@/lib/admin/audit";
import { formatIsoDateDe, isUuid } from "@/lib/admin/schemas";
import { getVerificationForReview, type DecryptedDate } from "@/lib/admin/verifications";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Badge, PageHeader } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { DetailItem, DetailList, VerificationStatusBadge } from "../../ui";
import { ApproveForm, RejectForm } from "./review-forms";

export const metadata: Metadata = { title: adminText.verificationDetail.title };

const t = adminText.verificationDetail;

function DateValue({ date, extra }: { date: DecryptedDate; extra?: string }) {
  if (date.failed) return <span className="text-destructive">{t.decryptFailed}</span>;
  if (!date.value) return <span className="text-muted-foreground">{t.notProvided}</span>;
  return (
    <>
      {formatIsoDateDe(date.value)}
      {extra ? <span className="text-muted-foreground font-normal"> ({extra})</span> : null}
    </>
  );
}

export default async function AdminVerificationDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/verifizierungen/[id]">) {
  const admin = await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const verification = await getVerificationForReview(id, admin.id);
  if (!verification) notFound();

  const trail = await listAuditEntries({ targetType: "verification", targetId: id, limit: 20 });
  const isOwn = verification.userId === admin.id;
  const eligibility = verification.eligibility;
  // Mieter nur bestätigen, wenn die Vorprüfung bestanden ist (der Server prüft das erneut)
  const canApprove = verification.kind !== "renter" || eligibility?.eligible === true;
  const done =
    query.erledigt === "bestaetigt"
      ? t.done.approved
      : query.erledigt === "abgelehnt"
        ? t.done.rejected
        : null;
  const fullName = [verification.firstName, verification.lastName].filter(Boolean).join(" ");

  return (
    <>
      <Link
        href="/admin/verifizierungen"
        className="text-primary mb-3 inline-block text-sm font-medium hover:underline"
      >
        ← {t.back}
      </Link>
      <PageHeader
        title={t.title}
        description={fullName || verification.displayName || verification.email}
        action={<VerificationStatusBadge status={verification.status} />}
      />

      {done ? (
        <Alert tone="success" className="mb-4">
          {done}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.person}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t.firstName}>{verification.firstName || t.notProvided}</DetailItem>
              <DetailItem label={t.lastName}>{verification.lastName || t.notProvided}</DetailItem>
              <DetailItem label={t.displayName}>
                {verification.displayName || t.notProvided}
              </DetailItem>
              <DetailItem label={t.email}>{verification.email || t.notProvided}</DetailItem>
              <DetailItem label={t.kind}>
                {adminText.verificationKind[verification.kind]}
              </DetailItem>
              <DetailItem label={t.provider}>{t.providers[verification.provider]}</DetailItem>
            </DetailList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.data}</CardTitle>
            <CardDescription>{t.sensitiveHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t.dateOfBirth}>
                <span data-testid="date-of-birth">
                  <DateValue
                    date={verification.dateOfBirth}
                    extra={eligibility ? t.age(eligibility.age) : undefined}
                  />
                </span>
              </DetailItem>
              <DetailItem label={t.licenseIssuedOn}>
                <span data-testid="license-issued-on">
                  <DateValue
                    date={verification.licenseIssuedOn}
                    extra={eligibility ? t.licenseYears(eligibility.licenseYears) : undefined}
                  />
                </span>
              </DetailItem>
              <DetailItem label={t.licenseClasses}>
                {verification.licenseClasses.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {verification.licenseClasses.map((licenseClass) => (
                      <Badge key={licenseClass} tone="info">
                        {licenseClass}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  t.noClasses
                )}
              </DetailItem>
            </DetailList>

            <div className="mt-4" data-testid="precheck">
              {verification.kind !== "renter" ? null : !eligibility ? (
                <Alert tone="warning" title={t.precheck}>
                  {t.precheckUnavailable}
                </Alert>
              ) : eligibility.eligible ? (
                <Alert tone="success" title={t.precheck}>
                  {t.precheckOk}
                </Alert>
              ) : (
                <Alert tone="danger" title={`${t.precheck}: ${t.precheckFailed}`}>
                  <ul className="list-disc pl-5">
                    {eligibility.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {verification.kind === "renter" ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  {t.precheckSettings(
                    verification.settings.minAge,
                    verification.settings.minLicenseYears,
                  )}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t.documents}</CardTitle>
          <CardDescription>{t.documentsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          {verification.documents.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.documentMissing}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {verification.documents.map((doc) => {
                const label = adminText.documentKind[doc.kind];
                const src = `/admin/dokumente/${doc.id}`;
                return (
                  <li key={doc.id} className="space-y-2">
                    <p className="text-sm font-medium">{label}</p>
                    <a
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-border bg-muted block overflow-hidden rounded-lg border"
                    >
                      {/* Kein next/image: der Optimierer hätte keine Admin-Session */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={t.documentAlt(label)}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="aspect-[3/2] w-full object-contain"
                        data-testid={`document-${doc.kind}`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.history}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t.created}>{formatDateTime(verification.createdAt)}</DetailItem>
              <DetailItem label={t.submitted}>
                {verification.submittedAt ? formatDateTime(verification.submittedAt) : "–"}
              </DetailItem>
              <DetailItem label={t.reviewed}>
                {verification.reviewedAt ? (
                  <span data-testid="reviewed">
                    {formatDateTime(verification.reviewedAt)}{" "}
                    {verification.reviewedBy
                      ? t.reviewedBy(verification.reviewedBy.name ?? adminText.common.unknown)
                      : null}
                  </span>
                ) : (
                  "–"
                )}
              </DetailItem>
              {verification.rejectionReason ? (
                <DetailItem label={t.rejectionReason}>{verification.rejectionReason}</DetailItem>
              ) : null}
              {verification.expiresAt ? (
                <DetailItem label={t.expiresAt}>{formatDate(verification.expiresAt)}</DetailItem>
              ) : null}
              {verification.deleteAfter ? (
                <DetailItem label={t.deleteAfter}>
                  {formatDate(verification.deleteAfter)}
                </DetailItem>
              ) : null}
            </DetailList>

            {trail.length > 0 ? (
              <>
                <h3 className="mt-6 mb-2 text-sm font-semibold">{t.auditTrail}</h3>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {trail.map((entry) => (
                    <li key={entry.id}>
                      {formatDateTime(entry.createdAt)} ·{" "}
                      {adminText.audit.actions[entry.action] ?? entry.action} ·{" "}
                      {entry.adminName ?? adminText.audit.deletedAdmin}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.decision}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {verification.status !== "pending" ? (
              <Alert tone="neutral">{t.notPending}</Alert>
            ) : isOwn ? (
              <Alert tone="warning">{t.ownVerification}</Alert>
            ) : (
              <>
                {canApprove ? (
                  <ApproveForm verificationId={verification.id} />
                ) : (
                  <Alert tone="warning">
                    {eligibility ? t.errors.notEligible : t.errors.dataUnreadable}
                  </Alert>
                )}
                <hr className="border-border" />
                <RejectForm verificationId={verification.id} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
