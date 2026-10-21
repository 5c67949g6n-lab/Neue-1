/**
 * Bereitet ein Foto im Browser für den Upload vor: auf höchstens 2000 px lange Kante
 * verkleinern und als JPEG kodieren. Das spart Datenvolumen und entfernt nebenbei
 * Metadaten wie GPS-Koordinaten (EXIF), weil nur die Pixel neu kodiert werden.
 */
export const MAX_EDGE_PX = 2000;
export const JPEG_QUALITY = 0.85;

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" dreht Handyfotos anhand der EXIF-Ausrichtung richtig herum
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fallback über <img> (z. B. ältere Safari-Versionen)
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

export async function prepareImage(file: Blob): Promise<Blob> {
  const { source, width, height, release } = await decode(file);
  try {
    if (!width || !height) throw new Error("Bild hat keine Abmessungen");
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas nicht verfügbar");
    // Weißer Hintergrund für transparente PNGs (JPEG kennt keine Transparenz)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // Speicher sofort freigeben (wichtig auf Handys)
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) throw new Error("JPEG-Kodierung fehlgeschlagen");
    return blob;
  } finally {
    release();
  }
}
