import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Verschlüsselung für Ausweis- und Führerscheindaten (DSGVO).
 *
 * Dateien: Envelope-Verschlüsselung. Jede Datei bekommt einen eigenen Zufallsschlüssel (DEK),
 * der mit dem Master-Schlüssel (KEK) aus dem Schlüsselbund verpackt wird. Alles mit AES-256-GCM,
 * d. h. jede Manipulation fällt beim Entschlüsseln auf.
 *
 * Felder (z. B. Geburtsdatum): direkt mit dem Master-Schlüssel, als kompakter Text-Token.
 *
 * Schlüsselrotation: neue Schlüssel hinten an den Schlüsselbund hängen. Neue Daten nutzen den
 * letzten Schlüssel, alte bleiben mit ihrer Schlüssel-ID entschlüsselbar.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const FILE_MAGIC = Buffer.from("SZE1", "ascii");
const FIELD_PREFIX = "sze1";

export type Keyring = {
  /** Schlüssel-ID, mit der neue Daten verschlüsselt werden */
  currentId: string;
  keys: ReadonlyMap<string, Buffer>;
};

/** Parst "v1:base64,v2:base64" – der letzte Eintrag ist der aktuelle Schlüssel. */
export function parseKeyring(spec: string): Keyring {
  const keys = new Map<string, Buffer>();
  let currentId = "";
  for (const raw of spec.split(",")) {
    const entry = raw.trim();
    if (!entry) continue;
    const sep = entry.indexOf(":");
    if (sep <= 0) throw new Error("Ungültiger Schlüsselbund-Eintrag (erwartet id:base64)");
    const id = entry.slice(0, sep);
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) throw new Error(`Ungültige Schlüssel-ID: ${id}`);
    const key = Buffer.from(entry.slice(sep + 1), "base64");
    if (key.length !== KEY_BYTES) {
      throw new Error(`Schlüssel ${id} muss genau ${KEY_BYTES} Byte lang sein`);
    }
    if (keys.has(id)) throw new Error(`Schlüssel-ID doppelt: ${id}`);
    keys.set(id, key);
    currentId = id;
  }
  if (!currentId) throw new Error("Schlüsselbund ist leer");
  return { currentId, keys };
}

function getKey(keyring: Keyring, id: string): Buffer {
  const key = keyring.keys.get(id);
  if (!key) throw new Error(`Unbekannte Schlüssel-ID: ${id}`);
  return key;
}

function gcmEncrypt(key: Buffer, plain: Uint8Array, aad: Buffer) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ciphertext };
}

function gcmDecrypt(key: Buffer, iv: Buffer, tag: Buffer, ciphertext: Buffer, aad: Buffer) {
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ---------------------------------------------------------------------------
// Dateien
// Format: "SZE1" | len(keyId) (1 Byte) | keyId | wrapIv | wrapTag | wrappedDek | iv | tag | daten
// ---------------------------------------------------------------------------

export function encryptFile(plain: Uint8Array, keyring: Keyring): { blob: Buffer; keyId: string } {
  const keyId = keyring.currentId;
  const kek = getKey(keyring, keyId);
  const idBytes = Buffer.from(keyId, "utf8");
  const header = Buffer.concat([FILE_MAGIC, Buffer.from([idBytes.length]), idBytes]);

  const dek = randomBytes(KEY_BYTES);
  try {
    const wrapped = gcmEncrypt(kek, dek, header);
    const data = gcmEncrypt(dek, plain, header);
    const blob = Buffer.concat([
      header,
      wrapped.iv,
      wrapped.tag,
      wrapped.ciphertext,
      data.iv,
      data.tag,
      data.ciphertext,
    ]);
    return { blob, keyId };
  } finally {
    dek.fill(0);
  }
}

export function decryptFile(blob: Uint8Array, keyring: Keyring): Buffer {
  const buf = Buffer.from(blob);
  if (buf.length < FILE_MAGIC.length + 1 || !buf.subarray(0, 4).equals(FILE_MAGIC)) {
    throw new Error("Keine verschlüsselte Standzeit-Datei");
  }
  const idLen = buf[4];
  let offset = 5;
  const keyId = buf.subarray(offset, offset + idLen).toString("utf8");
  offset += idLen;
  const header = buf.subarray(0, offset);

  const minLength = offset + IV_BYTES + TAG_BYTES + KEY_BYTES + IV_BYTES + TAG_BYTES;
  if (buf.length < minLength) throw new Error("Verschlüsselte Datei ist unvollständig");

  const take = (n: number) => {
    const part = buf.subarray(offset, offset + n);
    offset += n;
    return part;
  };
  const wrapIv = take(IV_BYTES);
  const wrapTag = take(TAG_BYTES);
  const wrappedDek = take(KEY_BYTES);
  const iv = take(IV_BYTES);
  const tag = take(TAG_BYTES);
  const ciphertext = buf.subarray(offset);

  const dek = gcmDecrypt(getKey(keyring, keyId), wrapIv, wrapTag, wrappedDek, header);
  try {
    return gcmDecrypt(dek, iv, tag, ciphertext, header);
  } finally {
    dek.fill(0);
  }
}

// ---------------------------------------------------------------------------
// Felder – Token-Format: "sze1.<keyId>.<iv>.<tag>.<ciphertext>" (base64url)
// ---------------------------------------------------------------------------

export function encryptField(plain: string, keyring: Keyring): string {
  const keyId = keyring.currentId;
  const aad = Buffer.from(`${FIELD_PREFIX}.${keyId}`, "utf8");
  const { iv, tag, ciphertext } = gcmEncrypt(
    getKey(keyring, keyId),
    Buffer.from(plain, "utf8"),
    aad,
  );
  return [
    FIELD_PREFIX,
    keyId,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptField(token: string, keyring: Keyring): string {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== FIELD_PREFIX) {
    throw new Error("Ungültiges verschlüsseltes Feld");
  }
  const [, keyId, iv, tag, ciphertext] = parts;
  const aad = Buffer.from(`${FIELD_PREFIX}.${keyId}`, "utf8");
  return gcmDecrypt(
    getKey(keyring, keyId),
    Buffer.from(iv, "base64url"),
    Buffer.from(tag, "base64url"),
    Buffer.from(ciphertext, "base64url"),
    aad,
  ).toString("utf8");
}

export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}
