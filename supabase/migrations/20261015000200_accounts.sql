-- Konten, Rollen, Verifizierung, Einstellungen, Audit-Log
--
-- Sicherheitsmodell:
--   * Lesen regelt RLS (Row Level Security).
--   * Normale Nutzer dürfen nur ausgewählte Spalten ihrer eigenen Zeilen ändern (Spalten-Grants).
--   * Alles Privilegierte (Admin-Entscheidungen, Statuswechsel, verschlüsselte Uploads) läuft
--     serverseitig mit dem Secret Key, nachdem der Server die Berechtigung geprüft hat.

-- ---------------------------------------------------------------------------
-- Öffentliches Profil (für Inserate, Bewertungen, Chat sichtbar)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_path text,
  bio text check (char_length(bio) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Private Kontodaten: nur für den Nutzer selbst und Admins
-- ---------------------------------------------------------------------------
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  first_name text check (char_length(first_name) <= 100),
  last_name text check (char_length(last_name) <= 100),
  phone text check (char_length(phone) <= 40),
  is_admin boolean not null default false,
  status public.profile_status not null default 'active',
  suspended_reason text,
  updated_at timestamptz not null default now()
);

create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

-- Neues Auth-Konto => Profil + private Daten anlegen
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60)
  );
  insert into public.profile_private (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen für RLS (security definer => keine RLS-Rekursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select pp.is_admin and pp.status = 'active'
       from public.profile_private pp
      where pp.user_id = (select auth.uid())),
    false
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select pp.status = 'active' from public.profile_private pp where pp.user_id = (select auth.uid())),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Plattform-Einstellungen (alle Stellschrauben, im Admin-Panel änderbar)
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

insert into public.platform_settings (key, value, description) values
  ('min_renter_age', '21', 'Mindestalter Mieter (Jahre)'),
  ('min_license_years', '2', 'Führerschein-Besitz mindestens (Jahre)'),
  ('owner_commission_pct', '20', 'Provision vom Besitzer (%)'),
  ('renter_service_fee_pct', '10', 'Servicegebühr Mieter (%)'),
  ('return_service_fee_cents', '3900', 'Rückkehr-Service-Pauschale (Cent)'),
  ('booking_response_hours', '24', 'Antwortfrist Besitzer auf Anfragen (Stunden)'),
  ('default_min_rental_days', '3', 'Standard-Mindestmietdauer (Tage)'),
  ('default_deposit_cents', '50000', 'Standard-Kaution (Cent)'),
  ('installment_threshold_days', '28', 'Ab mehr als X Tagen Monatsraten'),
  ('installment_period_days', '30', 'Länge einer Abrechnungsperiode (Tage)'),
  ('owner_payout_delay_hours', '24', 'Auszahlung an Besitzer X Stunden nach Periodenbeginn'),
  ('deposit_short_rental_max_days', '5', 'Bis X Tage: Kaution bei Abholung reservieren'),
  ('deposit_hold_days_before_return', '2', 'Längere Mieten: Kaution X Tage vor Rückgabe reservieren'),
  ('key_code_reveal_minutes_before', '30', 'Keybox-Code X Minuten vor Mietbeginn sichtbar'),
  ('service_buffer_hours', '24', 'Puffer vor Rückkehr des Besitzers für den Rückkehr-Service (Stunden)'),
  ('photo_retention_days', '90', 'Schadenscheck-Fotos X Tage nach Mietende löschen'),
  ('verification_doc_retention_days', '365', 'Ausweisdokumente X Tage nach letzter Aktivität löschen'),
  ('rejected_doc_retention_days', '30', 'Abgelehnte Ausweisdokumente X Tage aufbewahren'),
  ('review_publish_after_days', '14', 'Bewertungen spätestens nach X Tagen veröffentlichen'),
  ('live_bookings_enabled', 'false', 'Echte Zahlungen erlaubt (nur mit Versicherungspartner)');

-- ---------------------------------------------------------------------------
-- Verschlüsselte Dokumente (Ausweis, Führerschein, Fahrzeugschein)
-- Die Datei liegt verschlüsselt im privaten Bucket "secure-documents";
-- Entschlüsselung nur serverseitig für Admins.
-- ---------------------------------------------------------------------------
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.verification_kind not null,
  status public.verification_status not null default 'draft',
  provider public.identity_provider not null default 'manual',
  provider_ref text,
  -- verschlüsselt (AES-256-GCM, Format siehe src/lib/crypto)
  date_of_birth_enc text,
  license_issued_on_enc text,
  license_classes text[] not null default '{}',
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  expires_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pro Nutzer und Art höchstens eine offene/gültige Verifizierung
create unique index verifications_one_open_per_kind
  on public.verifications (user_id, kind)
  where status in ('draft', 'pending', 'approved');

create index verifications_status_idx on public.verifications (status, submitted_at);

create trigger verifications_updated_at before update on public.verifications
  for each row execute function public.set_updated_at();

create table public.secure_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind public.document_kind not null,
  verification_id uuid references public.verifications (id) on delete cascade,
  vehicle_id uuid, -- FK wird in der Fahrzeug-Migration ergänzt
  storage_path text not null unique,
  sha256 char(64) not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  key_id text not null,
  delete_after timestamptz,
  created_at timestamptz not null default now()
);

create index secure_documents_verification_idx on public.secure_documents (verification_id);

-- ---------------------------------------------------------------------------
-- Auszahlungskonto (Stripe Connect)
-- ---------------------------------------------------------------------------
create table public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger payout_accounts_updated_at before update on public.payout_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Admin-Audit-Log: wer hat was wann gemacht oder angesehen
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.platform_settings enable row level security;
alter table public.verifications enable row level security;
alter table public.secure_documents enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.admin_audit_log enable row level security;

-- profiles: öffentlich lesbar, eigene Zeile änderbar (nur freigegebene Spalten)
create policy "profiles: alle lesen" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles: eigenes Profil ändern" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar_path, bio) on public.profiles to authenticated;

-- profile_private: nur selbst + Admin; is_admin/status kann ein Nutzer nie selbst setzen
create policy "profile_private: selbst oder Admin lesen" on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "profile_private: eigene Kontaktdaten ändern" on public.profile_private
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, update, delete on public.profile_private from anon, authenticated;
grant update (first_name, last_name, phone) on public.profile_private to authenticated;

-- platform_settings: öffentlich lesbar (enthält keine Geheimnisse), Änderungen nur serverseitig
create policy "platform_settings: alle lesen" on public.platform_settings
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.platform_settings from anon, authenticated;

-- verifications / secure_documents: eigene Metadaten oder Admin; Schreiben nur serverseitig
create policy "verifications: selbst oder Admin lesen" on public.verifications
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.verifications from anon, authenticated;

create policy "secure_documents: selbst oder Admin lesen" on public.secure_documents
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.secure_documents from anon, authenticated;

create policy "payout_accounts: selbst oder Admin lesen" on public.payout_accounts
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.payout_accounts from anon, authenticated;

create policy "admin_audit_log: nur Admin lesen" on public.admin_audit_log
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;
