import type { Database } from "@/lib/supabase/database.types";
import { manualProvider } from "./manual";
import { stripeIdentityProvider } from "./stripe-identity";

export { IdentityProviderNotConfiguredError } from "./errors";

export type IdentityProviderId = Database["public"]["Enums"]["identity_provider"];

export type StartVerificationInput = { userId: string; verificationId: string };

export type StartVerificationResult = {
  /** Referenz beim Anbieter (z. B. ID der Stripe VerificationSession) */
  providerRef?: string;
  /** Falls der Anbieter einen eigenen Ablauf hat: dorthin weiterleiten */
  redirectUrl?: string;
};

/**
 * Schnittstelle für die Identitätsprüfung. Heute prüft ein Admin manuell im Panel;
 * später kann ein automatischer Anbieter (Stripe Identity) eingesetzt werden,
 * ohne dass sich Seiten oder Actions ändern.
 */
export interface IdentityVerificationProvider {
  id: IdentityProviderId;
  label: string;
  startVerification(input: StartVerificationInput): Promise<StartVerificationResult>;
}

const providers: Record<IdentityProviderId, IdentityVerificationProvider> = {
  manual: manualProvider,
  stripe_identity: stripeIdentityProvider,
};

export function getIdentityProvider(id: IdentityProviderId): IdentityVerificationProvider {
  if (!Object.hasOwn(providers, id))
    throw new Error(`Unbekannter Identitätsanbieter: ${String(id)}`);
  return providers[id];
}
