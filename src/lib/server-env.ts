import "server-only";
import { z } from "zod";

/** Geheime Umgebungsvariablen – nur auf dem Server lesbar. */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  DOCUMENT_ENCRYPTION_KEYS: z.string().min(1),
});

let cached: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    DOCUMENT_ENCRYPTION_KEYS: process.env.DOCUMENT_ENCRYPTION_KEYS,
  });
  return cached;
}
