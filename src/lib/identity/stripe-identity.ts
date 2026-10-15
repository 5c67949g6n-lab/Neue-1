import type { IdentityVerificationProvider } from "./provider";
import { IdentityProviderNotConfiguredError } from "./errors";

/**
 * Vorbereitet für Stripe Identity – noch nicht angebunden.
 *
 * So wird es später umgesetzt (Paket `stripe` ist noch nicht installiert):
 * 1. startVerification: serverseitig eine VerificationSession anlegen
 *    (`stripe.identity.verificationSessions.create({ type: "document",
 *    options: { document: { require_matching_selfie: true, allowed_types: ["id_card", "passport", "driving_license"] } },
 *    metadata: { userId, verificationId } })`) und `{ providerRef: session.id, redirectUrl: session.url }`
 *    zurückgeben. Die Verifizierung bekommt provider = "stripe_identity" und provider_ref = session.id.
 * 2. Webhook-Route (Signatur prüfen, Ereignis in stripe_events idempotent ablegen):
 *    - `identity.verification_session.verified` → Verifizierung (über provider_ref + metadata) auf
 *      "approved" setzen; `verified_outputs.dob` per expand abrufen und verschlüsselt in
 *      date_of_birth_enc übernehmen, danach checkRenterEligibility erneut prüfen.
 *    - `identity.verification_session.requires_input` → "rejected" mit verständlichem Grund.
 * 3. Die Ausweisbilder bleiben bei Stripe – wir speichern keine Kopie in "secure-documents".
 *    Den Führerschein (Ausstellungsdatum, Klassen) prüft weiterhin unser Team.
 */
export const stripeIdentityProvider: IdentityVerificationProvider = {
  id: "stripe_identity",
  label: "Stripe Identity (automatische Prüfung)",
  async startVerification() {
    throw new IdentityProviderNotConfiguredError("stripe_identity");
  },
};
