import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { loadDocumentForAdmin } from "@/lib/admin/documents";
import { isUuid } from "@/lib/admin/schemas";
import { adminText } from "@/i18n/de/admin";

/**
 * Liefert ein entschlüsseltes Ausweis-/Führerscheinfoto an Admins aus.
 * Keine Weiterleitungen: nicht eingeloggt → 401, kein Admin → 403.
 */

const t = adminText.documentRoute;

const BASE_HEADERS = {
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
  "Referrer-Policy": "no-referrer",
} as const;

function textResponse(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/admin/dokumente/[id]">) {
  const user = await getCurrentUser();
  if (!user) return textResponse(401, t.unauthorized);
  if (!user.isAdmin || user.status !== "active") return textResponse(403, t.forbidden);

  const { id } = await ctx.params;
  if (!isUuid(id)) return textResponse(400, t.invalidId);

  let result: Awaited<ReturnType<typeof loadDocumentForAdmin>>;
  try {
    result = await loadDocumentForAdmin(id, user.id);
  } catch {
    return textResponse(500, t.failed);
  }
  if (!result.ok) {
    return result.error === "not_found"
      ? textResponse(404, t.notFound)
      : textResponse(500, t.failed);
  }

  return new Response(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      ...BASE_HEADERS,
      "Content-Type": result.contentType,
      "Content-Length": String(result.bytes.byteLength),
      "Content-Disposition": "inline",
    },
  });
}
