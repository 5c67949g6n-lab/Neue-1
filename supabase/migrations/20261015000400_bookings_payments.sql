-- Buchungen, Posten, Versicherung, Zahlung, Verträge
--
-- Buchungen und alles Geldrelevante schreibt ausschließlich der Server
-- (Statusmaschine in src/domain/booking). Clients lesen nur.

-- ---------------------------------------------------------------------------
-- Buchungen
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  renter_id uuid not null references public.profiles (id) on delete restrict,
  status public.booking_status not null default 'requested',
  rental_period tstzrange not null
    check (not isempty(rental_period) and not lower_inf(rental_period) and not upper_inf(rental_period)),
  pickup_point_id uuid not null references public.handover_points (id),
  return_point_id uuid not null references public.handover_points (id),
  km_package_id uuid references public.km_packages (id) on delete set null,
  included_km integer check (included_km >= 0),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancellation_reason text,
  picked_up_at timestamptz,
  returned_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  -- eingefroren bei der Anfrage, danach unveränderlich
  price_snapshot jsonb not null,
  cancellation_snapshot jsonb not null,
  currency char(3) not null default 'EUR',
  rent_cents integer not null default 0 check (rent_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  return_service_cents integer not null default 0 check (return_service_cents >= 0),
  insurance_cents integer not null default 0 check (insurance_cents >= 0),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  renter_flight text check (char_length(renter_flight) <= 10),
  odometer_start_km integer check (odometer_start_km >= 0),
  odometer_end_km integer check (odometer_end_km >= odometer_start_km),
  fuel_start_pct smallint check (fuel_start_pct between 0 and 100),
  fuel_end_pct smallint check (fuel_end_pct between 0 and 100),
  is_test boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_not_self check (renter_id <> owner_id),
  -- Doppelbuchungen verhindert die Datenbank selbst:
  -- zwei verbindliche Buchungen desselben Autos dürfen sich zeitlich nicht überschneiden.
  constraint bookings_no_overlap exclude using gist (
    vehicle_id with =,
    rental_period with &&
  ) where (status in ('confirmed', 'active', 'returned', 'in_service', 'ready', 'completed'))
);

create index bookings_renter_idx on public.bookings (renter_id, status);
create index bookings_owner_idx on public.bookings (owner_id, status);
create index bookings_listing_idx on public.bookings (listing_id);
create index bookings_expires_idx on public.bookings (expires_at) where status = 'requested';
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Preis- und Storno-Snapshot dürfen sich nach dem Anlegen nicht mehr ändern
create or replace function public.bookings_freeze_snapshots()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.price_snapshot is distinct from old.price_snapshot
     or new.cancellation_snapshot is distinct from old.cancellation_snapshot then
    raise exception 'Preis- und Storno-Snapshot einer Buchung sind unveränderlich';
  end if;
  return new;
end;
$$;

create trigger bookings_freeze_snapshots before update on public.bookings
  for each row execute function public.bookings_freeze_snapshots();

-- Jede Statusänderung (Audit-Trail)
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor_type public.actor_type not null,
  actor_id uuid references public.profiles (id) on delete set null,
  note text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

-- Alle Posten: Basis für Preisübersicht, Belege und Auszahlungen
create table public.booking_line_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.line_item_kind not null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_cents integer not null,
  amount_cents integer not null,
  payer public.party not null,
  payee public.party not null,
  vat_rate numeric(4, 2) not null default 0,
  installment_id uuid,
  created_at timestamptz not null default now()
);

create index booking_line_items_booking_idx on public.booking_line_items (booking_id);

-- Hilfsfunktionen
create or replace function public.is_booking_participant(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where b.id = p_booking_id
       and (b.renter_id = (select auth.uid()) or b.owner_id = (select auth.uid()))
  );
$$;

create or replace function public.is_booking_owner(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b where b.id = p_booking_id and b.owner_id = (select auth.uid())
  );
$$;

-- Mieter mit verbindlicher, laufender Buchung (für genaue Adresse, Kennzeichen, Übergabepunkt)
create or replace function public.has_committed_booking_for_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where b.listing_id = p_listing_id
       and b.renter_id = (select auth.uid())
       and b.status in ('confirmed', 'active', 'returned')
  );
$$;

create or replace function public.has_committed_booking_for_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where b.vehicle_id = p_vehicle_id
       and b.renter_id = (select auth.uid())
       and b.status in ('confirmed', 'active', 'returned')
  );
$$;

create or replace function public.has_committed_booking_at_point(p_point_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where (b.pickup_point_id = p_point_id or b.return_point_id = p_point_id)
       and b.renter_id = (select auth.uid())
       and b.status in ('confirmed', 'active', 'returned')
  );
$$;

-- ---------------------------------------------------------------------------
-- Versicherung (Platzhalter bis ein Partner steht)
-- ---------------------------------------------------------------------------
create table public.insurance_products (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  product_name text not null,
  premium_cents_per_day integer not null check (premium_cents_per_day >= 0),
  deductible_cents integer not null default 0 check (deductible_cents >= 0),
  terms_url text,
  is_placeholder boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.insurance_products (partner_name, product_name, premium_cents_per_day, deductible_cents, is_placeholder)
values ('Platzhalter-Versicherung', 'Vollkasko Miete (Platzhalter)', 900, 50000, true);

create table public.booking_insurances (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  product_id uuid not null references public.insurance_products (id),
  premium_cents_per_day integer not null,
  total_premium_cents integer not null,
  policy_number text,
  status public.insurance_status not null default 'quoted',
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger booking_insurances_updated_at before update on public.booking_insurances
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Zahlung
-- ---------------------------------------------------------------------------
create table public.payment_installments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  seq smallint not null check (seq >= 1),
  period tstzrange not null,
  amount_cents integer not null check (amount_cents >= 0),
  owner_share_cents integer not null check (owner_share_cents >= 0),
  platform_share_cents integer not null check (platform_share_cents >= 0),
  due_at timestamptz not null,
  status public.installment_status not null default 'scheduled',
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  attempts smallint not null default 0,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, seq)
);

create index payment_installments_due_idx on public.payment_installments (due_at) where status = 'scheduled';
create trigger payment_installments_updated_at before update on public.payment_installments
  for each row execute function public.set_updated_at();

alter table public.booking_line_items
  add constraint booking_line_items_installment_fk
  foreign key (installment_id) references public.payment_installments (id) on delete set null;

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  strategy public.deposit_strategy not null,
  status public.deposit_status not null default 'pending',
  hold_scheduled_for timestamptz,
  stripe_payment_intent_id text unique,
  hold_placed_at timestamptz,
  hold_expires_at timestamptz,
  captured_cents integer not null default 0 check (captured_cents >= 0),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger deposits_updated_at before update on public.deposits
  for each row execute function public.set_updated_at();

-- Nachbelastungen (Mehr-km, Tankdifferenz, Schaden, Verspätung)
create table public.extra_charges (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.line_item_kind not null,
  amount_cents integer not null check (amount_cents > 0),
  status public.charge_status not null default 'pending',
  stripe_payment_intent_id text unique,
  note text,
  created_at timestamptz not null default now()
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  installment_id uuid references public.payment_installments (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  status public.transfer_status not null default 'scheduled',
  scheduled_for timestamptz not null,
  stripe_transfer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger transfers_updated_at before update on public.transfers
  for each row execute function public.set_updated_at();

create sequence public.receipt_number_seq;

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  number text not null unique,
  kind public.receipt_kind not null,
  recipient_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents integer not null,
  pdf_path text,
  issued_at timestamptz not null default now()
);

create or replace function public.next_receipt_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'SZ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.receipt_number_seq')::text, 6, '0');
$$;

-- Verarbeitete Stripe-Webhooks (Idempotenz)
create table public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Mietvertrag pro Buchung (beide Seiten bestätigen digital)
-- ---------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  template_version text not null,
  pdf_path text,
  sha256 char(64),
  renter_accepted_at timestamptz,
  renter_accept_ip inet,
  owner_accepted_at timestamptz,
  owner_accept_ip inet,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Keybox-Zugänge (Codes verschlüsselt; Freigabe nur über den Server im Gültigkeitsfenster)
-- ---------------------------------------------------------------------------
create table public.key_access_grants (
  id uuid primary key default gen_random_uuid(),
  keybox_id uuid not null references public.keyboxes (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  service_order_id uuid, -- FK in der Service-Migration
  grantee_user_id uuid references public.profiles (id) on delete cascade,
  purpose public.key_grant_purpose not null,
  code_enc text,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status public.key_grant_status not null default 'scheduled',
  revealed_at timestamptz,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint key_access_grants_window check (valid_until > valid_from)
);

create index key_access_grants_booking_idx on public.key_access_grants (booking_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.booking_line_items enable row level security;
alter table public.insurance_products enable row level security;
alter table public.booking_insurances enable row level security;
alter table public.payment_installments enable row level security;
alter table public.deposits enable row level security;
alter table public.extra_charges enable row level security;
alter table public.transfers enable row level security;
alter table public.receipts enable row level security;
alter table public.stripe_events enable row level security;
alter table public.contracts enable row level security;
alter table public.key_access_grants enable row level security;

create policy "bookings: Beteiligte oder Admin lesen" on public.bookings
  for select to authenticated
  using (renter_id = (select auth.uid()) or owner_id = (select auth.uid()) or (select public.is_admin()));

create policy "booking_events: Beteiligte oder Admin lesen" on public.booking_events
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "booking_line_items: Beteiligte oder Admin lesen" on public.booking_line_items
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "insurance_products: aktive lesen" on public.insurance_products
  for select to anon, authenticated using (active);

create policy "booking_insurances: Beteiligte oder Admin lesen" on public.booking_insurances
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "payment_installments: Beteiligte oder Admin lesen" on public.payment_installments
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "deposits: Beteiligte oder Admin lesen" on public.deposits
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "extra_charges: Beteiligte oder Admin lesen" on public.extra_charges
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

create policy "transfers: Besitzer oder Admin lesen" on public.transfers
  for select to authenticated
  using ((select public.is_booking_owner(booking_id)) or (select public.is_admin()));

create policy "receipts: Empfänger oder Admin lesen" on public.receipts
  for select to authenticated
  using (recipient_id = (select auth.uid()) or (select public.is_admin()));

create policy "contracts: Beteiligte oder Admin lesen" on public.contracts
  for select to authenticated
  using ((select public.is_booking_participant(booking_id)) or (select public.is_admin()));

-- key_access_grants und stripe_events: kein Client-Zugriff (nur Server)
create policy "key_access_grants: nur Admin lesen" on public.key_access_grants
  for select to authenticated using ((select public.is_admin()));

revoke insert, update, delete on
  public.bookings, public.booking_events, public.booking_line_items,
  public.insurance_products, public.booking_insurances, public.payment_installments,
  public.deposits, public.extra_charges, public.transfers, public.receipts,
  public.contracts, public.key_access_grants
from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
revoke all on sequence public.receipt_number_seq from anon, authenticated;
revoke execute on function public.next_receipt_number() from public, anon, authenticated;

-- Mieter mit verbindlicher Buchung sehen genaue Adresse, Kennzeichen und privaten Übergabepunkt
create policy "listing_private_details: Mieter mit Buchung lesen" on public.listing_private_details
  for select to authenticated using ((select public.has_committed_booking_for_listing(listing_id)));
create policy "vehicle_private: Mieter mit Buchung lesen" on public.vehicle_private
  for select to authenticated using ((select public.has_committed_booking_for_vehicle(vehicle_id)));
create policy "handover_points: Mieter mit Buchung lesen" on public.handover_points
  for select to authenticated using ((select public.has_committed_booking_at_point(id)));
create policy "vehicles: Mieter mit Buchung lesen" on public.vehicles
  for select to authenticated using ((select public.has_committed_booking_for_vehicle(id)));
