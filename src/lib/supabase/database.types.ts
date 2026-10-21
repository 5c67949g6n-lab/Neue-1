
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": number,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_audit_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_windows": {
                  Row: {
                    "created_at": string,"departure_flight": string | null,"id": string,"listing_id": string,"note": string | null,"period": unknown,"return_flight": string | null,"service_buffer_hours": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"departure_flight"?: string | null,"id"?: string,"listing_id": string,"note"?: string | null,"period": unknown,"return_flight"?: string | null,"service_buffer_hours"?: number
                  }
                  Update: {
                    "created_at"?: string,"departure_flight"?: string | null,"id"?: string,"listing_id"?: string,"note"?: string | null,"period"?: unknown,"return_flight"?: string | null,"service_buffer_hours"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_windows_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_events": {
                  Row: {
                    "actor_id": string | null,"actor_type": Database["public"]['Enums']["actor_type"],"booking_id": string,"created_at": string,"details": NonNullable<Json>,"from_status": Database["public"]['Enums']["booking_status"] | null,"id": number,"note": string | null,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_type": Database["public"]['Enums']["actor_type"],"booking_id": string,"created_at"?: string,"details"?: NonNullable<Json>,"from_status"?: Database["public"]['Enums']["booking_status"] | null,"id"?: never,"note"?: string | null,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_type"?: Database["public"]['Enums']["actor_type"],"booking_id"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"from_status"?: Database["public"]['Enums']["booking_status"] | null,"id"?: never,"note"?: string | null,"to_status"?: Database["public"]['Enums']["booking_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_events_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_insurances": {
                  Row: {
                    "booking_id": string,"created_at": string,"id": string,"policy_number": string | null,"premium_cents_per_day": number,"product_id": string,"provider_ref": string | null,"status": Database["public"]['Enums']["insurance_status"],"total_premium_cents": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"id"?: string,"policy_number"?: string | null,"premium_cents_per_day": number,"product_id": string,"provider_ref"?: string | null,"status"?: Database["public"]['Enums']["insurance_status"],"total_premium_cents": number,"updated_at"?: string
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"id"?: string,"policy_number"?: string | null,"premium_cents_per_day"?: number,"product_id"?: string,"provider_ref"?: string | null,"status"?: Database["public"]['Enums']["insurance_status"],"total_premium_cents"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_insurances_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_insurances_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "insurance_products"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_line_items": {
                  Row: {
                    "amount_cents": number,"booking_id": string,"created_at": string,"description": string,"id": string,"installment_id": string | null,"kind": Database["public"]['Enums']["line_item_kind"],"payee": Database["public"]['Enums']["party"],"payer": Database["public"]['Enums']["party"],"quantity": number,"unit_cents": number,"vat_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"booking_id": string,"created_at"?: string,"description": string,"id"?: string,"installment_id"?: string | null,"kind": Database["public"]['Enums']["line_item_kind"],"payee": Database["public"]['Enums']["party"],"payer": Database["public"]['Enums']["party"],"quantity"?: number,"unit_cents": number,"vat_rate"?: number
                  }
                  Update: {
                    "amount_cents"?: number,"booking_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"installment_id"?: string | null,"kind"?: Database["public"]['Enums']["line_item_kind"],"payee"?: Database["public"]['Enums']["party"],"payer"?: Database["public"]['Enums']["party"],"quantity"?: number,"unit_cents"?: number,"vat_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_line_items_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_line_items_installment_fk"
      columns: ["installment_id"]
isOneToOne: false
      referencedRelation: "payment_installments"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "cancellation_reason": string | null,"cancellation_snapshot": NonNullable<Json>,"cancelled_at": string | null,"cancelled_by": string | null,"completed_at": string | null,"confirmed_at": string | null,"created_at": string,"currency": string,"deposit_cents": number,"expires_at": string,"fuel_end_pct": number | null,"fuel_start_pct": number | null,"id": string,"included_km": number | null,"insurance_cents": number,"is_test": boolean,"km_package_id": string | null,"listing_id": string,"odometer_end_km": number | null,"odometer_start_km": number | null,"owner_id": string,"picked_up_at": string | null,"pickup_point_id": string,"price_snapshot": NonNullable<Json>,"ready_at": string | null,"rent_cents": number,"rental_period": unknown,"renter_flight": string | null,"renter_id": string,"requested_at": string,"return_point_id": string,"return_service_cents": number,"returned_at": string | null,"service_fee_cents": number,"status": Database["public"]['Enums']["booking_status"],"total_cents": number,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancellation_reason"?: string | null,"cancellation_snapshot": NonNullable<Json>,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"currency"?: string,"deposit_cents"?: number,"expires_at": string,"fuel_end_pct"?: number | null,"fuel_start_pct"?: number | null,"id"?: string,"included_km"?: number | null,"insurance_cents"?: number,"is_test"?: boolean,"km_package_id"?: string | null,"listing_id": string,"odometer_end_km"?: number | null,"odometer_start_km"?: number | null,"owner_id": string,"picked_up_at"?: string | null,"pickup_point_id": string,"price_snapshot": NonNullable<Json>,"ready_at"?: string | null,"rent_cents"?: number,"rental_period": unknown,"renter_flight"?: string | null,"renter_id": string,"requested_at"?: string,"return_point_id": string,"return_service_cents"?: number,"returned_at"?: string | null,"service_fee_cents"?: number,"status"?: Database["public"]['Enums']["booking_status"],"total_cents"?: number,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"cancellation_snapshot"?: NonNullable<Json>,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"currency"?: string,"deposit_cents"?: number,"expires_at"?: string,"fuel_end_pct"?: number | null,"fuel_start_pct"?: number | null,"id"?: string,"included_km"?: number | null,"insurance_cents"?: number,"is_test"?: boolean,"km_package_id"?: string | null,"listing_id"?: string,"odometer_end_km"?: number | null,"odometer_start_km"?: number | null,"owner_id"?: string,"picked_up_at"?: string | null,"pickup_point_id"?: string,"price_snapshot"?: NonNullable<Json>,"ready_at"?: string | null,"rent_cents"?: number,"rental_period"?: unknown,"renter_flight"?: string | null,"renter_id"?: string,"requested_at"?: string,"return_point_id"?: string,"return_service_cents"?: number,"returned_at"?: string | null,"service_fee_cents"?: number,"status"?: Database["public"]['Enums']["booking_status"],"total_cents"?: number,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_km_package_id_fkey"
      columns: ["km_package_id"]
isOneToOne: false
      referencedRelation: "km_packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_pickup_point_id_fkey"
      columns: ["pickup_point_id"]
isOneToOne: false
      referencedRelation: "handover_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_renter_id_fkey"
      columns: ["renter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_return_point_id_fkey"
      columns: ["return_point_id"]
isOneToOne: false
      referencedRelation: "handover_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"cancellation_policies": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string,"id": string,"name": string,"rules": NonNullable<Json>,"service_fee_refundable": boolean,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"name": string,"rules": NonNullable<Json>,"service_fee_refundable"?: boolean,"slug": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"rules"?: NonNullable<Json>,"service_fee_refundable"?: boolean,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"contracts": {
                  Row: {
                    "booking_id": string,"created_at": string,"id": string,"owner_accept_ip": unknown,"owner_accepted_at": string | null,"pdf_path": string | null,"renter_accept_ip": unknown,"renter_accepted_at": string | null,"sha256": string | null,"template_version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"id"?: string,"owner_accept_ip"?: unknown,"owner_accepted_at"?: string | null,"pdf_path"?: string | null,"renter_accept_ip"?: unknown,"renter_accepted_at"?: string | null,"sha256"?: string | null,"template_version": string
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"id"?: string,"owner_accept_ip"?: unknown,"owner_accepted_at"?: string | null,"pdf_path"?: string | null,"renter_accept_ip"?: unknown,"renter_accepted_at"?: string | null,"sha256"?: string | null,"template_version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contracts_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"damage_case_photos": {
                  Row: {
                    "created_at": string,"damage_case_id": string,"id": string,"sha256": string,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"damage_case_id": string,"id"?: string,"sha256": string,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"damage_case_id"?: string,"id"?: string,"sha256"?: string,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "damage_case_photos_damage_case_id_fkey"
      columns: ["damage_case_id"]
isOneToOne: false
      referencedRelation: "damage_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_case_photos_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"damage_cases": {
                  Row: {
                    "booking_id": string,"charge_cents": number | null,"created_at": string,"damage_check_id": string | null,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"description": string,"id": string,"insurance_claim_number": string | null,"reported_by": string | null,"source": Database["public"]['Enums']["damage_case_source"],"status": Database["public"]['Enums']["damage_case_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"charge_cents"?: number | null,"created_at"?: string,"damage_check_id"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"description"?: string,"id"?: string,"insurance_claim_number"?: string | null,"reported_by"?: string | null,"source": Database["public"]['Enums']["damage_case_source"],"status"?: Database["public"]['Enums']["damage_case_status"],"updated_at"?: string
                  }
                  Update: {
                    "booking_id"?: string,"charge_cents"?: number | null,"created_at"?: string,"damage_check_id"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"description"?: string,"id"?: string,"insurance_claim_number"?: string | null,"reported_by"?: string | null,"source"?: Database["public"]['Enums']["damage_case_source"],"status"?: Database["public"]['Enums']["damage_case_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "damage_cases_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_cases_damage_check_id_fkey"
      columns: ["damage_check_id"]
isOneToOne: false
      referencedRelation: "damage_checks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_cases_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_cases_reported_by_fkey"
      columns: ["reported_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"damage_checks": {
                  Row: {
                    "booking_id": string,"completed_at": string | null,"created_at": string,"error": string | null,"id": string,"max_confidence": number | null,"model": string | null,"needs_review": boolean,"pickup_inspection_id": string,"prompt_version": string | null,"raw_result": Json | null,"return_inspection_id": string,"status": Database["public"]['Enums']["damage_check_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"completed_at"?: string | null,"created_at"?: string,"error"?: string | null,"id"?: string,"max_confidence"?: number | null,"model"?: string | null,"needs_review"?: boolean,"pickup_inspection_id": string,"prompt_version"?: string | null,"raw_result"?: Json | null,"return_inspection_id": string,"status"?: Database["public"]['Enums']["damage_check_status"]
                  }
                  Update: {
                    "booking_id"?: string,"completed_at"?: string | null,"created_at"?: string,"error"?: string | null,"id"?: string,"max_confidence"?: number | null,"model"?: string | null,"needs_review"?: boolean,"pickup_inspection_id"?: string,"prompt_version"?: string | null,"raw_result"?: Json | null,"return_inspection_id"?: string,"status"?: Database["public"]['Enums']["damage_check_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "damage_checks_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_checks_pickup_inspection_id_fkey"
      columns: ["pickup_inspection_id"]
isOneToOne: false
      referencedRelation: "inspections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_checks_return_inspection_id_fkey"
      columns: ["return_inspection_id"]
isOneToOne: false
      referencedRelation: "inspections"
      referencedColumns: ["id"]
    }
                  ]
                },"damage_findings": {
                  Row: {
                    "bbox": Json | null,"confidence": number,"created_at": string,"damage_check_id": string,"description": string,"id": string,"perspective": Database["public"]['Enums']["photo_perspective"],"pickup_photo_id": string | null,"return_photo_id": string | null,"severity": Database["public"]['Enums']["damage_severity"],"verdict": Database["public"]['Enums']["finding_verdict"]
                  }
                  ComputedFields: never
                  Insert: {
                    "bbox"?: Json | null,"confidence": number,"created_at"?: string,"damage_check_id": string,"description": string,"id"?: string,"perspective": Database["public"]['Enums']["photo_perspective"],"pickup_photo_id"?: string | null,"return_photo_id"?: string | null,"severity": Database["public"]['Enums']["damage_severity"],"verdict"?: Database["public"]['Enums']["finding_verdict"]
                  }
                  Update: {
                    "bbox"?: Json | null,"confidence"?: number,"created_at"?: string,"damage_check_id"?: string,"description"?: string,"id"?: string,"perspective"?: Database["public"]['Enums']["photo_perspective"],"pickup_photo_id"?: string | null,"return_photo_id"?: string | null,"severity"?: Database["public"]['Enums']["damage_severity"],"verdict"?: Database["public"]['Enums']["finding_verdict"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "damage_findings_damage_check_id_fkey"
      columns: ["damage_check_id"]
isOneToOne: false
      referencedRelation: "damage_checks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_findings_pickup_photo_id_fkey"
      columns: ["pickup_photo_id"]
isOneToOne: false
      referencedRelation: "inspection_photos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "damage_findings_return_photo_id_fkey"
      columns: ["return_photo_id"]
isOneToOne: false
      referencedRelation: "inspection_photos"
      referencedColumns: ["id"]
    }
                  ]
                },"deposits": {
                  Row: {
                    "amount_cents": number,"booking_id": string,"captured_cents": number,"created_at": string,"hold_expires_at": string | null,"hold_placed_at": string | null,"hold_scheduled_for": string | null,"id": string,"released_at": string | null,"status": Database["public"]['Enums']["deposit_status"],"strategy": Database["public"]['Enums']["deposit_strategy"],"stripe_payment_intent_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"booking_id": string,"captured_cents"?: number,"created_at"?: string,"hold_expires_at"?: string | null,"hold_placed_at"?: string | null,"hold_scheduled_for"?: string | null,"id"?: string,"released_at"?: string | null,"status"?: Database["public"]['Enums']["deposit_status"],"strategy": Database["public"]['Enums']["deposit_strategy"],"stripe_payment_intent_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"booking_id"?: string,"captured_cents"?: number,"created_at"?: string,"hold_expires_at"?: string | null,"hold_placed_at"?: string | null,"hold_scheduled_for"?: string | null,"id"?: string,"released_at"?: string | null,"status"?: Database["public"]['Enums']["deposit_status"],"strategy"?: Database["public"]['Enums']["deposit_strategy"],"stripe_payment_intent_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deposits_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"extra_charges": {
                  Row: {
                    "amount_cents": number,"booking_id": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["line_item_kind"],"note": string | null,"status": Database["public"]['Enums']["charge_status"],"stripe_payment_intent_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"booking_id": string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["line_item_kind"],"note"?: string | null,"status"?: Database["public"]['Enums']["charge_status"],"stripe_payment_intent_id"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"booking_id"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["line_item_kind"],"note"?: string | null,"status"?: Database["public"]['Enums']["charge_status"],"stripe_payment_intent_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "extra_charges_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"flight_watches": {
                  Row: {
                    "availability_window_id": string | null,"booking_id": string | null,"created_at": string,"direction": Database["public"]['Enums']["flight_direction"],"estimated_arrival": string | null,"flight_date": string,"flight_number": string,"id": string,"last_checked_at": string | null,"provider": string | null,"scheduled_arrival": string | null,"status": Database["public"]['Enums']["flight_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "availability_window_id"?: string | null,"booking_id"?: string | null,"created_at"?: string,"direction": Database["public"]['Enums']["flight_direction"],"estimated_arrival"?: string | null,"flight_date": string,"flight_number": string,"id"?: string,"last_checked_at"?: string | null,"provider"?: string | null,"scheduled_arrival"?: string | null,"status"?: Database["public"]['Enums']["flight_status"]
                  }
                  Update: {
                    "availability_window_id"?: string | null,"booking_id"?: string | null,"created_at"?: string,"direction"?: Database["public"]['Enums']["flight_direction"],"estimated_arrival"?: string | null,"flight_date"?: string,"flight_number"?: string,"id"?: string,"last_checked_at"?: string | null,"provider"?: string | null,"scheduled_arrival"?: string | null,"status"?: Database["public"]['Enums']["flight_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "flight_watches_availability_window_id_fkey"
      columns: ["availability_window_id"]
isOneToOne: false
      referencedRelation: "availability_windows"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "flight_watches_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"handover_points": {
                  Row: {
                    "active": boolean,"city": string,"created_at": string,"id": string,"instructions": string | null,"is_public": boolean,"location": unknown,"name": string,"opening_hours": NonNullable<Json>,"owner_id": string | null,"parking_cost_cents_per_day": number | null,"parking_info": string | null,"postal_code": string | null,"slug": string | null,"street": string | null,"type": Database["public"]['Enums']["handover_point_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"city"?: string,"created_at"?: string,"id"?: string,"instructions"?: string | null,"is_public"?: boolean,"location"?: unknown,"name": string,"opening_hours"?: NonNullable<Json>,"owner_id"?: string | null,"parking_cost_cents_per_day"?: number | null,"parking_info"?: string | null,"postal_code"?: string | null,"slug"?: string | null,"street"?: string | null,"type": Database["public"]['Enums']["handover_point_type"],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"city"?: string,"created_at"?: string,"id"?: string,"instructions"?: string | null,"is_public"?: boolean,"location"?: unknown,"name"?: string,"opening_hours"?: NonNullable<Json>,"owner_id"?: string | null,"parking_cost_cents_per_day"?: number | null,"parking_info"?: string | null,"postal_code"?: string | null,"slug"?: string | null,"street"?: string | null,"type"?: Database["public"]['Enums']["handover_point_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "handover_points_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_photos": {
                  Row: {
                    "accuracy_m": number | null,"captured_at": string | null,"delete_after": string | null,"device_info": NonNullable<Json>,"id": string,"inspection_id": string,"latitude": number | null,"longitude": number | null,"mime_type": string,"perspective": Database["public"]['Enums']["photo_perspective"],"received_at": string,"sha256": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy_m"?: number | null,"captured_at"?: string | null,"delete_after"?: string | null,"device_info"?: NonNullable<Json>,"id"?: string,"inspection_id": string,"latitude"?: number | null,"longitude"?: number | null,"mime_type": string,"perspective": Database["public"]['Enums']["photo_perspective"],"received_at"?: string,"sha256": string,"storage_path": string
                  }
                  Update: {
                    "accuracy_m"?: number | null,"captured_at"?: string | null,"delete_after"?: string | null,"device_info"?: NonNullable<Json>,"id"?: string,"inspection_id"?: string,"latitude"?: number | null,"longitude"?: number | null,"mime_type"?: string,"perspective"?: Database["public"]['Enums']["photo_perspective"],"received_at"?: string,"sha256"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_photos_inspection_id_fkey"
      columns: ["inspection_id"]
isOneToOne: false
      referencedRelation: "inspections"
      referencedColumns: ["id"]
    }
                  ]
                },"inspections": {
                  Row: {
                    "battery_level_pct": number | null,"booking_id": string,"completed_at": string | null,"fuel_level_pct": number | null,"id": string,"kind": Database["public"]['Enums']["inspection_kind"],"location": unknown,"notes": string | null,"odometer_km": number | null,"performed_by": string | null,"performed_by_partner_id": string | null,"started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "battery_level_pct"?: number | null,"booking_id": string,"completed_at"?: string | null,"fuel_level_pct"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["inspection_kind"],"location"?: unknown,"notes"?: string | null,"odometer_km"?: number | null,"performed_by"?: string | null,"performed_by_partner_id"?: string | null,"started_at"?: string
                  }
                  Update: {
                    "battery_level_pct"?: number | null,"booking_id"?: string,"completed_at"?: string | null,"fuel_level_pct"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["inspection_kind"],"location"?: unknown,"notes"?: string | null,"odometer_km"?: number | null,"performed_by"?: string | null,"performed_by_partner_id"?: string | null,"started_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspections_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspections_partner_fk"
      columns: ["performed_by_partner_id"]
isOneToOne: false
      referencedRelation: "service_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspections_performed_by_fkey"
      columns: ["performed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"insurance_products": {
                  Row: {
                    "active": boolean,"created_at": string,"deductible_cents": number,"id": string,"is_placeholder": boolean,"partner_name": string,"premium_cents_per_day": number,"product_name": string,"terms_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"deductible_cents"?: number,"id"?: string,"is_placeholder"?: boolean,"partner_name": string,"premium_cents_per_day": number,"product_name": string,"terms_url"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"deductible_cents"?: number,"id"?: string,"is_placeholder"?: boolean,"partner_name"?: string,"premium_cents_per_day"?: number,"product_name"?: string,"terms_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"key_access_grants": {
                  Row: {
                    "booking_id": string | null,"code_enc": string | null,"created_at": string,"grantee_user_id": string | null,"id": string,"keybox_id": string,"purpose": Database["public"]['Enums']["key_grant_purpose"],"revealed_at": string | null,"revoked_at": string | null,"service_order_id": string | null,"status": Database["public"]['Enums']["key_grant_status"],"used_at": string | null,"valid_from": string,"valid_until": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"code_enc"?: string | null,"created_at"?: string,"grantee_user_id"?: string | null,"id"?: string,"keybox_id": string,"purpose": Database["public"]['Enums']["key_grant_purpose"],"revealed_at"?: string | null,"revoked_at"?: string | null,"service_order_id"?: string | null,"status"?: Database["public"]['Enums']["key_grant_status"],"used_at"?: string | null,"valid_from": string,"valid_until": string
                  }
                  Update: {
                    "booking_id"?: string | null,"code_enc"?: string | null,"created_at"?: string,"grantee_user_id"?: string | null,"id"?: string,"keybox_id"?: string,"purpose"?: Database["public"]['Enums']["key_grant_purpose"],"revealed_at"?: string | null,"revoked_at"?: string | null,"service_order_id"?: string | null,"status"?: Database["public"]['Enums']["key_grant_status"],"used_at"?: string | null,"valid_from"?: string,"valid_until"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "key_access_grants_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "key_access_grants_grantee_user_id_fkey"
      columns: ["grantee_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "key_access_grants_keybox_id_fkey"
      columns: ["keybox_id"]
isOneToOne: false
      referencedRelation: "keyboxes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "key_access_grants_service_order_fk"
      columns: ["service_order_id"]
isOneToOne: false
      referencedRelation: "service_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"keyboxes": {
                  Row: {
                    "active": boolean,"created_at": string,"external_device_id": string | null,"handover_point_id": string | null,"id": string,"label": string,"location_hint": string | null,"managed_by": string | null,"provider": Database["public"]['Enums']["keybox_provider"],"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"external_device_id"?: string | null,"handover_point_id"?: string | null,"id"?: string,"label"?: string,"location_hint"?: string | null,"managed_by"?: string | null,"provider"?: Database["public"]['Enums']["keybox_provider"],"vehicle_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"external_device_id"?: string | null,"handover_point_id"?: string | null,"id"?: string,"label"?: string,"location_hint"?: string | null,"managed_by"?: string | null,"provider"?: Database["public"]['Enums']["keybox_provider"],"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "keyboxes_handover_point_id_fkey"
      columns: ["handover_point_id"]
isOneToOne: false
      referencedRelation: "handover_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyboxes_managed_by_fkey"
      columns: ["managed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "keyboxes_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"km_packages": {
                  Row: {
                    "id": string,"is_default": boolean,"km_per_30_days": number,"listing_id": string,"name": string,"position": number,"surcharge_per_30_days_cents": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_default"?: boolean,"km_per_30_days": number,"listing_id": string,"name": string,"position"?: number,"surcharge_per_30_days_cents"?: number
                  }
                  Update: {
                    "id"?: string,"is_default"?: boolean,"km_per_30_days"?: number,"listing_id"?: string,"name"?: string,"position"?: number,"surcharge_per_30_days_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "km_packages_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"legal_pages": {
                  Row: {
                    "content_md": string,"slug": string,"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content_md": string,"slug": string,"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "content_md"?: string,"slug"?: string,"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"listing_handover_points": {
                  Row: {
                    "extra_fee_cents": number,"for_pickup": boolean,"for_return": boolean,"handover_point_id": string,"listing_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "extra_fee_cents"?: number,"for_pickup"?: boolean,"for_return"?: boolean,"handover_point_id": string,"listing_id": string
                  }
                  Update: {
                    "extra_fee_cents"?: number,"for_pickup"?: boolean,"for_return"?: boolean,"handover_point_id"?: string,"listing_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_handover_points_handover_point_id_fkey"
      columns: ["handover_point_id"]
isOneToOne: false
      referencedRelation: "handover_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_handover_points_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_private_details": {
                  Row: {
                    "access_notes": string | null,"city": string | null,"exact_location": unknown,"listing_id": string,"postal_code": string | null,"street": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_notes"?: string | null,"city"?: string | null,"exact_location"?: unknown,"listing_id": string,"postal_code"?: string | null,"street"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "access_notes"?: string | null,"city"?: string | null,"exact_location"?: unknown,"listing_id"?: string,"postal_code"?: string | null,"street"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_private_details_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: true
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "abroad_allowed": boolean,"allowed_countries": (string)[],"approx_area_label": string | null,"approx_location": unknown,"cancellation_policy_id": string | null,"created_at": string,"deposit_cents": number,"description": string,"extra_km_cents": number,"fuel_rule": Database["public"]['Enums']["fuel_rule"],"id": string,"max_rental_days": number | null,"min_rental_days": number,"owner_id": string,"pets_allowed": boolean,"price_day_cents": number | null,"price_month_cents": number | null,"price_week_cents": number | null,"published_at": string | null,"review_note": string | null,"smoking_allowed": boolean,"status": Database["public"]['Enums']["listing_status"],"title": string,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abroad_allowed"?: boolean,"allowed_countries"?: (string)[],"approx_area_label"?: string | null,"approx_location"?: unknown,"cancellation_policy_id"?: string | null,"created_at"?: string,"deposit_cents"?: number,"description"?: string,"extra_km_cents"?: number,"fuel_rule"?: Database["public"]['Enums']["fuel_rule"],"id"?: string,"max_rental_days"?: number | null,"min_rental_days"?: number,"owner_id": string,"pets_allowed"?: boolean,"price_day_cents"?: number | null,"price_month_cents"?: number | null,"price_week_cents"?: number | null,"published_at"?: string | null,"review_note"?: string | null,"smoking_allowed"?: boolean,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "abroad_allowed"?: boolean,"allowed_countries"?: (string)[],"approx_area_label"?: string | null,"approx_location"?: unknown,"cancellation_policy_id"?: string | null,"created_at"?: string,"deposit_cents"?: number,"description"?: string,"extra_km_cents"?: number,"fuel_rule"?: Database["public"]['Enums']["fuel_rule"],"id"?: string,"max_rental_days"?: number | null,"min_rental_days"?: number,"owner_id"?: string,"pets_allowed"?: boolean,"price_day_cents"?: number | null,"price_month_cents"?: number | null,"price_week_cents"?: number | null,"published_at"?: string | null,"review_note"?: string | null,"smoking_allowed"?: boolean,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_cancellation_policy_id_fkey"
      columns: ["cancellation_policy_id"]
isOneToOne: false
      referencedRelation: "cancellation_policies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"local_events": {
                  Row: {
                    "category": Database["public"]['Enums']["local_event_category"],"created_at": string,"demand_factor": number,"id": string,"name": string,"notes": string | null,"period": unknown,"region": string,"source_url": string | null,"vehicle_classes": (Database["public"]['Enums']["vehicle_class"])[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["local_event_category"],"created_at"?: string,"demand_factor"?: number,"id"?: string,"name": string,"notes"?: string | null,"period": unknown,"region"?: string,"source_url"?: string | null,"vehicle_classes"?: (Database["public"]['Enums']["vehicle_class"])[] | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["local_event_category"],"created_at"?: string,"demand_factor"?: number,"id"?: string,"name"?: string,"notes"?: string | null,"period"?: unknown,"region"?: string,"source_url"?: string | null,"vehicle_classes"?: (Database["public"]['Enums']["vehicle_class"])[] | null
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "attachment_path": string | null,"body": string,"booking_id": string,"created_at": string,"id": string,"read_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_path"?: string | null,"body": string,"booking_id": string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "attachment_path"?: string | null,"body"?: string,"booking_id"?: string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "channel": Database["public"]['Enums']["notification_channel"],"created_at": string,"error": string | null,"id": string,"payload": NonNullable<Json>,"read_at": string | null,"recipient_email": string | null,"sent_at": string | null,"status": Database["public"]['Enums']["notification_status"],"type": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"error"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"recipient_email"?: string | null,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["notification_status"],"type": string,"user_id"?: string | null
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"error"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"recipient_email"?: string | null,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["notification_status"],"type"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_installments": {
                  Row: {
                    "amount_cents": number,"attempts": number,"booking_id": string,"created_at": string,"due_at": string,"failure_reason": string | null,"id": string,"owner_share_cents": number,"paid_at": string | null,"period": unknown,"platform_share_cents": number,"seq": number,"status": Database["public"]['Enums']["installment_status"],"stripe_payment_intent_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"attempts"?: number,"booking_id": string,"created_at"?: string,"due_at": string,"failure_reason"?: string | null,"id"?: string,"owner_share_cents": number,"paid_at"?: string | null,"period": unknown,"platform_share_cents": number,"seq": number,"status"?: Database["public"]['Enums']["installment_status"],"stripe_payment_intent_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"attempts"?: number,"booking_id"?: string,"created_at"?: string,"due_at"?: string,"failure_reason"?: string | null,"id"?: string,"owner_share_cents"?: number,"paid_at"?: string | null,"period"?: unknown,"platform_share_cents"?: number,"seq"?: number,"status"?: Database["public"]['Enums']["installment_status"],"stripe_payment_intent_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_installments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"payout_accounts": {
                  Row: {
                    "charges_enabled": boolean,"details_submitted": boolean,"payouts_enabled": boolean,"stripe_account_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "charges_enabled"?: boolean,"details_submitted"?: boolean,"payouts_enabled"?: boolean,"stripe_account_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "charges_enabled"?: boolean,"details_submitted"?: boolean,"payouts_enabled"?: boolean,"stripe_account_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payout_accounts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_settings": {
                  Row: {
                    "description": string,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"price_suggestions": {
                  Row: {
                    "adjustments": NonNullable<Json>,"base_day_cents": number,"chosen_day_cents": number | null,"chosen_month_cents": number | null,"chosen_week_cents": number | null,"created_at": string,"id": string,"inputs": NonNullable<Json>,"listing_id": string | null,"model_version": string,"requested_by": string | null,"suggested_day_cents": number,"suggested_month_cents": number | null,"suggested_week_cents": number | null,"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "adjustments"?: NonNullable<Json>,"base_day_cents": number,"chosen_day_cents"?: number | null,"chosen_month_cents"?: number | null,"chosen_week_cents"?: number | null,"created_at"?: string,"id"?: string,"inputs": NonNullable<Json>,"listing_id"?: string | null,"model_version"?: string,"requested_by"?: string | null,"suggested_day_cents": number,"suggested_month_cents"?: number | null,"suggested_week_cents"?: number | null,"vehicle_id"?: string | null
                  }
                  Update: {
                    "adjustments"?: NonNullable<Json>,"base_day_cents"?: number,"chosen_day_cents"?: number | null,"chosen_month_cents"?: number | null,"chosen_week_cents"?: number | null,"created_at"?: string,"id"?: string,"inputs"?: NonNullable<Json>,"listing_id"?: string | null,"model_version"?: string,"requested_by"?: string | null,"suggested_day_cents"?: number,"suggested_month_cents"?: number | null,"suggested_week_cents"?: number | null,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_suggestions_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_suggestions_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_suggestions_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private": {
                  Row: {
                    "first_name": string | null,"is_admin": boolean,"last_name": string | null,"phone": string | null,"status": Database["public"]['Enums']["profile_status"],"suspended_reason": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "first_name"?: string | null,"is_admin"?: boolean,"last_name"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["profile_status"],"suspended_reason"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "first_name"?: string | null,"is_admin"?: boolean,"last_name"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["profile_status"],"suspended_reason"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_private_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"bio": string | null,"created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"receipts": {
                  Row: {
                    "amount_cents": number,"booking_id": string,"id": string,"issued_at": string,"kind": Database["public"]['Enums']["receipt_kind"],"number": string,"pdf_path": string | null,"recipient_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"booking_id": string,"id"?: string,"issued_at"?: string,"kind": Database["public"]['Enums']["receipt_kind"],"number": string,"pdf_path"?: string | null,"recipient_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"booking_id"?: string,"id"?: string,"issued_at"?: string,"kind"?: Database["public"]['Enums']["receipt_kind"],"number"?: string,"pdf_path"?: string | null,"recipient_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "receipts_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "author_id": string,"booking_id": string,"comment": string | null,"created_at": string,"direction": Database["public"]['Enums']["review_direction"],"id": string,"published_at": string | null,"rating": number,"sub_ratings": NonNullable<Json>,"subject_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"booking_id": string,"comment"?: string | null,"created_at"?: string,"direction": Database["public"]['Enums']["review_direction"],"id"?: string,"published_at"?: string | null,"rating": number,"sub_ratings"?: NonNullable<Json>,"subject_id": string
                  }
                  Update: {
                    "author_id"?: string,"booking_id"?: string,"comment"?: string | null,"created_at"?: string,"direction"?: Database["public"]['Enums']["review_direction"],"id"?: string,"published_at"?: string | null,"rating"?: number,"sub_ratings"?: NonNullable<Json>,"subject_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"secure_documents": {
                  Row: {
                    "created_at": string,"delete_after": string | null,"id": string,"key_id": string,"kind": Database["public"]['Enums']["document_kind"],"mime_type": string,"owner_id": string,"sha256": string,"size_bytes": number,"storage_path": string,"vehicle_id": string | null,"verification_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delete_after"?: string | null,"id"?: string,"key_id": string,"kind": Database["public"]['Enums']["document_kind"],"mime_type": string,"owner_id": string,"sha256": string,"size_bytes": number,"storage_path": string,"vehicle_id"?: string | null,"verification_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"delete_after"?: string | null,"id"?: string,"key_id"?: string,"kind"?: Database["public"]['Enums']["document_kind"],"mime_type"?: string,"owner_id"?: string,"sha256"?: string,"size_bytes"?: number,"storage_path"?: string,"vehicle_id"?: string | null,"verification_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "secure_documents_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "secure_documents_vehicle_fk"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "secure_documents_verification_id_fkey"
      columns: ["verification_id"]
isOneToOne: false
      referencedRelation: "verifications"
      referencedColumns: ["id"]
    }
                  ]
                },"service_orders": {
                  Row: {
                    "accepted_at": string | null,"access_token_expires_at": string | null,"access_token_hash": string | null,"booking_id": string,"completed_at": string | null,"cost_cents": number | null,"created_at": string,"deliver_to_point_id": string | null,"due_by": string,"fuel_cost_cents": number | null,"fuel_liters": number | null,"fuel_receipt_path": string | null,"id": string,"notes": string | null,"partner_id": string | null,"pickup_point_id": string | null,"sent_at": string | null,"started_at": string | null,"status": Database["public"]['Enums']["service_order_status"],"tasks": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"access_token_expires_at"?: string | null,"access_token_hash"?: string | null,"booking_id": string,"completed_at"?: string | null,"cost_cents"?: number | null,"created_at"?: string,"deliver_to_point_id"?: string | null,"due_by": string,"fuel_cost_cents"?: number | null,"fuel_liters"?: number | null,"fuel_receipt_path"?: string | null,"id"?: string,"notes"?: string | null,"partner_id"?: string | null,"pickup_point_id"?: string | null,"sent_at"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["service_order_status"],"tasks"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"access_token_expires_at"?: string | null,"access_token_hash"?: string | null,"booking_id"?: string,"completed_at"?: string | null,"cost_cents"?: number | null,"created_at"?: string,"deliver_to_point_id"?: string | null,"due_by"?: string,"fuel_cost_cents"?: number | null,"fuel_liters"?: number | null,"fuel_receipt_path"?: string | null,"id"?: string,"notes"?: string | null,"partner_id"?: string | null,"pickup_point_id"?: string | null,"sent_at"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["service_order_status"],"tasks"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_orders_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_deliver_to_point_id_fkey"
      columns: ["deliver_to_point_id"]
isOneToOne: false
      referencedRelation: "handover_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "service_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_pickup_point_id_fkey"
      columns: ["pickup_point_id"]
isOneToOne: false
      referencedRelation: "handover_points"
      referencedColumns: ["id"]
    }
                  ]
                },"service_partners": {
                  Row: {
                    "active": boolean,"city": string,"created_at": string,"email": string,"id": string,"kind": string,"location": unknown,"name": string,"phone": string | null,"postal_code": string | null,"price_list": NonNullable<Json>,"services": (string)[],"street": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"city"?: string,"created_at"?: string,"email": string,"id"?: string,"kind"?: string,"location"?: unknown,"name": string,"phone"?: string | null,"postal_code"?: string | null,"price_list"?: NonNullable<Json>,"services"?: (string)[],"street"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"city"?: string,"created_at"?: string,"email"?: string,"id"?: string,"kind"?: string,"location"?: unknown,"name"?: string,"phone"?: string | null,"postal_code"?: string | null,"price_list"?: NonNullable<Json>,"services"?: (string)[],"street"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"stripe_events": {
                  Row: {
                    "id": string,"payload": NonNullable<Json>,"processed_at": string | null,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"payload": NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"transfers": {
                  Row: {
                    "amount_cents": number,"booking_id": string,"created_at": string,"id": string,"installment_id": string | null,"scheduled_for": string,"status": Database["public"]['Enums']["transfer_status"],"stripe_transfer_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"booking_id": string,"created_at"?: string,"id"?: string,"installment_id"?: string | null,"scheduled_for": string,"status"?: Database["public"]['Enums']["transfer_status"],"stripe_transfer_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"booking_id"?: string,"created_at"?: string,"id"?: string,"installment_id"?: string | null,"scheduled_for"?: string,"status"?: Database["public"]['Enums']["transfer_status"],"stripe_transfer_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transfers_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transfers_installment_id_fkey"
      columns: ["installment_id"]
isOneToOne: false
      referencedRelation: "payment_installments"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_photos": {
                  Row: {
                    "created_at": string,"id": string,"position": number,"storage_path": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"position"?: number,"storage_path": string,"vehicle_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"position"?: number,"storage_path"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_photos_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_private": {
                  Row: {
                    "license_plate": string | null,"updated_at": string,"vehicle_id": string,"vin": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "license_plate"?: string | null,"updated_at"?: string,"vehicle_id": string,"vin"?: string | null
                  }
                  Update: {
                    "license_plate"?: string | null,"updated_at"?: string,"vehicle_id"?: string,"vin"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_private_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: true
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "color": string | null,"created_at": string,"fuel": Database["public"]['Enums']["fuel_type"],"id": string,"make": string,"mileage_km": number | null,"model": string,"owner_id": string,"registration_document_id": string | null,"registration_verified_at": string | null,"seats": number,"transmission": Database["public"]['Enums']["transmission"],"updated_at": string,"vehicle_class": Database["public"]['Enums']["vehicle_class"],"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string,"fuel": Database["public"]['Enums']["fuel_type"],"id"?: string,"make": string,"mileage_km"?: number | null,"model": string,"owner_id": string,"registration_document_id"?: string | null,"registration_verified_at"?: string | null,"seats": number,"transmission": Database["public"]['Enums']["transmission"],"updated_at"?: string,"vehicle_class": Database["public"]['Enums']["vehicle_class"],"year": number
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string,"fuel"?: Database["public"]['Enums']["fuel_type"],"id"?: string,"make"?: string,"mileage_km"?: number | null,"model"?: string,"owner_id"?: string,"registration_document_id"?: string | null,"registration_verified_at"?: string | null,"seats"?: number,"transmission"?: Database["public"]['Enums']["transmission"],"updated_at"?: string,"vehicle_class"?: Database["public"]['Enums']["vehicle_class"],"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_registration_document_id_fkey"
      columns: ["registration_document_id"]
isOneToOne: false
      referencedRelation: "secure_documents"
      referencedColumns: ["id"]
    }
                  ]
                },"verifications": {
                  Row: {
                    "created_at": string,"date_of_birth_enc": string | null,"delete_after": string | null,"expires_at": string | null,"id": string,"kind": Database["public"]['Enums']["verification_kind"],"license_classes": (string)[],"license_issued_on_enc": string | null,"provider": Database["public"]['Enums']["identity_provider"],"provider_ref": string | null,"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["verification_status"],"submitted_at": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date_of_birth_enc"?: string | null,"delete_after"?: string | null,"expires_at"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["verification_kind"],"license_classes"?: (string)[],"license_issued_on_enc"?: string | null,"provider"?: Database["public"]['Enums']["identity_provider"],"provider_ref"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"submitted_at"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"date_of_birth_enc"?: string | null,"delete_after"?: string | null,"expires_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["verification_kind"],"license_classes"?: (string)[],"license_issued_on_enc"?: string | null,"provider"?: Database["public"]['Enums']["identity_provider"],"provider_ref"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"submitted_at"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verifications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_revoke_user_sessions":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"can_use_handover_point":
{ Args: { "p_point_id": string }; Returns: boolean
                           },
"has_committed_booking_at_point":
{ Args: { "p_point_id": string }; Returns: boolean
                           },
"has_committed_booking_for_listing":
{ Args: { "p_listing_id": string }; Returns: boolean
                           },
"has_committed_booking_for_vehicle":
{ Args: { "p_vehicle_id": string }; Returns: boolean
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_booking_owner":
{ Args: { "p_booking_id": string }; Returns: boolean
                           },
"is_booking_participant":
{ Args: { "p_booking_id": string }; Returns: boolean
                           },
"listing_is_visible":
{ Args: { "p_listing_id": string }; Returns: boolean
                           },
"next_receipt_number":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"owns_listing":
{ Args: { "p_listing_id": string }; Returns: boolean
                           },
"vehicle_is_visible":
{ Args: { "p_vehicle_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "actor_type": "renter"|"owner"|"admin"|"system"|"partner","booking_status": "requested"|"declined"|"expired"|"withdrawn"|"confirmed"|"cancelled"|"active"|"returned"|"in_service"|"ready"|"completed","charge_status": "pending"|"succeeded"|"failed"|"refunded","damage_case_source": "ai_check"|"owner_report"|"renter_report"|"admin","damage_case_status": "open"|"in_review"|"resolved_no_charge"|"resolved_charged"|"escalated_insurance","damage_check_status": "queued"|"running"|"completed"|"failed","damage_severity": "minor"|"moderate"|"major","deposit_status": "pending"|"held"|"released"|"partially_captured"|"captured"|"failed","deposit_strategy": "hold_at_pickup"|"hold_before_return","document_kind": "id_front"|"id_back"|"license_front"|"license_back"|"vehicle_registration","finding_verdict": "pending"|"confirmed"|"rejected","flight_direction": "outbound"|"inbound","flight_status": "scheduled"|"delayed"|"landed"|"cancelled"|"unknown","fuel_rule": "full_to_full"|"same_level","fuel_type": "petrol"|"diesel"|"hybrid"|"plugin_hybrid"|"electric"|"lpg"|"cng","handover_point_type": "owner_home"|"airport"|"main_station"|"park_and_ride"|"partner_garage","identity_provider": "manual"|"stripe_identity","inspection_kind": "pickup"|"return"|"service_done","installment_status": "scheduled"|"authorized"|"processing"|"paid"|"failed"|"cancelled"|"refunded","insurance_status": "quoted"|"bound"|"active"|"claim_open"|"closed"|"cancelled","key_grant_purpose": "renter"|"service"|"owner_return","key_grant_status": "scheduled"|"active"|"used"|"revoked"|"expired"|"rotation_required","keybox_provider": "manual"|"smart"|"telematics","line_item_kind": "rent"|"km_package"|"service_fee"|"return_service"|"insurance"|"deposit"|"extra_km"|"fuel_difference"|"damage"|"cancellation_fee"|"late_fee"|"discount"|"refund","listing_status": "draft"|"pending_review"|"active"|"paused"|"rejected"|"archived","local_event_category": "trade_fair"|"folk_festival"|"school_holidays"|"public_holiday"|"concert"|"sports"|"other","notification_channel": "email"|"push"|"in_app","notification_status": "queued"|"sent"|"failed","party": "renter"|"owner"|"platform"|"insurer"|"partner","photo_perspective": "front"|"rear"|"left"|"right"|"front_left"|"front_right"|"rear_left"|"rear_right"|"interior_front"|"interior_rear"|"dashboard"|"other","profile_status": "active"|"suspended","receipt_kind": "renter_invoice"|"owner_statement"|"credit_note","review_direction": "renter_to_owner"|"owner_to_renter","service_order_status": "created"|"sent"|"accepted"|"in_progress"|"done"|"problem"|"cancelled","transfer_status": "scheduled"|"pending"|"paid"|"failed"|"reversed","transmission": "manual"|"automatic","vehicle_class": "mini"|"small"|"compact"|"midsize"|"upper_midsize"|"suv"|"van"|"premium","verification_kind": "renter"|"owner","verification_status": "draft"|"pending"|"approved"|"rejected"|"expired"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "actor_type": ["renter", "owner", "admin", "system", "partner"],"booking_status": ["requested", "declined", "expired", "withdrawn", "confirmed", "cancelled", "active", "returned", "in_service", "ready", "completed"],"charge_status": ["pending", "succeeded", "failed", "refunded"],"damage_case_source": ["ai_check", "owner_report", "renter_report", "admin"],"damage_case_status": ["open", "in_review", "resolved_no_charge", "resolved_charged", "escalated_insurance"],"damage_check_status": ["queued", "running", "completed", "failed"],"damage_severity": ["minor", "moderate", "major"],"deposit_status": ["pending", "held", "released", "partially_captured", "captured", "failed"],"deposit_strategy": ["hold_at_pickup", "hold_before_return"],"document_kind": ["id_front", "id_back", "license_front", "license_back", "vehicle_registration"],"finding_verdict": ["pending", "confirmed", "rejected"],"flight_direction": ["outbound", "inbound"],"flight_status": ["scheduled", "delayed", "landed", "cancelled", "unknown"],"fuel_rule": ["full_to_full", "same_level"],"fuel_type": ["petrol", "diesel", "hybrid", "plugin_hybrid", "electric", "lpg", "cng"],"handover_point_type": ["owner_home", "airport", "main_station", "park_and_ride", "partner_garage"],"identity_provider": ["manual", "stripe_identity"],"inspection_kind": ["pickup", "return", "service_done"],"installment_status": ["scheduled", "authorized", "processing", "paid", "failed", "cancelled", "refunded"],"insurance_status": ["quoted", "bound", "active", "claim_open", "closed", "cancelled"],"key_grant_purpose": ["renter", "service", "owner_return"],"key_grant_status": ["scheduled", "active", "used", "revoked", "expired", "rotation_required"],"keybox_provider": ["manual", "smart", "telematics"],"line_item_kind": ["rent", "km_package", "service_fee", "return_service", "insurance", "deposit", "extra_km", "fuel_difference", "damage", "cancellation_fee", "late_fee", "discount", "refund"],"listing_status": ["draft", "pending_review", "active", "paused", "rejected", "archived"],"local_event_category": ["trade_fair", "folk_festival", "school_holidays", "public_holiday", "concert", "sports", "other"],"notification_channel": ["email", "push", "in_app"],"notification_status": ["queued", "sent", "failed"],"party": ["renter", "owner", "platform", "insurer", "partner"],"photo_perspective": ["front", "rear", "left", "right", "front_left", "front_right", "rear_left", "rear_right", "interior_front", "interior_rear", "dashboard", "other"],"profile_status": ["active", "suspended"],"receipt_kind": ["renter_invoice", "owner_statement", "credit_note"],"review_direction": ["renter_to_owner", "owner_to_renter"],"service_order_status": ["created", "sent", "accepted", "in_progress", "done", "problem", "cancelled"],"transfer_status": ["scheduled", "pending", "paid", "failed", "reversed"],"transmission": ["manual", "automatic"],"vehicle_class": ["mini", "small", "compact", "midsize", "upper_midsize", "suv", "van", "premium"],"verification_kind": ["renter", "owner"],"verification_status": ["draft", "pending", "approved", "rejected", "expired"]
          }
        }
} as const
