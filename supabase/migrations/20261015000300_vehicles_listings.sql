-- Fahrzeuge, Inserate (Urlaubsmodus), Übergabepunkte, Keyboxen

-- ---------------------------------------------------------------------------
-- Übergabepunkte (eigenes Datenmodell; "bei mir zu Hause" ist ein privater Punkt)
-- ---------------------------------------------------------------------------
create table public.handover_points (
  id uuid primary key default gen_random_uuid(),
  type public.handover_point_type not null,
  name text not null check (char_length(name) between 2 and 120),
  slug text unique,
  street text,
  postal_code text,
  city text not null default 'Stuttgart',
  location extensions.geography(point, 4326),
  opening_hours jsonb not null default '{}',
  parking_cost_cents_per_day integer check (parking_cost_cents_per_day >= 0),
  parking_info text,
  instructions text,
  is_public boolean not null default true,
  owner_id uuid references public.profiles (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handover_points_home_has_owner check ((type = 'owner_home') = (owner_id is not null)),
  constraint handover_points_home_is_private check (type <> 'owner_home' or not is_public)
);

create index handover_points_location_idx on public.handover_points using gist (location);
create trigger handover_points_updated_at before update on public.handover_points
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fahrzeuge
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  make text not null check (char_length(make) between 1 and 60),
  model text not null check (char_length(model) between 1 and 60),
  year smallint not null check (year between 1950 and 2100),
  fuel public.fuel_type not null,
  transmission public.transmission not null,
  seats smallint not null check (seats between 1 and 9),
  vehicle_class public.vehicle_class not null,
  color text,
  mileage_km integer check (mileage_km >= 0),
  registration_document_id uuid references public.secure_documents (id) on delete set null,
  registration_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_owner_idx on public.vehicles (owner_id);
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

alter table public.secure_documents
  add constraint secure_documents_vehicle_fk
  foreign key (vehicle_id) references public.vehicles (id) on delete cascade;

-- Kennzeichen & Co. nur für Besitzer, Admin und bestätigte Mieter
create table public.vehicle_private (
  vehicle_id uuid primary key references public.vehicles (id) on delete cascade,
  license_plate text check (char_length(license_plate) <= 15),
  vin text check (char_length(vin) <= 17),
  updated_at timestamptz not null default now()
);

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_photos_vehicle_idx on public.vehicle_photos (vehicle_id, position);

-- ---------------------------------------------------------------------------
-- Stornobedingungen
-- rules: [{ "min_days_before_start": 14, "refund_pct": 100 }, ...] absteigend
-- ---------------------------------------------------------------------------
create table public.cancellation_policies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  rules jsonb not null check (jsonb_typeof(rules) = 'array'),
  service_fee_refundable boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cancellation_policies (slug, name, description, rules, service_fee_refundable) values
  ('flexibel', 'Flexibel', 'Kostenlos bis 3 Tage vor Mietbeginn.',
   '[{"min_days_before_start": 3, "refund_pct": 100}, {"min_days_before_start": 1, "refund_pct": 50}, {"min_days_before_start": 0, "refund_pct": 0}]',
   true),
  ('moderat', 'Moderat', 'Kostenlos bis 7 Tage vor Mietbeginn, danach 50 %.',
   '[{"min_days_before_start": 7, "refund_pct": 100}, {"min_days_before_start": 2, "refund_pct": 50}, {"min_days_before_start": 0, "refund_pct": 0}]',
   false),
  ('streng', 'Streng', 'Kostenlos bis 14 Tage vor Mietbeginn, danach 50 % bis 7 Tage vorher.',
   '[{"min_days_before_start": 14, "refund_pct": 100}, {"min_days_before_start": 7, "refund_pct": 50}, {"min_days_before_start": 0, "refund_pct": 0}]',
   false);

-- ---------------------------------------------------------------------------
-- Inserate
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status public.listing_status not null default 'draft',
  title text not null default '' check (char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 5000),
  -- öffentlich nur ungefähr (auf ca. 500 m vergröbert)
  approx_location extensions.geography(point, 4326),
  approx_area_label text,
  min_rental_days integer not null default 3 check (min_rental_days >= 1),
  max_rental_days integer check (max_rental_days is null or max_rental_days >= min_rental_days),
  price_day_cents integer check (price_day_cents > 0),
  price_week_cents integer check (price_week_cents > 0),
  price_month_cents integer check (price_month_cents > 0),
  extra_km_cents integer not null default 0 check (extra_km_cents >= 0),
  deposit_cents integer not null default 50000 check (deposit_cents >= 0),
  fuel_rule public.fuel_rule not null default 'full_to_full',
  smoking_allowed boolean not null default false,
  pets_allowed boolean not null default false,
  abroad_allowed boolean not null default false,
  allowed_countries text[] not null default '{}',
  cancellation_policy_id uuid references public.cancellation_policies (id),
  review_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_status_idx on public.listings (status);
create index listings_owner_idx on public.listings (owner_id);
create index listings_location_idx on public.listings using gist (approx_location);
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- Genaue Adresse: erst nach bestätigter Buchung sichtbar
create table public.listing_private_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  street text,
  postal_code text,
  city text,
  exact_location extensions.geography(point, 4326),
  access_notes text,
  updated_at timestamptz not null default now()
);

-- Kilometerpakete (km pro 30 Tage, anteilig auf die Mietdauer)
create table public.km_packages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  name text not null,
  km_per_30_days integer not null check (km_per_30_days > 0),
  surcharge_per_30_days_cents integer not null default 0 check (surcharge_per_30_days_cents >= 0),
  is_default boolean not null default false,
  position smallint not null default 0
);

create unique index km_packages_one_default on public.km_packages (listing_id) where is_default;

-- Urlaubsmodus: Zeitfenster, in denen das Auto vermietet werden kann
create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  period tstzrange not null check (not isempty(period) and not lower_inf(period) and not upper_inf(period)),
  departure_flight text check (char_length(departure_flight) <= 10),
  return_flight text check (char_length(return_flight) <= 10),
  service_buffer_hours integer not null default 24 check (service_buffer_hours >= 0),
  note text,
  created_at timestamptz not null default now(),
  constraint availability_windows_no_overlap
    exclude using gist (listing_id with =, period with &&)
);

-- Welche Übergabepunkte ein Inserat anbietet
create table public.listing_handover_points (
  listing_id uuid not null references public.listings (id) on delete cascade,
  handover_point_id uuid not null references public.handover_points (id) on delete cascade,
  for_pickup boolean not null default true,
  for_return boolean not null default true,
  extra_fee_cents integer not null default 0 check (extra_fee_cents >= 0),
  primary key (listing_id, handover_point_id)
);

-- ---------------------------------------------------------------------------
-- Keyboxen und Zugangs-Codes
-- ---------------------------------------------------------------------------
create table public.keyboxes (
  id uuid primary key default gen_random_uuid(),
  provider public.keybox_provider not null default 'manual',
  handover_point_id uuid references public.handover_points (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  managed_by uuid references public.profiles (id) on delete set null,
  label text not null default '',
  location_hint text,
  external_device_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint keyboxes_has_place check (handover_point_id is not null or vehicle_id is not null)
);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen für Sichtbarkeit
-- ---------------------------------------------------------------------------
create or replace function public.owns_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings l
     where l.id = p_listing_id and l.owner_id = (select auth.uid())
  );
$$;

create or replace function public.listing_is_visible(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings l
     where l.id = p_listing_id
       and (l.status = 'active' or l.owner_id = (select auth.uid()) or (select public.is_admin()))
  );
$$;

create or replace function public.vehicle_is_visible(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.vehicles v
                  where v.id = p_vehicle_id
                    and (v.owner_id = (select auth.uid()) or (select public.is_admin())))
      or exists (select 1 from public.listings l
                  where l.vehicle_id = p_vehicle_id and l.status = 'active');
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.handover_points enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_private enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.cancellation_policies enable row level security;
alter table public.listings enable row level security;
alter table public.listing_private_details enable row level security;
alter table public.km_packages enable row level security;
alter table public.availability_windows enable row level security;
alter table public.listing_handover_points enable row level security;
alter table public.keyboxes enable row level security;

-- Übergabepunkte: öffentliche für alle; "Zuhause" nur Besitzer/Admin (Mieter: siehe Buchungs-Migration)
create policy "handover_points: öffentliche lesen" on public.handover_points
  for select to anon, authenticated using (is_public and active);
create policy "handover_points: eigene oder Admin lesen" on public.handover_points
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "handover_points: eigenen Zuhause-Punkt anlegen" on public.handover_points
  for insert to authenticated
  with check (type = 'owner_home' and owner_id = (select auth.uid()) and not is_public);
create policy "handover_points: eigenen Zuhause-Punkt ändern" on public.handover_points
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (type = 'owner_home' and owner_id = (select auth.uid()) and not is_public);
create policy "handover_points: eigenen Zuhause-Punkt löschen" on public.handover_points
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Fahrzeuge: sichtbar für Besitzer/Admin oder wenn ein aktives Inserat existiert
create policy "vehicles: sichtbare lesen" on public.vehicles
  for select to anon, authenticated using ((select public.vehicle_is_visible(id)));
create policy "vehicles: eigene anlegen" on public.vehicles
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.is_active_user()));
create policy "vehicles: eigene ändern" on public.vehicles
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "vehicles: eigene löschen" on public.vehicles
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke update on public.vehicles from anon, authenticated;
grant update (make, model, year, fuel, transmission, seats, vehicle_class, color, mileage_km)
  on public.vehicles to authenticated;

create policy "vehicle_photos: sichtbare lesen" on public.vehicle_photos
  for select to anon, authenticated using ((select public.vehicle_is_visible(vehicle_id)));
create policy "vehicle_photos: eigene verwalten" on public.vehicle_photos
  for all to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())));

-- Stornobedingungen: öffentlich lesbar
create policy "cancellation_policies: alle lesen" on public.cancellation_policies
  for select to anon, authenticated using (active);
revoke insert, update, delete on public.cancellation_policies from anon, authenticated;

-- Inserate: aktive öffentlich; Entwürfe nur Besitzer/Admin.
-- Status, Freigabe und Veröffentlichung setzt nur der Server (Admin-Freigabe).
create policy "listings: sichtbare lesen" on public.listings
  for select to anon, authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "listings: eigene Entwürfe anlegen" on public.listings
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'draft'
    and (select public.is_active_user())
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()))
  );
create policy "listings: eigene ändern" on public.listings
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke update, delete on public.listings from anon, authenticated;
grant update (
  title, description, approx_location, approx_area_label, min_rental_days, max_rental_days,
  price_day_cents, price_week_cents, price_month_cents, extra_km_cents, deposit_cents,
  fuel_rule, smoking_allowed, pets_allowed, abroad_allowed, allowed_countries, cancellation_policy_id
) on public.listings to authenticated;

-- Genaue Adresse: Besitzer/Admin (Mieter mit bestätigter Buchung: siehe Buchungs-Migration)
create policy "listing_private_details: Besitzer oder Admin lesen" on public.listing_private_details
  for select to authenticated
  using ((select public.owns_listing(listing_id)) or (select public.is_admin()));
create policy "listing_private_details: Besitzer verwaltet" on public.listing_private_details
  for all to authenticated
  using ((select public.owns_listing(listing_id)))
  with check ((select public.owns_listing(listing_id)));

create policy "vehicle_private: Besitzer oder Admin lesen" on public.vehicle_private
  for select to authenticated
  using (
    exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "vehicle_private: Besitzer verwaltet" on public.vehicle_private
  for all to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())));

-- Untertabellen eines Inserats: lesen wenn Inserat sichtbar, schreiben wenn eigenes
create policy "km_packages: lesen" on public.km_packages
  for select to anon, authenticated using ((select public.listing_is_visible(listing_id)));
create policy "km_packages: Besitzer verwaltet" on public.km_packages
  for all to authenticated
  using ((select public.owns_listing(listing_id)))
  with check ((select public.owns_listing(listing_id)));

create policy "availability_windows: lesen" on public.availability_windows
  for select to anon, authenticated using ((select public.listing_is_visible(listing_id)));
create policy "availability_windows: Besitzer verwaltet" on public.availability_windows
  for all to authenticated
  using ((select public.owns_listing(listing_id)))
  with check ((select public.owns_listing(listing_id)));

create policy "listing_handover_points: lesen" on public.listing_handover_points
  for select to anon, authenticated using ((select public.listing_is_visible(listing_id)));
create policy "listing_handover_points: Besitzer verwaltet" on public.listing_handover_points
  for all to authenticated
  using ((select public.owns_listing(listing_id)))
  with check ((select public.owns_listing(listing_id)));

-- Keyboxen: Verwalter oder Admin; Codes selbst liegen in key_access_grants (nur serverseitig)
create policy "keyboxes: Verwalter oder Admin lesen" on public.keyboxes
  for select to authenticated
  using (managed_by = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.keyboxes from anon, authenticated;
