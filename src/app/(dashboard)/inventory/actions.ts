"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  PartCreateInput,
  PartUpdateInput,
  StockAdjustmentInput,
} from "@/lib/validations/part";

type GetPartsParams = {
  search?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  category?: string;
  page?: number;
  pageSize?: number;
};

type PartWithStockStatus = {
  id: string;
  name: string;
  part_number: string | null;
  description: string | null;
  category: string | null;
  unit_cost: number;
  quantity_on_hand: number;
  minimum_quantity: number;
  location_id: string | null;
  vendor_id: string | null;
  supplier: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  locations: {
    id: string;
    name: string;
    city: string | null;
  } | null;
  vendors: {
    id: string;
    name: string;
  } | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
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

  return { supabase, userId: user.id, role: profile.role };
}

function canWrite(role: string) {
  return role === "admin" || role === "manager";
}

function getStockStatus(quantity: number, minimum: number): PartWithStockStatus["stock_status"] {
  if (quantity <= 0) {
    return "out_of_stock";
  }
  if (quantity <= minimum) {
    return "low_stock";
  }
  return "in_stock";
}

export async function getParts(params: GetPartsParams = {}) {
  const { supabase } = await requireAuth();
  const { search, stockStatus, category, page = 1, pageSize = 50 } = params;

  let query = supabase
    .from("parts")
    .select("*, locations(id, name, city), vendors(id, name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const withStockStatus = (data ?? []).map((part) => ({
    ...part,
    stock_status: getStockStatus(part.quantity_on_hand, part.minimum_quantity),
  }));

  const filtered =
    stockStatus === undefined
      ? withStockStatus
      : withStockStatus.filter((part) => part.stock_status === stockStatus);

  return { data: filtered as unknown as PartWithStockStatus[], count: count ?? filtered.length };
}

export async function getInventoryStats() {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("parts")
    .select("quantity_on_hand, minimum_quantity, unit_cost");

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const totalParts = rows.length;
  let totalValue = 0;
  let lowStock = 0;
  let outOfStock = 0;

  for (const row of rows) {
    totalValue += Number(row.unit_cost) * row.quantity_on_hand;
    if (row.quantity_on_hand === 0) {
      outOfStock += 1;
    } else if (row.quantity_on_hand <= row.minimum_quantity) {
      lowStock += 1;
    }
  }

  return {
    total_parts: totalParts,
    total_value: totalValue,
    low_stock: lowStock,
    out_of_stock: outOfStock,
  };
}

export async function getPartById(id: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("parts")
    .select("*, locations(id, name, city), vendors(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createPart(data: PartCreateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { data: inserted, error } = await supabase
    .from("parts")
    .insert({
      ...data,
      description: data.description || null,
      part_number: data.part_number || null,
      category: data.category || null,
      location_id: data.location_id || null,
      vendor_id: data.vendor_id || null,
      supplier: data.supplier || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory");
  return inserted;
}

export async function updatePart(id: string, data: PartUpdateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase
    .from("parts")
    .update({
      ...data,
      description: data.description || null,
      part_number: data.part_number || null,
      category: data.category || null,
      location_id: data.location_id || null,
      vendor_id: data.vendor_id || null,
      supplier: data.supplier || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}/edit`);
}

export async function deletePart(id: string) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { count, error: refError } = await supabase
    .from("work_order_parts")
    .select("id", { count: "exact", head: true })
    .eq("part_id", id);

  if (refError) {
    throw new Error(refError.message);
  }

  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete part because it is referenced by work orders.");
  }

  const { error } = await supabase.from("parts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory");
}

export async function adjustStock(partId: string, adjustment: StockAdjustmentInput) {
  const { supabase, userId, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const part = await getPartById(partId);
  if (!part) {
    throw new Error("Part not found");
  }

  const current = part.quantity_on_hand;
  let next = current;
  if (adjustment.type === "add") {
    next = current + adjustment.quantity;
  } else if (adjustment.type === "remove") {
    next = current - adjustment.quantity;
  } else {
    next = adjustment.quantity;
  }

  if (next < 0) {
    throw new Error("Stock cannot be negative.");
  }

  const { error: updateError } = await supabase
    .from("parts")
    .update({ quantity_on_hand: next })
    .eq("id", partId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const quantityChange =
    adjustment.type === "set" ? next - current : adjustment.type === "remove" ? -adjustment.quantity : adjustment.quantity;

  const { error: transactionError } = await supabase
    .from("inventory_transactions")
    .insert({
      part_id: partId,
      type: adjustment.type,
      quantity_change: quantityChange,
      quantity_before: current,
      quantity_after: next,
      reason: adjustment.reason,
      notes: adjustment.notes || null,
      performed_by: userId,
    });

  if (transactionError) {
    throw new Error(transactionError.message);
  }

  revalidatePath("/inventory");
}

export async function searchParts(query: string) {
  const { supabase } = await requireAuth();
  let partQuery = supabase
    .from("parts")
    .select("id, name, part_number, quantity_on_hand, unit_cost")
    .order("name", { ascending: true })
    .limit(10);

  if (query.trim()) {
    partQuery = partQuery.or(`name.ilike.%${query}%,part_number.ilike.%${query}%`);
  }

  const { data, error } = await partQuery;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getVendorsForParts() {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
