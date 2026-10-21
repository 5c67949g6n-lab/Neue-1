import { config } from "dotenv";

config({ path: ".env.local" });

/** Lokaler Mailpit (fängt alle Mails der lokalen Supabase ab). */
const MAILPIT_URL = (process.env.MAILPIT_URL ?? "http://127.0.0.1:54324").replace(/\/$/, "");

type MailSummary = {
  ID: string;
  Subject: string;
  Created: string;
  To: { Address: string }[];
};

export type Mail = {
  id: string;
  subject: string;
  created: Date;
  html: string;
  text: string;
};

async function mailpit<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MAILPIT_URL}${path}`, init);
  if (!res.ok) throw new Error(`Mailpit ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Alle Mails an eine Adresse, neueste zuerst. */
async function listMailsTo(address: string): Promise<MailSummary[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const data = await mailpit<{ messages: MailSummary[] }>(`/api/v1/search?query=${query}&limit=50`);
  const wanted = address.toLowerCase();
  return data.messages
    .filter((m) => m.To.some((to) => to.Address.toLowerCase() === wanted))
    .sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created));
}

/**
 * Wartet auf die neueste Mail an `address` (optional: Betreff passt, nach Zeitpunkt `after`
 * eingegangen bzw. nicht in `exclude`) und liefert sie vollständig.
 */
export async function waitForMail(
  address: string,
  opts: { subject?: RegExp; after?: Date; exclude?: string[]; timeoutMs?: number } = {},
): Promise<Mail> {
  const deadline = Date.now() + (opts.timeoutMs ?? 15_000);
  // Mailpit speichert sekundengenau – etwas Toleranz für Uhren-Abweichungen
  const after = opts.after ? opts.after.getTime() - 2_000 : 0;

  while (Date.now() < deadline) {
    const match = (await listMailsTo(address)).find(
      (m) =>
        Date.parse(m.Created) >= after &&
        !opts.exclude?.includes(m.ID) &&
        (!opts.subject || opts.subject.test(m.Subject)),
    );
    if (match) {
      const full = await mailpit<{
        ID: string;
        Subject: string;
        Date: string;
        HTML: string;
        Text: string;
      }>(`/api/v1/message/${match.ID}`);
      return {
        id: full.ID,
        subject: full.Subject,
        created: new Date(match.Created),
        html: full.HTML,
        text: full.Text,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Keine passende Mail an ${address} innerhalb des Zeitlimits`);
}

/** HTML-Entities in Attributwerten auflösen (v. a. `&amp;` in Query-Strings). */
function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Ersten Link aus dem HTML holen, dessen Pfad mit `pathPrefix` beginnt. */
export function extractLink(html: string, pathPrefix = "/auth/confirm"): URL {
  for (const [, raw] of html.matchAll(/href\s*=\s*"([^"]+)"/gi)) {
    const href = decodeHtmlAttribute(raw);
    try {
      const url = new URL(href);
      if (url.pathname.startsWith(pathPrefix)) return url;
    } catch {
      // relative oder kaputte Links überspringen
    }
  }
  throw new Error(`Kein Link mit Pfad ${pathPrefix} in der Mail gefunden`);
}

/** Mails an diese Adressen aus Mailpit löschen (Aufräumen nach dem Test). */
export async function deleteMailsTo(...addresses: string[]): Promise<void> {
  const ids = (await Promise.all(addresses.map(listMailsTo))).flat().map((m) => m.ID);
  if (ids.length === 0) return;
  await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: ids }),
  });
}
