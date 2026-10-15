import type { IdentityProviderId } from "./provider";

export class IdentityProviderNotConfiguredError extends Error {
  constructor(public readonly providerId: IdentityProviderId) {
    super(`Identitätsanbieter "${providerId}" ist noch nicht konfiguriert`);
    this.name = "IdentityProviderNotConfiguredError";
  }
}
