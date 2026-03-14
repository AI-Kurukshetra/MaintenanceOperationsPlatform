"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { VendorCreateInput } from "@/lib/validations/vendor";

type GetVendorsParams = {
  search?: string;
  category?: string;
  isActive?: boolean;
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

export async function getVendors(params: GetVendorsParams = {}) {
  const { supabase } = await requireAuth();
  const { search, category, isActive, page = 1, pageSize = 50 } = params;

  let query = supabase
    .from("vendors")
    .select("*", { count: "exact" })
    .order("name", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq("category", category as never);
  }
  if (typeof isActive === "boolean") {
    query = query.eq("is_active", isActive);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return { data: data ?? [], count: count ?? 0 };
}

export async function getVendorStats() {
  const { supabase } = await requireAuth();
  const [{ count: total }, { count: active }, { count: partsSupplier }] = await Promise.all([
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("category", "parts_supplier"),
  ]);

  return {
    total: total ?? 0,
    active: active ?? 0,
    parts_suppliers: partsSupplier ?? 0,
  };
}

export async function createVendor(data: VendorCreateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { data: inserted, error } = await supabase
    .from("vendors")
    .insert({
      name: data.name,
      contact_name: data.contact_name || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      category: data.category || null,
      rating: data.rating ?? null,
      notes: data.notes || null,
      is_active: data.is_active ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
  return inserted;
}

export async function updateVendor(id: string, data: VendorCreateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase
    .from("vendors")
    .update({
      name: data.name,
      contact_name: data.contact_name || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      category: data.category || null,
      rating: data.rating ?? null,
      notes: data.notes || null,
      is_active: data.is_active ?? true,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${id}/edit`);
}

export async function deleteVendor(id: string) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
}

export async function getVendorById(id: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
