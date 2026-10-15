-- Standzeit – Grundlagen: Extensions und Aufzählungstypen
-- Konventionen: Beträge in Cent (integer), Zeiten als timestamptz, IDs als uuid.

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- Konten & Verifizierung
create type public.profile_status as enum ('active', 'suspended');
create type public.verification_kind as enum ('renter', 'owner');
create type public.verification_status as enum ('draft', 'pending', 'approved', 'rejected', 'expired');
create type public.identity_provider as enum ('manual', 'stripe_identity');
create type public.document_kind as enum (
  'id_front', 'id_back', 'license_front', 'license_back', 'vehicle_registration'
);

-- Fahrzeuge & Inserate
create type public.fuel_type as enum (
  'petrol', 'diesel', 'hybrid', 'plugin_hybrid', 'electric', 'lpg', 'cng'
);
create type public.transmission as enum ('manual', 'automatic');
create type public.vehicle_class as enum (
  'mini', 'small', 'compact', 'midsize', 'upper_midsize', 'suv', 'van', 'premium'
);
create type public.listing_status as enum (
  'draft', 'pending_review', 'active', 'paused', 'rejected', 'archived'
);
create type public.fuel_rule as enum ('full_to_full', 'same_level');

-- Übergabe & Schlüssel
create type public.handover_point_type as enum (
  'owner_home', 'airport', 'main_station', 'park_and_ride', 'partner_garage'
);
create type public.keybox_provider as enum ('manual', 'smart', 'telematics');
create type public.key_grant_purpose as enum ('renter', 'service', 'owner_return');
create type public.key_grant_status as enum (
  'scheduled', 'active', 'used', 'revoked', 'expired', 'rotation_required'
);

-- Buchung
create type public.booking_status as enum (
  'requested', 'declined', 'expired', 'withdrawn',
  'confirmed', 'cancelled',
  'active', 'returned', 'in_service', 'ready', 'completed'
);
create type public.actor_type as enum ('renter', 'owner', 'admin', 'system', 'partner');
create type public.line_item_kind as enum (
  'rent', 'km_package', 'service_fee', 'return_service', 'insurance', 'deposit',
  'extra_km', 'fuel_difference', 'damage', 'cancellation_fee', 'late_fee',
  'discount', 'refund'
);
create type public.party as enum ('renter', 'owner', 'platform', 'insurer', 'partner');

-- Versicherung & Zahlung
create type public.insurance_status as enum (
  'quoted', 'bound', 'active', 'claim_open', 'closed', 'cancelled'
);
create type public.installment_status as enum (
  'scheduled', 'authorized', 'processing', 'paid', 'failed', 'cancelled', 'refunded'
);
create type public.deposit_strategy as enum ('hold_at_pickup', 'hold_before_return');
create type public.deposit_status as enum (
  'pending', 'held', 'released', 'partially_captured', 'captured', 'failed'
);
create type public.charge_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.transfer_status as enum ('scheduled', 'pending', 'paid', 'failed', 'reversed');
create type public.receipt_kind as enum ('renter_invoice', 'owner_statement', 'credit_note');

-- Fotos & Schadenscheck
create type public.inspection_kind as enum ('pickup', 'return', 'service_done');
create type public.photo_perspective as enum (
  'front', 'rear', 'left', 'right',
  'front_left', 'front_right', 'rear_left', 'rear_right',
  'interior_front', 'interior_rear', 'dashboard', 'other'
);
create type public.damage_check_status as enum ('queued', 'running', 'completed', 'failed');
create type public.damage_severity as enum ('minor', 'moderate', 'major');
create type public.finding_verdict as enum ('pending', 'confirmed', 'rejected');
create type public.damage_case_source as enum ('ai_check', 'owner_report', 'renter_report', 'admin');
create type public.damage_case_status as enum (
  'open', 'in_review', 'resolved_no_charge', 'resolved_charged', 'escalated_insurance'
);

-- Rückkehr-Service
create type public.service_order_status as enum (
  'created', 'sent', 'accepted', 'in_progress', 'done', 'problem', 'cancelled'
);

-- Preis-KI
create type public.local_event_category as enum (
  'trade_fair', 'folk_festival', 'school_holidays', 'public_holiday', 'concert', 'sports', 'other'
);

-- Kommunikation
create type public.review_direction as enum ('renter_to_owner', 'owner_to_renter');
create type public.notification_channel as enum ('email', 'push', 'in_app');
create type public.notification_status as enum ('queued', 'sent', 'failed');
create type public.flight_direction as enum ('outbound', 'inbound');
create type public.flight_status as enum ('scheduled', 'delayed', 'landed', 'cancelled', 'unknown');

-- Gemeinsamer Trigger für updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
