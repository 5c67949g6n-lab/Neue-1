import "server-only";
import { serverEnv } from "@/lib/server-env";
import {
  decryptField,
  decryptFile,
  encryptField,
  encryptFile,
  parseKeyring,
  sha256Hex,
  type Keyring,
} from "./envelope";

let keyring: Keyring | undefined;

function getKeyring(): Keyring {
  keyring ??= parseKeyring(serverEnv().DOCUMENT_ENCRYPTION_KEYS);
  return keyring;
}

/** Verschlüsselt eine Datei für den privaten Bucket "secure-documents". */
export function encryptDocument(plain: Uint8Array) {
  return encryptFile(plain, getKeyring());
}

export function decryptDocument(blob: Uint8Array) {
  return decryptFile(blob, getKeyring());
}

/** Verschlüsselt einen sensiblen Wert (z. B. Geburtsdatum) für eine Textspalte. */
export function encryptSecret(plain: string) {
  return encryptField(plain, getKeyring());
}

export function decryptSecret(token: string) {
  return decryptField(token, getKeyring());
}

export { sha256Hex };
