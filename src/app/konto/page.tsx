import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, Badge, PageHeader } from "@/components/ui/feedback";
import { accountText } from "@/i18n/de/account";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: accountText.title };

type VerificationState = keyof typeof accountText.verification.status;

const statusTone = {
  none: "neutral",
  draft: "neutral",
  pending: "info",
  approved: "success",
  rejected: "danger",
  expired: "warning",
} as const satisfies Record<VerificationState, string>;

export default async function AccountPage({ searchParams }: PageProps<"/konto">) {
  const user = await requireUser("/konto");
  const params = await searchParams;

  const supabase = await createClient();
  const { data: verification } = await supabase
    .from("verifications")
    .select("status, submitted_at, rejection_reason, expires_at")
    .eq("user_id", user.id)
    .eq("kind", "renter")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let state: VerificationState = verification?.status ?? "none";
  // Bestätigt, aber Gültigkeit abgelaufen → wie abgelaufen behandeln
  if (state === "approved" && verification?.expires_at) {
    if (new Date(verification.expires_at) < new Date()) state = "expired";
  }

  const t = accountText;
  const v = t.verification;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <PageHeader title={t.greeting(user.displayName)} description={t.description} />

      {params.passwort === "geaendert" ? (
        <Alert tone="success" className="mb-6">
          {t.passwordChanged}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t.profile.title}</CardTitle>
            <CardDescription>{t.profile.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              profile={{
                displayName: user.displayName,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{v.title}</CardTitle>
              <CardDescription>{v.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{v.statusLabel}:</span>
                <Badge tone={statusTone[state]} data-testid="verification-status">
                  {v.status[state]}
                </Badge>
              </p>
              <p>{v.explain[state]}</p>
              {state === "rejected" && verification?.rejection_reason ? (
                <p className="bg-danger-bg rounded-lg p-3">
                  <span className="font-medium">{v.rejectionReason}</span>{" "}
                  {verification.rejection_reason}
                </p>
              ) : null}
              {state === "pending" && verification?.submitted_at ? (
                <p className="text-muted-foreground">
                  {v.submittedAt(formatDate(verification.submitted_at))}
                </p>
              ) : null}
              {state === "approved" && verification?.expires_at ? (
                <p className="text-muted-foreground">
                  {v.approvedUntil(formatDate(verification.expires_at))}
                </p>
              ) : null}
            </CardContent>
            <CardFooter>
              <ButtonLink
                href="/konto/verifizierung"
                variant={state === "approved" || state === "pending" ? "outline" : "primary"}
                className="w-full sm:w-auto"
              >
                {v.action[state]}
              </ButtonLink>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.owner.title}</CardTitle>
              <CardDescription>{t.owner.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{t.owner.listingsSoon}</p>
              <p className="text-muted-foreground">{t.owner.payoutsSoon}</p>
              <p className="pt-1">
                <Link href="/vermieten" className="text-primary font-medium hover:underline">
                  {t.owner.learnMore}
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.login.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t.login.email}</p>
                <p className="font-medium break-all" data-testid="account-email">
                  {user.email}
                </p>
              </div>
              <Link href="/passwort-neu" className="text-primary font-medium hover:underline">
                {t.login.changePassword}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
