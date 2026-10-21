-- Sicherheitskorrekturen aus den DB-Tests (tests/db/*)
--
-- 1. INSERT war für alle Spalten freigegeben. Jetzt dürfen Clients beim Anlegen nur die
--    fachlich erlaubten Spalten setzen (Prüfvermerke, Freigaben, Zeitstempel setzt nur der Server).
-- 2. Ein Besitzer konnte einen fremden privaten "Zuhause"-Punkt an sein Inserat hängen und so
--    die Privatadresse für seine Mieter sichtbar machen.
-- 3. Öffentliche Übergabepunkt-Slugs konnten von Nutzern belegt werden.
-- 4. Fahrzeuge: INSERT … RETURNING scheiterte, weil die SELECT-Policy nur über eine
--    Funktion prüfte, die die neue Zeile im selben Statement noch nicht sieht.

-- ---------------------------------------------------------------------------
-- Fahrzeuge
-- ---------------------------------------------------------------------------
drop policy "vehicles: sichtbare lesen" on public.vehicles;
create policy "vehicles: sichtbare lesen" on public.vehicles
  for select to anon, authenticated
  using (owner_id = (select auth.uid()) or (select public.vehicle_is_visible(id)));

revoke insert on public.vehicles from anon, authenticated;
grant insert (owner_id, make, model, year, fuel, transmission, seats, vehicle_class, color, mileage_km)
  on public.vehicles to authenticated;

-- Fotos nur aus dem eigenen Storage-Ordner verknüpfen
drop policy "vehicle_photos: eigene verwalten" on public.vehicle_photos;
create policy "vehicle_photos: eigene verwalten" on public.vehicle_photos
  for all to authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())))
  with check (
    exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()))
    and storage_path like (select auth.uid())::text || '/%'
  );

-- ---------------------------------------------------------------------------
-- Inserate: Freigabe-Felder nie vom Client
-- ---------------------------------------------------------------------------
revoke insert on public.listings from anon, authenticated;
grant insert (
  vehicle_id, owner_id, status, title, description, approx_location, approx_area_label,
  min_rental_days, max_rental_days, price_day_cents, price_week_cents, price_month_cents,
  extra_km_cents, deposit_cents, fuel_rule, smoking_allowed, pets_allowed, abroad_allowed,
  allowed_countries, cancellation_policy_id
) on public.listings to authenticated;

-- ---------------------------------------------------------------------------
-- Übergabepunkte
-- ---------------------------------------------------------------------------
revoke insert, update on public.handover_points from anon, authenticated;
grant insert (
  type, name, street, postal_code, city, location, opening_hours,
  parking_cost_cents_per_day, parking_info, instructions, is_public, owner_id, active
) on public.handover_points to authenticated;
grant update (
  name, street, postal_code, city, location, opening_hours,
  parking_cost_cents_per_day, parking_info, instructions, active
) on public.handover_points to authenticated;

-- Darf der aktuelle Nutzer diesen Übergabepunkt an ein Inserat hängen?
-- Öffentliche aktive Punkte ja, private nur die eigenen.
create or replace function public.can_use_handover_point(p_point_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.handover_points hp
     where hp.id = p_point_id
       and hp.active
       and (hp.is_public or hp.owner_id = (select auth.uid()))
  );
$$;

drop policy "listing_handover_points: Besitzer verwaltet" on public.listing_handover_points;
create policy "listing_handover_points: Besitzer verwaltet" on public.listing_handover_points
  for all to authenticated
  using ((select public.owns_listing(listing_id)))
  with check (
    (select public.owns_listing(listing_id))
    and (select public.can_use_handover_point(handover_point_id))
  );

-- ---------------------------------------------------------------------------
-- Chat: Zeitstempel und "gelesen" setzt nicht der Absender; Anhänge kommen über den Server
-- ---------------------------------------------------------------------------
revoke insert on public.messages from anon, authenticated;
grant insert (booking_id, sender_id, body) on public.messages to authenticated;
