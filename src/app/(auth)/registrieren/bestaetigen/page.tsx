import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { z } from "zod";
import { authText } from "@/i18n/de/auth";
import { AuthCard } from "../../auth-card";
import { PENDING_EMAIL_COOKIE } from "../../constants";
import { ResendConfirmationForm } from "../../resend-confirmation-form";

export const metadata: Metadata = { title: authText.confirm.title };

export default async function ConfirmEmailPage() {
  const cookieStore = await cookies();
  const parsed = z.email().safeParse(cookieStore.get(PENDING_EMAIL_COOKIE)?.value);
  const email = parsed.success ? parsed.data : undefined;
  const t = authText.confirm;

  return (
    <AuthCard title={t.title} description={t.description}>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-full"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-5"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>
          <div className="space-y-2 text-sm">
            <p>{email ? t.sentTo(email) : t.sentGeneric}</p>
            <p className="text-muted-foreground">{t.checkSpam}</p>
          </div>
        </div>

        <ResendConfirmationForm email={email} />

        <p className="text-center text-sm">
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t.toLogin}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
