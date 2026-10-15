import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { authText } from "@/i18n/de/auth";
import { AuthCard } from "../auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: authText.register.title };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/konto");

  const t = authText.register;
  return (
    <AuthCard title={t.title} description={t.description}>
      <RegisterForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t.hasAccount}{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t.login}
        </Link>
      </p>
    </AuthCard>
  );
}
