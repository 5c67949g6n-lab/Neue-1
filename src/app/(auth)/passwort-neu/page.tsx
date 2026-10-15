import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { authText } from "@/i18n/de/auth";
import { AuthCard } from "../auth-card";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: authText.reset.title };

export default async function NewPasswordPage() {
  const user = await getCurrentUser();
  const t = authText.reset;

  if (!user) {
    return (
      <AuthCard title={t.title}>
        <div className="space-y-4">
          <Alert tone="warning" title={t.noSessionTitle}>
            {t.noSession}
          </Alert>
          <ButtonLink href="/passwort-vergessen" className="w-full">
            {t.requestNew}
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.title} description={t.description}>
      {/* Für Passwort-Manager: zu welchem Konto das neue Passwort gehört */}
      <p className="text-muted-foreground mb-4 text-sm break-all">{user.email}</p>
      <NewPasswordForm email={user.email} />
    </AuthCard>
  );
}
