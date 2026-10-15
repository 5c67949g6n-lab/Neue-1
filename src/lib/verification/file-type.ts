/**
 * Erkennt Bildformate anhand der ersten Bytes ("Magic Bytes").
 * Der MIME-Typ aus dem Browser ist frei wählbar und wird deshalb nie verwendet.
 */
export type DetectedImageType = "image/jpeg" | "image/png" | "image/webp";

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

function startsWithAt(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, i) => bytes[offset + i] === value);
}

export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (startsWithAt(bytes, JPEG)) return "image/jpeg";
  if (startsWithAt(bytes, PNG)) return "image/png";
  // WEBP: "RIFF" | Dateigröße (4 Byte) | "WEBP"
  if (startsWithAt(bytes, RIFF) && startsWithAt(bytes, WEBP, 8)) return "image/webp";
  return null;
}
