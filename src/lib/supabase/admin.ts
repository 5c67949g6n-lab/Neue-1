import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import type { Database } from "./database.types";

/**
 * Supabase-Client mit Secret Key – umgeht RLS.
 *
 * Nur verwenden, NACHDEM der Server die Berechtigung selbst geprüft hat
 * (z. B. `requireAdmin()` oder die Statusmaschine einer Buchung).
 * Niemals an den Client weitergeben.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
