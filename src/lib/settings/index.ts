import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseSettings, type PlatformSettings } from "./schema";

/** Lädt alle Plattform-Einstellungen (einmal pro Request). */
export const getSettings = cache(async (): Promise<PlatformSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("platform_settings").select("key, value");
  if (error) throw new Error(`Einstellungen konnten nicht geladen werden: ${error.message}`);
  return parseSettings(data ?? []);
});

export type { PlatformSettings } from "./schema";
