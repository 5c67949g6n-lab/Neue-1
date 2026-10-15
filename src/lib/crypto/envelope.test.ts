import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptField,
  decryptFile,
  encryptField,
  encryptFile,
  parseKeyring,
  sha256Hex,
} from "./envelope";

const k1 = randomBytes(32).toString("base64");
const k2 = randomBytes(32).toString("base64");

describe("parseKeyring", () => {
  it("nimmt den letzten Schlüssel als aktuellen", () => {
    const ring = parseKeyring(`v1:${k1}, v2:${k2}`);
    expect(ring.currentId).toBe("v2");
    expect(ring.keys.size).toBe(2);
  });

  it("lehnt falsche Schlüssellängen, doppelte IDs und leere Ringe ab", () => {
    expect(() => parseKeyring(`v1:${randomBytes(16).toString("base64")}`)).toThrow(/32 Byte/);
    expect(() => parseKeyring(`v1:${k1},v1:${k2}`)).toThrow(/doppelt/);
    expect(() => parseKeyring("")).toThrow(/leer/);
    expect(() => parseKeyring("ohne-doppelpunkt")).toThrow();
  });
});

describe("Datei-Verschlüsselung", () => {
  const ring = parseKeyring(`v1:${k1}`);

  it("verschlüsselt und entschlüsselt verlustfrei", () => {
    const plain = randomBytes(5000);
    const { blob, keyId } = encryptFile(plain, ring);
    expect(keyId).toBe("v1");
    expect(blob.includes(plain.subarray(0, 64))).toBe(false);
    expect(decryptFile(blob, ring).equals(plain)).toBe(true);
  });

  it("erzeugt bei gleichem Inhalt jedes Mal ein anderes Ergebnis", () => {
    const plain = Buffer.from("gleicher Inhalt");
    expect(encryptFile(plain, ring).blob.equals(encryptFile(plain, ring).blob)).toBe(false);
  });

  it("erkennt Manipulation an Daten und Header", () => {
    const { blob } = encryptFile(Buffer.from("Ausweis"), ring);
    const tamperedData = Buffer.from(blob);
    tamperedData[tamperedData.length - 1] ^= 0xff;
    expect(() => decryptFile(tamperedData, ring)).toThrow();

    const tamperedHeader = Buffer.from(blob);
    tamperedHeader[6] ^= 0x01; // Schlüssel-ID verändern
    expect(() => decryptFile(tamperedHeader, ring)).toThrow();
  });

  it("lehnt fremde oder abgeschnittene Dateien ab", () => {
    expect(() => decryptFile(Buffer.from("kein standzeit blob"), ring)).toThrow();
    const { blob } = encryptFile(Buffer.from("x"), ring);
    expect(() => decryptFile(blob.subarray(0, 20), ring)).toThrow(/unvollständig/);
  });

  it("entschlüsselt alte Daten nach einer Schlüsselrotation", () => {
    const { blob } = encryptFile(Buffer.from("alt"), ring);
    const rotated = parseKeyring(`v1:${k1},v2:${k2}`);
    expect(decryptFile(blob, rotated).toString()).toBe("alt");
    expect(encryptFile(Buffer.from("neu"), rotated).keyId).toBe("v2");
  });

  it("scheitert ohne den passenden Schlüssel", () => {
    const { blob } = encryptFile(Buffer.from("geheim"), ring);
    expect(() => decryptFile(blob, parseKeyring(`v2:${k2}`))).toThrow(/Unbekannte Schlüssel-ID/);
  });
});

describe("Feld-Verschlüsselung", () => {
  const ring = parseKeyring(`v1:${k1}`);

  it("verschlüsselt und entschlüsselt Text inkl. Umlauten", () => {
    const token = encryptField("1990-02-28 – Müller", ring);
    expect(token.startsWith("sze1.v1.")).toBe(true);
    expect(token).not.toContain("1990");
    expect(decryptField(token, ring)).toBe("1990-02-28 – Müller");
  });

  it("erkennt manipulierte Tokens", () => {
    const token = encryptField("1990-02-28", ring);
    const parts = token.split(".");
    parts[4] = Buffer.from("1991-02-28").toString("base64url");
    expect(() => decryptField(parts.join("."), ring)).toThrow();
    expect(() => decryptField("quatsch", ring)).toThrow(/Ungültiges/);
  });
});

describe("sha256Hex", () => {
  it("liefert den bekannten Hash", () => {
    expect(sha256Hex(Buffer.from("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
