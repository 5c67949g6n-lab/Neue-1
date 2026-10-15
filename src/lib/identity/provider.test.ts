import { describe, expect, it } from "vitest";
import { IdentityProviderNotConfiguredError, getIdentityProvider } from "./provider";

describe("getIdentityProvider", () => {
  it("manuelle Prüfung startet ohne externen Aufruf", async () => {
    const provider = getIdentityProvider("manual");
    expect(provider.id).toBe("manual");
    await expect(provider.startVerification({ userId: "u", verificationId: "v" })).resolves.toEqual(
      {},
    );
  });

  it("Stripe Identity meldet klar, dass es noch nicht konfiguriert ist", async () => {
    const provider = getIdentityProvider("stripe_identity");
    expect(provider.id).toBe("stripe_identity");
    await expect(
      provider.startVerification({ userId: "u", verificationId: "v" }),
    ).rejects.toBeInstanceOf(IdentityProviderNotConfiguredError);
  });

  it("unbekannte Anbieter werfen", () => {
    expect(() => getIdentityProvider("unbekannt" as never)).toThrow();
  });
});
