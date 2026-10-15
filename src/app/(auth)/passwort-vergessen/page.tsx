import type { Metadata } from "next";
import Link from "next/link";
import { authText } from "@/i18n/de/auth";
import { AuthCard } from "../auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: authText.forgot.title };

export default function ForgotPasswordPage() {
  const t = authText.forgot;
  return (
    <AuthCard title={t.title} description={t.description}>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t.backToLogin}
        </Link>
      </p>
    </AuthCard>
  );
}
