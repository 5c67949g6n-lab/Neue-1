import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/paths";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { authText } from "@/i18n/de/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: authText.login.title };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);

  if (await getCurrentUser()) redirect(next);

  const linkInvalid = params.fehler === "link-ungueltig";

  return (
    <section className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle as="h1" className="text-2xl">
            {authText.login.title}
          </CardTitle>
          <CardDescription>{authText.login.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {linkInvalid ? (
            <Alert tone="warning" title={authText.login.linkInvalidTitle} className="mb-4">
              {authText.login.linkInvalid}
            </Alert>
          ) : null}
          <LoginForm next={next} />
          <p className="text-muted-foreground mt-6 text-center text-sm">
            {authText.login.noAccount}{" "}
            <Link href="/registrieren" className="text-primary font-medium hover:underline">
              {authText.login.register}
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
