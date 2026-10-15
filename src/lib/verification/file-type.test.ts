import { describe, expect, it } from "vitest";
import { detectImageType } from "./file-type";

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => Array.from(Buffer.from(text, "ascii"));

describe("detectImageType", () => {
  it("erkennt JPEG", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe("image/jpeg");
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe1))).toBe("image/jpeg");
  });

  it("erkennt PNG", () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe(
      "image/png",
    );
  });

  it("erkennt WEBP nur mit RIFF-Kopf und WEBP-Kennung", () => {
    expect(detectImageType(bytes(...ascii("RIFF"), 0x24, 0, 0, 0, ...ascii("WEBPVP8 ")))).toBe(
      "image/webp",
    );
    // RIFF, aber WAV statt WEBP
    expect(detectImageType(bytes(...ascii("RIFF"), 0x24, 0, 0, 0, ...ascii("WAVEfmt ")))).toBe(
      null,
    );
  });

  it("vertraut nicht auf Dateiendung oder MIME – nur auf den Inhalt", () => {
    expect(detectImageType(bytes(...ascii("<svg xmlns")))).toBeNull();
    expect(detectImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(detectImageType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(detectImageType(bytes(0x00, 0xff, 0xd8, 0xff))).toBeNull();
  });

  it("zu kurze oder leere Daten sind kein Bild", () => {
    expect(detectImageType(new Uint8Array())).toBeNull();
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEB")))).toBeNull();
  });
});
