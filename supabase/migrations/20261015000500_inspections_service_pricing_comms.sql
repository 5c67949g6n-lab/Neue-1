-- Übergabe-Fotos, KI-Schadenscheck, Rückkehr-Service, Preis-KI, Kommunikation, Rechtstexte

-- ---------------------------------------------------------------------------
-- Inspektionen (Abholung, Rückgabe, nach Service) und Fotos
-- ---------------------------------------------------------------------------
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.inspection_kind not null,
  performed_by uuid references public.profiles (id) on delete set null,
  performed_by_partner_id uuid,
  odometer_km integer check (odometer_km >= 0),
  fuel_level_pct smallint check (fuel_level_pct between 0 and 100),
  battery_level_pct smallint check (battery_level_pct between 0 and 100),
  location extensions.geography(point, 4326),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  unique (booking_id, kind)
);

create table public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  perspective public.photo_perspective not null,
  storage_path text not null unique,
  sha256 char(64) not null,
  mime_type text not null,
  captured_at timestamptz,
  received_at timestamptz not null default now(),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy_m real check (accuracy_m >= 0),
  device_info jsonb not null default '{}',
  delete_after timestamptz
);

create index inspection_photos_inspection_idx on public.inspection_photos (inspection_id);
create index inspection_photos_delete_after_idx on public.inspection_photos (delete_after);

-- Fotos sind unveränderbar: Inhalt, Hash und Zeitstempel können auch serverseitig nicht
-- geändert werden. Gelöscht wird nur nach Ablauf der Aufbewahrungsfrist.
create or replace function public.inspection_photos_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.storage_path is distinct from old.storage_path
       or new.sha256 is distinct from old.sha256
       or new.inspection_id is distinct from old.inspection_id
       or new.perspective is distinct from old.perspective
       or new.captured_at is distinct from old.captured_at
       or new.received_at is distinct from old.received_at
       or new.latitude is distinct from old.latitude
       or new.longitude is distinct from old.longitude then
      raise exception 'Inspektionsfotos sind unveränderbar';
    end if;
    -- nur Verlängern der Aufbewahrung ist erlaubt (z. B. bei offenem Schadensfall)
    if old.delete_after is not null
       and (new.delete_after is null or new.delete_after < old.delete_after) then
      raise exception 'Aufbewahrungsfrist darf nur verlängert werden';
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.delete_after is null or old.delete_after > now() then
      raise exception 'Inspektionsfoto darf erst nach Ablauf der Aufbewahrungsfrist gelöscht werden';
    end if;
    return old;
  end if;
  return null;
end;
$$;

create trigger inspection_photos_guard
  before update or delete on public.inspection_photos
  for each row execute function public.inspection_photos_guard();

-- ---------------------------------------------------------------------------
-- KI-Schadenscheck (die KI markiert nur – entscheiden tut immer ein Mensch)
-- ---------------------------------------------------------------------------
create table public.damage_checks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  pickup_inspection_id uuid not null references public.inspections (id),
  return_inspection_id uuid not null references public.inspections (id),
  status public.damage_check_status not null default 'queued',
  model text,
  prompt_version text,
  raw_result jsonb,
  max_confidence numeric(4, 3) check (max_confidence between 0 and 1),
  needs_review boolean not null default false,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.damage_findings (
  id uuid primary key default gen_random_uuid(),
  damage_check_id uuid not null references public.damage_checks (id) on delete cascade,
  perspective public.photo_perspective not null,
  description text not null,
  severity public.damage_severity not null,
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  -- Box auf dem Rückgabefoto, normiert 0..1: {"x":0.1,"y":0.2,"w":0.1,"h":0.05}
  bbox jsonb,
  pickup_photo_id uuid references public.inspection_photos (id) on delete set null,
  return_photo_id uuid references public.inspection_photos (id) on delete set null,
  verdict public.finding_verdict not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.damage_cases (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  source public.damage_case_source not null,
  status public.damage_case_status not null default 'open',
  description text not null default '',
  reported_by uuid references public.profiles (id) on delete set null,
  damage_check_id uuid references public.damage_checks (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  charge_cents integer check (charge_cents >= 0),
  insurance_claim_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index damage_cases_open_idx on public.damage_cases (status) where status in ('open', 'in_review');
create trigger damage_cases_updated_at before update on public.damage_cases
  for each row execute function public.set_updated_at();

create table public.damage_case_photos (
  id uuid primary key default gen_random_uuid(),
  damage_case_id uuid not null references public.damage_cases (id) on delete cascade,
  storage_path text not null unique,
  sha256 char(64) not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rückkehr-Service
-- ---------------------------------------------------------------------------
create table public.service_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'car_wash',
  email text not null,
  phone text,
  street text,
  postal_code text,
  city text not null default 'Stuttgart',
  location extensions.geography(point, 4326),
  services text[] not null default '{exterior_wash,interior_clean,refuel}',
  price_list jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  partner_id uuid references public.service_partners (id) on delete set null,
  status public.service_order_status not null default 'created',
  tasks text[] not null default '{exterior_wash,interior_clean,refuel}',
  pickup_point_id uuid references public.handover_points (id),
  deliver_to_point_id uuid references public.handover_points (id),
  due_by timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  fuel_liters numeric(6, 2) check (fuel_liters >= 0),
  fuel_cost_cents integer check (fuel_cost_cents >= 0),
  fuel_receipt_path text,
  cost_cents integer check (cost_cents >= 0),
  -- Partner arbeiten ohne Konto über einen Magic Link; gespeichert wird nur der Hash
  access_token_hash char(64) unique,
  access_token_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger service_orders_updated_at before update on public.service_orders
  for each row execute function public.set_updated_at();

alter table public.key_access_grants
  add constraint key_access_grants_service_order_fk
  foreign key (service_order_id) references public.service_orders (id) on delete cascade;

alter table public.inspections
  add constraint inspections_partner_fk
  foreign key (performed_by_partner_id) references public.service_partners (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Preis-KI (regelbasiert, offen für ein späteres Lernmodell)
-- ---------------------------------------------------------------------------
create table public.local_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.local_event_category not null,
  period daterange not null check (not isempty(period)),
  region text not null default 'stuttgart',
  demand_factor numeric(4, 2) not null default 1.00 check (demand_factor between 0.5 and 3.0),
  vehicle_classes public.vehicle_class[], -- null = alle Klassen
  source_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index local_events_period_idx on public.local_events using gist (period);

create table public.price_suggestions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  inputs jsonb not null,
  base_day_cents integer not null,
  -- [{ "rule": "event", "label": "+15 % wegen Messewoche", "factor": 1.15 }, ...]
  adjustments jsonb not null default '[]',
  suggested_day_cents integer not null,
  suggested_week_cents integer,
  suggested_month_cents integer,
  chosen_day_cents integer,
  chosen_week_cents integer,
  chosen_month_cents integer,
  model_version text not null default 'rules-v1',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Kommunikation & Vertrauen
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  attachment_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_booking_idx on public.messages (booking_id, created_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.profiles (id) on delete cascade,
  direction public.review_direction not null,
  rating smallint not null check (rating between 1 and 5),
  sub_ratings jsonb not null default '{}',
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (booking_id, direction)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  recipient_email text,
  type text not null,
  channel public.notification_channel not null default 'email',
  payload jsonb not null default '{}',
  status public.notification_status not null default 'queued',
  error text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.flight_watches (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete cascade,
  availability_window_id uuid references public.availability_windows (id) on delete cascade,
  direction public.flight_direction not null,
  flight_number text not null check (char_length(flight_number) <= 10),
  flight_date date not null,
  scheduled_arrival timestamptz,
  estimated_arrival timestamptz,
  status public.flight_status not null default 'unknown',
  provider text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flight_watches_has_target check (booking_id is not null or availability_window_id is not null)
);

-- ---------------------------------------------------------------------------
-- Rechtstexte (Platzhalter, werden rechtlich erstellt)
-- ---------------------------------------------------------------------------
create table public.legal_pages (
  slug text primary key,
  title text not null,
  version integer not null default 1,
  content_md text not null,
  updated_at timestamptz not null default now()
);

insert into public.legal_pages (slug, title, content_md) values
  ('agb', 'Allgemeine Geschäftsbedingungen',
   '> **Platzhalter.** Die AGB werden rechtlich erstellt und hier eingefügt.'),
  ('datenschutz', 'Datenschutzerklärung',
   '> **Platzhalter.** Die Datenschutzerklärung wird rechtlich erstellt und hier eingefügt.'),
  ('impressum', 'Impressum',
   '> **Platzhalter.** Angaben gemäß § 5 DDG folgen.'),
  ('mietvertrag', 'Mietvertrag (Vorlage)',
   '> **Platzhalter.** Die Vorlage für den Mietvertrag wird rechtlich erstellt und hier eingefügt.');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.inspections enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.damage_checks enable row level security;
alter table public.damage_findings enable row level security;
alter table public.damage_cases enable row level security;
alter table public.damage_case_photos enable row level security;
alter table public.service_partners enable row level security;
alter table public.service_orders enable row level security;
alter table public.local_events enable row level security;
alter table public.price_suggestions enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.flight_watches enable row level security;
alter table public.legal_pages enable row level security;

create policy "inspections: Beteiligte oder Admin lesen" on public.inspections
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "inspection_photos: Beteiligte oder Admin lesen" on public.inspection_photos
  for select to authenticated
  using (
    exists (select 1 from public.inspections i
             where i.id = inspection_id and (select public.is_booking_participant(i.booking_id)))
    or (select public.is_admin())
  );

create policy "damage_checks: Beteiligte oder Admin lesen" on public.damage_checks
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "damage_findings: Beteiligte oder Admin lesen" on public.damage_findings
  for select to authenticated
  using (
    exists (select 1 from public.damage_checks c
             where c.id = damage_check_id and (select public.is_booking_participant(c.booking_id)))
    or (select public.is_admin())
  );

create policy "damage_cases: Beteiligte oder Admin lesen" on public.damage_cases
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "damage_case_photos: Beteiligte oder Admin lesen" on public.damage_case_photos
  for select to authenticated
  using (
    exists (select 1 from public.damage_cases c
             where c.id = damage_case_id and (select public.is_booking_participant(c.booking_id)))
    or (select public.is_admin())
  );

create policy "service_partners: Admin lesen" on public.service_partners
  for select to authenticated using ((select public.is_admin()));

create policy "service_orders: Besitzer oder Admin lesen" on public.service_orders
  for select to authenticated
  using ((select public.is_booking_owner(booking_id)) or (select public.is_admin()));

create policy "local_events: alle lesen" on public.local_events
  for select to anon, authenticated using (true);

create policy "price_suggestions: Anfragender, Besitzer oder Admin lesen" on public.price_suggestions
  for select to authenticated
  using (
    requested_by = (select auth.uid())
    or (listing_id is not null and (select public.owns_listing(listing_id)))
    or (select public.is_admin())
  );

-- Chat: Beteiligte lesen und schreiben; als gelesen markieren nur fremde Nachrichten
create policy "messages: Beteiligte oder Admin lesen" on public.messages
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));
create policy "messages: Beteiligte schreiben" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.is_booking_participant(booking_id))
    and (select public.is_active_user())
  );
create policy "messages: fremde Nachrichten als gelesen markieren" on public.messages
  for update to authenticated
  using ((select public.is_booking_participant(booking_id)) and sender_id <> (select auth.uid()))
  with check ((select public.is_booking_participant(booking_id)) and sender_id <> (select auth.uid()));

revoke update, delete on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

-- Bewertungen: veröffentlichte öffentlich; eigene immer; Schreiben über Server (Regeln für Doppelblind)
create policy "reviews: veröffentlichte lesen" on public.reviews
  for select to anon, authenticated using (published_at is not null and published_at <= now());
create policy "reviews: eigene oder Admin lesen" on public.reviews
  for select to authenticated using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "notifications: eigene lesen" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: eigene als gelesen markieren" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "flight_watches: Beteiligte oder Admin lesen" on public.flight_watches
  for select to authenticated
  using (
    (booking_id is not null and (select public.is_booking_participant(booking_id)))
    or (availability_window_id is not null and exists (
          select 1 from public.availability_windows w
           where w.id = availability_window_id and (select public.owns_listing(w.listing_id))))
    or (select public.is_admin())
  );

create policy "legal_pages: alle lesen" on public.legal_pages
  for select to anon, authenticated using (true);

revoke insert, update, delete on
  public.inspections, public.inspection_photos, public.damage_checks, public.damage_findings,
  public.damage_cases, public.damage_case_photos, public.service_partners, public.service_orders,
  public.local_events, public.price_suggestions, public.reviews, public.flight_watches,
  public.legal_pages
from anon, authenticated;
revoke insert, delete on public.notifications from anon, authenticated;
