# Standzeit – Architektur

> „Dein Auto verdient Geld, während du im Urlaub bist – und du musst dich um nichts kümmern.“

Peer-to-Peer-Plattform für Langzeitmiete von Privatautos, Start in Stuttgart. Testprojekt / MVP.

Unterschiede zu bestehenden Anbietern:

1. Kontaktlose Übergabe (Flughafen, Bahnhof, Keybox) – Besitzer muss nicht da sein
2. Rückkehr-Service: Auto ist bei Rückkehr gewaschen, gereinigt, vollgetankt
3. KI-Schadenscheck per Fotovergleich (die KI markiert, ein Mensch entscheidet)
4. Langzeitmiete (Wochen bis Monate)
5. Preisvorschlag mit lokaler Nachfrage (Messen, Wasen, Ferien)

---

## 1. Tech-Stack

| Bereich    | Wahl                                                                | Begründung                                                                                               |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| App        | Next.js 16 (App Router, Server Actions), TypeScript strict          | Cache Components bewusst **aus**: fast jede Seite ist nutzerbezogen (Auth + RLS)                         |
| UI         | Tailwind v4 mit semantischen Design-Tokens, eigene kleine Bausteine | `src/components/ui/*`, mobile first                                                                      |
| Daten      | Supabase: Postgres, Auth, Storage, Realtime                         | PostGIS (Umkreissuche), btree_gist (Doppelbuchungen per Constraint)                                      |
| Validierung| zod                                                                 | gleiche Regeln für Client und Server                                                                     |
| Zahlung    | Stripe Connect Express, „Separate Charges & Transfers“ (Phase 4)    | Abbuchung und Auszahlung zeitlich entkoppelt (Auszahlung nach Abholung, Raten, Kaution)                  |
| Karte      | Leaflet + OpenStreetMap (Phase 2)                                   |                                                                                                          |
| KI         | Claude Vision, nur serverseitig (Phase 6)                           | Keys nie im Client                                                                                       |
| E-Mail/PDF | Resend + React Email, `@react-pdf/renderer` (Phase 4/9)             |                                                                                                          |
| Jobs       | idempotente Job-Endpunkte + Cron, plus Lazy-Auswertung beim Lesen   | Fristen hängen nie allein am Cron                                                                        |
| Tests      | Vitest (Domain), Vitest gegen lokale DB (RLS), Playwright (E2E)     |                                                                                                          |

**Grundprinzip:** Fachlogik (Preise, Buchungsstatus, Keybox, Raten, Storno, Berechtigung) liegt als reine
TypeScript-Module in `src/domain/*` – ohne Next.js- oder Supabase-Abhängigkeit, vollständig testbar.

## 2. Sicherheitsmodell

- **Lesen** regelt Row Level Security (RLS) in Postgres – jede Tabelle in `public` hat RLS (per Test abgesichert).
- **Normale Nutzer schreiben** nur, wo es fachlich harmlos ist (eigenes Profil, eigene Fahrzeuge/Inserat-Entwürfe,
  Chat). Spalten-Grants begrenzen, *welche* Spalten sie ändern dürfen (z. B. nie `is_admin`, nie `listings.status`).
- **Alles Privilegierte** (Statuswechsel, Admin-Entscheidungen, verschlüsselte Uploads, Geld) läuft serverseitig mit
  dem Secret Key (`createAdminClient()`), und zwar erst **nachdem** der Server die Berechtigung geprüft hat
  (`requireUser()` / `requireAdmin()` aus `src/lib/auth/dal.ts`, Buchungs-Statusmaschine).
- Der Proxy (`src/proxy.ts`) erneuert nur die Session und leitet optimistisch zum Login um – die echte Prüfung macht
  jede Seite und jede Server Action selbst.
- Die Datenbank schützt die kritischsten Regeln **selbst**, unabhängig vom App-Code:
  - Doppelbuchungen: Exclusion-Constraint auf `(vehicle_id, rental_period)` für verbindliche Status
  - Preis- und Storno-Snapshot einer Buchung sind unveränderlich (Trigger)
  - Inspektionsfotos sind unveränderbar und erst nach Ablauf der Frist löschbar (Trigger)

## 3. DSGVO

- Ausweis- und Führerscheinbilder werden **vor dem Upload** serverseitig mit AES-256-GCM verschlüsselt
  (Envelope-Verschlüsselung: Zufallsschlüssel pro Datei, verpackt mit dem Master-Schlüssel aus
  `DOCUMENT_ENCRYPTION_KEYS`). Geburtsdatum und Führerscheindatum liegen ebenfalls verschlüsselt in der DB.
- Privater Bucket ohne Client-Policies; Abruf nur über eine Admin-Route, die entschlüsselt, den Hash prüft und
  jeden Zugriff im Audit-Log festhält.
- Schlüsselrotation: neuen Schlüssel hinten an `DOCUMENT_ENCRYPTION_KEYS` hängen; alte Daten bleiben lesbar.
- Löschkonzept (Fristen in `platform_settings`, im Admin-Panel änderbar):
  - abgelehnte Ausweisdokumente: `rejected_doc_retention_days` (Standard 30 Tage)
  - bestätigte Ausweisdokumente: `verification_doc_retention_days` nach letzter Aktivität (Standard 365 Tage)
  - Schadenscheck-Fotos: `photo_retention_days` nach Mietende (Standard 90), verlängert bei offenem Schadensfall
  - Rechnungsdaten: gesetzliche Aufbewahrungsfristen
  - Der Lösch-Job folgt in Phase 9 (Felder `delete_after` sind schon überall vorhanden).
- „Unveränderbar“ bei Fotos: Supabase hat kein echtes WORM/Object-Lock. Deshalb Append-only per Trigger +
  SHA-256 pro Foto in der DB → Manipulation ist nachweisbar.

## 4. Datenmodell (Überblick)

Konventionen: UUIDs, Beträge in **Cent** (integer), Zeiten `timestamptz`, Status als Postgres-Enums.
Details in `supabase/migrations/`.

| Bereich | Tabellen |
| --- | --- |
| Konten | `profiles` (öffentlich), `profile_private` (Kontakt, `is_admin`, `status`), `payout_accounts` |
| Verifizierung | `verifications` (renter/owner, Status, verschlüsselte Daten), `secure_documents` |
| Fahrzeuge & Inserate | `vehicles`, `vehicle_private` (Kennzeichen), `vehicle_photos`, `listings`, `listing_private_details` (genaue Adresse), `km_packages`, `availability_windows` (Urlaubsmodus), `listing_handover_points`, `cancellation_policies` |
| Übergabe | `handover_points` (Zuhause/Flughafen/Hbf/P+R/Partner-Parkhaus), `keyboxes`, `key_access_grants` (Codes verschlüsselt, Zeitfenster) |
| Buchung | `bookings` (Zeitraum als `tstzrange`, Snapshots), `booking_events` (Audit-Trail), `booking_line_items`, `contracts` |
| Versicherung | `insurance_products` (Platzhalter), `booking_insurances` (Policennummer, Status) |
| Zahlung | `payment_installments`, `deposits`, `extra_charges`, `transfers`, `receipts`, `stripe_events` |
| Schadenscheck | `inspections`, `inspection_photos`, `damage_checks`, `damage_findings`, `damage_cases`, `damage_case_photos` |
| Rückkehr-Service | `service_partners`, `service_orders` (Magic-Link-Token als Hash) |
| Preis-KI | `local_events` (Event-Kalender), `price_suggestions` (Eingaben, Anpassungen, gewählter Preis → Trainingsdaten) |
| Kommunikation | `messages`, `reviews` (doppelblind), `notifications`, `flight_watches` |
| Recht & Admin | `legal_pages`, `platform_settings`, `admin_audit_log` |

## 5. Buchungsablauf

```
                    ┌─▶ declined   (Besitzer lehnt ab)
                    ├─▶ expired    (Frist ohne Antwort)
                    ├─▶ withdrawn  (Mieter zieht zurück)
REQUESTED ──────────┤
                    └─▶ CONFIRMED ──────────────▶ cancelled (Storno)
                            │ Abhol-Check fertig
                            ▼
                          ACTIVE
                            │ Rückgabe-Check fertig, Schlüssel in Keybox
                            ▼
                         RETURNED ────▶ KI-Schadenscheck (parallel)
                            │                └─ Verdacht → Schadensfall → Admin
                            │ Partner übernimmt
                            ▼
                        IN_SERVICE
                            │ Partner fertig + Fotos
                            ▼
                          READY   ◀── „Dein Auto ist bereit“
                            │ kein offener Schadensfall, Kaution abgerechnet
                            ▼
                         COMPLETED
```

Umgesetzt als reine Statusmaschine in `src/domain/booking/state-machine.ts` (erlaubte Übergänge, wer darf was,
Guards wie Fristen oder „Abhol-Check vollständig“). Den Status setzt nur der Server. Abgelaufene Anfragen werden
beim Lesen als `expired` ausgewertet (`effectiveStatus`), ein Job räumt zusätzlich auf.

Ein Schadensfall blockiert nur die Abrechnung (`ready → completed`), nicht „Auto ist bereit“.

## 6. Entscheidungen zu kniffligen Punkten

**Kaution:** Keine Abbuchung (blockiert Geld beim Mieter, Stripe-Gebühren gehen bei Erstattung verloren), sondern
Kartenreservierung. Weil Reservierungen nach max. ~7 Tagen verfallen: Karte wird bei Buchung für spätere
Belastungen gespeichert; die Reservierung wird so gelegt, dass sie das Rückgabefenster abdeckt – bei Mieten
≤ 5 Tagen bei Abholung, sonst 2 Tage vor Rückgabe. Scheitert sie: Mieter aktualisiert Zahlungsmittel, Admin
wird alarmiert. Schäden über der Kaution → Versicherung.

**Monatsraten (ab 29 Tagen):** 30-Tage-Perioden, anteilig nach Tagen; 1. Rate bei Bestätigung, weitere automatisch
von der hinterlegten Karte; Auszahlung an den Besitzer pro Rate (minus Provision) 24 h nach Periodenbeginn.

**Preislogik:** günstigste Kombination aus Monat (30 T.), Woche, Tag; angebrochene Woche/Monat kostet nie mehr als
die volle; km-Paket pro 30 Tage anteilig; Mehrkilometer.

**Keybox:** Mechanische Boxen kann man nicht aus der Ferne umstellen. „Code nach Rückgabe ändern“ heißt im MVP:
Wer als Nächstes vor Ort ist (Service-Partner), stellt um und trägt den neuen Code ein; die App gibt ihn
zeitgesteuert an den Nächsten frei. Smart-Keyboxen mit zeitlich begrenzten Codes sind im Modell vorgesehen
(`keyboxes.provider`).

**Versicherung:** Platzhalter-Produkt; Einstellung `live_bookings_enabled` bleibt aus, bis ein Partner steht.
Alle Buchungen sind bis dahin Testbuchungen (`bookings.is_test`).

**Bewusst nicht im MVP:** Verlängerung laufender Mieten, Sofortbuchung, native App (PWA), Telematik,
automatische Ausweisprüfung (nur Schnittstelle `src/lib/identity`), Lernmodell für Preise, weitere Städte.

## 7. Seitenstruktur

| Bereich | Routen |
| --- | --- |
| Öffentlich | `/`, `/vermieten`, `/suche` (P2), `/autos/[id]` (P2), `/fuer/*` (P10), `/agb`, `/datenschutz`, `/impressum`, `/mietvertrag` |
| Auth | `/login`, `/registrieren`, `/passwort-vergessen`, `/passwort-neu`, `/auth/confirm` |
| Konto | `/konto`, `/konto/verifizierung`, `/buchungen/[id]` (P3), `/vermieter` (P2) |
| Partner | `/partner/auftrag/[token]` (P7) |
| Admin | `/admin`, `/admin/verifizierungen`, `/admin/nutzer`, `/admin/einstellungen`, `/admin/audit` – weitere ab P2 |

## 8. Phasen

1. **Setup, Datenmodell, Auth, Rollen** ← aktuell
2. Inserate mit Urlaubsmodus, Übergabepunkte, Kalender, Suche mit Karte
3. Buchungsflow, Preislogik, Stornierung
4. Stripe Connect (Testmodus), Kaution, Monatsraten, Belege
5. Kontaktlose Übergabe mit Keybox-Codes, geführte Foto-Aufnahme
6. KI-Schadenscheck
7. Rückkehr-Service mit Partner-Aufträgen
8. Preis-KI mit Event-Kalender, Verdienst-Rechner
9. Chat, Bewertungen, E-Mails, Admin-Panel komplett
10. Landingpages, Deployment, Seed-Daten, Testanleitung
