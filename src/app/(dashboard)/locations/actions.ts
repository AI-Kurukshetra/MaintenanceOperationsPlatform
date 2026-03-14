"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { LocationCreateInput } from "@/lib/validations/location";

type GetLocationsParams = {
  search?: string;
  country?: string;
  page?: number;
  pageSize?: number;
};

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { supabase, role: profile.role };
}

function canWrite(role: string) {
  return role === "admin" || role === "manager";
}

export async function getLocations(params: GetLocationsParams = {}) {
  const { supabase } = await requireAuth();
  const { search, country, page = 1, pageSize = 100 } = params;

  let query = supabase
    .from("locations")
    .select("*, parent:locations!locations_parent_location_id_fkey(id, name)", {
      count: "exact",
    })
    .order("name", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
  }
  if (country) {
    query = query.eq("country", country);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const locationIds = (data ?? []).map((location) => location.id);
  let assetCounts = new Map<string, number>();

  if (locationIds.length > 0) {
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("location_id")
      .in("location_id", locationIds);

    if (assetsError) {
      throw new Error(assetsError.message);
    }

    assetCounts = new Map<string, number>();
    for (const asset of assets ?? []) {
      if (!asset.location_id) continue;
      assetCounts.set(asset.location_id, (assetCounts.get(asset.location_id) ?? 0) + 1);
    }
  }

  const result = (data ?? []).map((location) => ({
    ...location,
    asset_count: assetCounts.get(location.id) ?? 0,
  }));

  return { data: result, count: count ?? result.length };
}

export async function getLocationStats() {
  const { supabase } = await requireAuth();
  const [{ count: total }, { count: active }, { count: totalAssets }] = await Promise.all([
    supabase.from("locations").select("id", { count: "exact", head: true }),
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("assets").select("id", { count: "exact", head: true }),
  ]);

  return {
    total: total ?? 0,
    active: active ?? 0,
    total_assets: totalAssets ?? 0,
  };
}

export async function createLocation(data: LocationCreateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { data: inserted, error } = await supabase
    .from("locations")
    .insert({
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      parent_location_id: data.parent_location_id || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/locations");
  return inserted;
}

export async function updateLocation(id: string, data: LocationCreateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase
    .from("locations")
    .update({
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      parent_location_id: data.parent_location_id || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/locations");
}

export async function deleteLocation(id: string) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const [{ count: childCount }, { count: assetCount }] = await Promise.all([
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("parent_location_id", id),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("location_id", id),
  ]);

  if ((childCount ?? 0) > 0) {
    throw new Error("Cannot delete location because it has child locations.");
  }
  if ((assetCount ?? 0) > 0) {
    throw new Error("Cannot delete location because assets are assigned to it.");
  }

  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/locations");
}

export async function getLocationById(id: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("locations")
    .select("*, parent:locations!locations_parent_location_id_fkey(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getLocationCountries() {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.from("locations").select("country");

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(
    new Set((data ?? []).map((row) => row.country).filter((country): country is string => !!country))
  ).sort((a, b) => a.localeCompare(b));
}
