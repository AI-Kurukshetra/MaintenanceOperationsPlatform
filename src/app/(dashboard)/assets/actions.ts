"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { AssetCreateInput, AssetUpdateInput } from "@/lib/validations/asset";

type GetAssetsParams = {
  search?: string;
  status?: string;
  category?: string;
  criticality?: string;
  locationId?: string;
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

  return { supabase, userId: user.id };
}

async function requireCanEdit() {
  const { supabase, userId } = await requireAuth();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    throw new Error("Forbidden");
  }

  return { supabase, userId, role: profile.role };
}

export async function getAssets(params: GetAssetsParams = {}) {
  const { supabase } = await requireAuth();
  const {
    search,
    status,
    category,
    criticality,
    locationId,
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from("assets")
    .select("*, locations(id, name, city)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,asset_code.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq("status", status as never);
  }
  if (category) {
    query = query.eq("category", category as never);
  }
  if (criticality) {
    query = query.eq("criticality", criticality as never);
  }
  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return { data: data ?? [], count: count ?? 0 };
}

export async function getAssetStats() {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("assets")
    .select("status")
    .in("status", ["operational", "needs_repair", "under_maintenance", "decommissioned"]);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const stats = {
    total: rows.length,
    operational: 0,
    needs_repair: 0,
    under_maintenance: 0,
  };

  for (const row of rows) {
    if (row.status === "operational") {
      stats.operational += 1;
    } else if (row.status === "needs_repair") {
      stats.needs_repair += 1;
    } else if (row.status === "under_maintenance") {
      stats.under_maintenance += 1;
    }
  }

  return stats;
}

export async function getAssetById(id: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("assets")
    .select("*, locations(id, name, city, state, country)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createAsset(input: AssetCreateInput) {
  const { supabase, userId } = await requireCanEdit();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      ...input,
      description: input.description || null,
      location_id: input.location_id || null,
      parent_asset_id: input.parent_asset_id || null,
      manufacturer: input.manufacturer || null,
      model: input.model || null,
      serial_number: input.serial_number || null,
      purchase_date: input.purchase_date || null,
      purchase_cost: input.purchase_cost ?? null,
      warranty_expiry: input.warranty_expiry || null,
      expected_lifespan_years: input.expected_lifespan_years ?? null,
      custom_fields: input.custom_fields ?? {},
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/assets");
  return data;
}

export async function updateAsset(id: string, input: AssetUpdateInput) {
  const { supabase } = await requireCanEdit();
  const { data, error } = await supabase
    .from("assets")
    .update({
      ...input,
      description: input.description || null,
      location_id: input.location_id || null,
      parent_asset_id: input.parent_asset_id || null,
      manufacturer: input.manufacturer || null,
      model: input.model || null,
      serial_number: input.serial_number || null,
      purchase_date: input.purchase_date || null,
      purchase_cost: input.purchase_cost ?? null,
      warranty_expiry: input.warranty_expiry || null,
      expected_lifespan_years: input.expected_lifespan_years ?? null,
      custom_fields: input.custom_fields ?? {},
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/assets");
  revalidatePath(`/assets/${id}/edit`);
  return data;
}

export async function deleteAsset(id: string) {
  const { supabase } = await requireCanEdit();
  const { error } = await supabase
    .from("assets")
    .update({ status: "decommissioned" })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/assets");
  revalidatePath(`/assets/${id}/edit`);
}

export async function searchAssets(query: string) {
  const { supabase } = await requireAuth();
  let assetQuery = supabase
    .from("assets")
    .select("id, name, asset_code")
    .order("name", { ascending: true })
    .limit(10);

  if (query.trim()) {
    assetQuery = assetQuery.or(`name.ilike.%${query}%,asset_code.ilike.%${query}%`);
  }

  const { data, error } = await assetQuery;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function searchLocations(query: string) {
  const { supabase } = await requireAuth();
  let locationQuery = supabase
    .from("locations")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(10);

  if (query.trim()) {
    locationQuery = locationQuery.or(`name.ilike.%${query}%,city.ilike.%${query}%`);
  }

  const { data, error } = await locationQuery;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
