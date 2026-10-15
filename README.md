# Standzeit

> Dein Auto verdient Geld, während du im Urlaub bist – und du musst dich um nichts kümmern.

MVP einer Peer-to-Peer-Plattform, auf der Privatleute ihr Auto vermieten, während sie es nicht brauchen
(z. B. drei Wochen Urlaub). Testprojekt, Start in Stuttgart.

Architektur, Datenmodell und Buchungsablauf: **[docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md)**

## Stand

**Phase 1 – Setup, Datenmodell, Auth, Rollen** ✅

- Komplettes Datenbankschema für alle Phasen (46 Tabellen, RLS überall, Doppelbuchungs-Constraint)
- Registrierung mit E-Mail-Bestätigung, Login, Passwort zurücksetzen, Konto/Profil
- Mieter-Verifizierung: Ausweis + Führerschein verschlüsselt hochladen, Prüfung im Admin-Panel
- Admin-Panel: Verifizierungen, Nutzer sperren/Admin-Rechte, Einstellungen, Audit-Log
- Buchungs-Statusmaschine (reine Logik, vollständig getestet)

## Lokal starten

Voraussetzungen: Node.js 22, Docker.

```bash
npm install
npm run db:start            # lokale Supabase (Postgres, Auth, Storage, Mailpit) in Docker
cp .env.example .env.local  # Werte aus `npx supabase status` eintragen, Schlüssel: openssl rand -base64 32
npm run db:reset            # Migrationen einspielen
npm run seed:users          # Test-Konten anlegen
npm run dev                 # http://127.0.0.1:3000
```

| Dienst | URL |
| --- | --- |
| App | http://127.0.0.1:3000 |
| Supabase Studio (Datenbank ansehen) | http://127.0.0.1:54323 |
| Mailpit (alle E-Mails landen hier) | http://127.0.0.1:54324 |

Test-Konten (nur lokal, Passwort `Standzeit-Test-2026`):

- `admin@standzeit.test` – Admin
- `mieter@standzeit.test` – Mieter
- `vermieter@standzeit.test` – Besitzer

## Tests

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Unit-Tests (Statusmaschine, Altersprüfung, Verschlüsselung, …)
npm run test:db     # Sicherheitstests gegen die lokale Datenbank (RLS, Constraints, Trigger)
npm run test:e2e    # Ende-zu-Ende im Browser (startet/nutzt den Dev-Server)
npm run test:all    # alles
```

## Projektstruktur

```
src/
  app/              Seiten und Server Actions (App Router)
  components/ui/    UI-Bausteine
  domain/           reine Fachlogik (Statusmaschine, Berechtigung, später Preise, Keybox …)
  lib/              Supabase-Clients, Auth (DAL), Verschlüsselung, Einstellungen, Storage
  i18n/de/          Texte pro Feature
  config/brand.ts   Name und Claim
supabase/
  migrations/       Datenbankschema (SQL)
  templates/        deutsche Auth-E-Mails
tests/db/           Datenbank-Sicherheitstests
e2e/                Playwright-Tests
docs/               Architektur
```
