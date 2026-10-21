import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Kennzahlen für die Admin-Übersicht (nur Zählabfragen, keine Daten). */

export type AdminStats = {
  pendingVerifications: number;
  users: number;
  activeListings: number;
  openDamageCases: number;
  bookings: number;
  runningBookings: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();
  const count = { count: "exact", head: true } as const;

  const results = await Promise.all([
    admin.from("verifications").select("id", count).eq("status", "pending"),
    admin.from("profiles").select("id", count),
    admin.from("listings").select("id", count).eq("status", "active"),
    admin.from("damage_cases").select("id", count).in("status", ["open", "in_review"]),
    admin.from("bookings").select("id", count),
    admin
      .from("bookings")
      .select("id", count)
      .in("status", ["confirmed", "active", "returned", "in_service", "ready"]),
  ]);
  const failed = results.find((result) => result.error);
  if (failed) throw new Error("Kennzahlen konnten nicht geladen werden");
  const [pending, users, listings, damage, bookings, running] = results.map((r) => r.count ?? 0);

  return {
    pendingVerifications: pending,
    users,
    activeListings: listings,
    openDamageCases: damage,
    bookings,
    runningBookings: running,
  };
}
