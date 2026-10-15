import type { IdentityVerificationProvider } from "./provider";

/**
 * Standard: keine externe Prüfung. Die Verifizierung landet mit Status "pending"
 * in der Warteschlange und ein Admin prüft Dokumente und Angaben im Panel.
 */
export const manualProvider: IdentityVerificationProvider = {
  id: "manual",
  label: "Manuelle Prüfung durch das Standzeit-Team",
  async startVerification() {
    return {};
  },
};
