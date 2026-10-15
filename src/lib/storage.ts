/** Bucket-Namen und Pfad-Konventionen für Supabase Storage (siehe Storage-Migration). */
export const BUCKETS = {
  /** öffentlich lesbar, Besitzer schreiben in ihren Ordner {userId}/... */
  vehiclePhotos: "vehicle-photos",
  /** privat, nur verschlüsselte Dateien, nur Server-Zugriff */
  secureDocuments: "secure-documents",
  /** privat, nur Server; Abruf über signierte URLs */
  inspectionPhotos: "inspection-photos",
  /** privat, Verträge und Belege (PDF) */
  documents: "documents",
} as const;

export function secureDocumentPath(
  userId: string,
  verificationId: string,
  kind: string,
  fileId: string,
) {
  return `${userId}/${verificationId}/${kind}-${fileId}.bin`;
}

/** Erlaubte Bildformate für Ausweis-/Führerscheinfotos (werden im Browser zu JPEG verkleinert). */
export const IDENTITY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IDENTITY_IMAGE_BYTES = 5 * 1024 * 1024;
