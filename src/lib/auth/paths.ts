/** Bereiche, die einen Login voraussetzen. */
export const PROTECTED_PREFIXES = ["/konto", "/vermieter", "/admin", "/buchungen"] as const;

/**
 * Route Handler, die selbst mit 401/403 antworten (z. B. Dokument-Abruf). Der Proxy leitet
 * sie nicht zum Login um – eine HTML-Weiterleitung wäre für <img>/fetch die falsche Antwort.
 */
export const SELF_AUTH_PREFIXES = ["/admin/dokumente/"] as const;

export function handlesOwnAuth(pathname: string): boolean {
  return SELF_AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Nur interne, relative Weiterleitungsziele erlauben (verhindert Open Redirects
 * wie `?next=https://boese.example` oder `?next=//boese.example`).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/konto"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  return next;
}
