"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { WorkOrderCreateInput, WorkOrderUpdateInput } from "@/lib/validations/work-order";

type GetWorkOrdersParams = {
  search?: string;
  status?: string;
  priority?: string;
  type?: string;
  assignedTo?: string;
  assetId?: string;
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
    .select("id, role")
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

export async function getWorkOrders(params: GetWorkOrdersParams = {}) {
  const { supabase } = await requireAuth();
  const {
    search,
    status,
    priority,
    type,
    assignedTo,
    assetId,
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from("work_orders")
    .select(
      "*, assets(id, name, asset_code), assigned_profile:profiles!work_orders_assigned_to_fkey(id, full_name, avatar_url, role)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`wo_number.ilike.%${search}%,title.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq("status", status as never);
  }
  if (priority) {
    query = query.eq("priority", priority as never);
  }
  if (type) {
    query = query.eq("type", type as never);
  }
  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }
  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return { data: data ?? [], count: count ?? 0 };
}

export async function getWorkOrderStats() {
  const { supabase } = await requireAuth();
  const now = new Date().toISOString();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ count: open }, { count: inProgress }, { count: onHold }, { count: overdue }, { count: completed }] =
    await Promise.all([
      supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress"),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("status", "on_hold"),
      supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .lt("due_date", now)
        .not("status", "in", "(completed,cancelled)"),
      supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", startOfMonth.toISOString()),
    ]);

  return {
    open: open ?? 0,
    in_progress: inProgress ?? 0,
    on_hold: onHold ?? 0,
    overdue: overdue ?? 0,
    completed_this_month: completed ?? 0,
  };
}

export async function getWorkOrderById(id: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("work_orders")
    .select(
      "*, assets(id, name, asset_code, location_id), assigned_profile:profiles!work_orders_assigned_to_fkey(id, full_name, avatar_url, role), requested_profile:profiles!work_orders_requested_by_fkey(id, full_name), work_order_parts(id, part_id, quantity_used, unit_cost, parts(id, name, part_number, quantity_on_hand))"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createWorkOrder(input: WorkOrderCreateInput) {
  const { supabase, userId, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { parts = [], ...workOrder } = input;
  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      title: workOrder.title,
      description: workOrder.description || null,
      type: workOrder.type,
      priority: workOrder.priority,
      asset_id: workOrder.asset_id || null,
      location_id: workOrder.location_id || null,
      assigned_to: workOrder.assigned_to || null,
      due_date: workOrder.due_date || null,
      estimated_hours: workOrder.estimated_hours ?? null,
      requested_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (parts.length > 0) {
    const { error: partsError } = await supabase.from("work_order_parts").insert(
      parts.map((part) => ({
        work_order_id: data.id,
        part_id: part.part_id,
        quantity_used: part.quantity_used,
      }))
    );

    if (partsError) {
      throw new Error(partsError.message);
    }
  }

  revalidatePath("/work-orders");
  return data;
}

export async function updateWorkOrder(id: string, input: WorkOrderUpdateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { parts, ...workOrder } = input;
  const payload: Record<string, unknown> = {};

  if (workOrder.title !== undefined) payload.title = workOrder.title;
  if (workOrder.description !== undefined) payload.description = workOrder.description || null;
  if (workOrder.type !== undefined) payload.type = workOrder.type;
  if (workOrder.priority !== undefined) payload.priority = workOrder.priority;
  if (workOrder.status !== undefined) payload.status = workOrder.status;
  if (workOrder.asset_id !== undefined) payload.asset_id = workOrder.asset_id || null;
  if (workOrder.location_id !== undefined) payload.location_id = workOrder.location_id || null;
  if (workOrder.assigned_to !== undefined) payload.assigned_to = workOrder.assigned_to || null;
  if (workOrder.due_date !== undefined) payload.due_date = workOrder.due_date || null;
  if (workOrder.estimated_hours !== undefined) payload.estimated_hours = workOrder.estimated_hours ?? null;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from("work_orders").update(payload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (parts) {
    const { error: deleteError } = await supabase
      .from("work_order_parts")
      .delete()
      .eq("work_order_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (parts.length > 0) {
      const { error: insertError } = await supabase.from("work_order_parts").insert(
        parts.map((part) => ({
          work_order_id: id,
          part_id: part.part_id,
          quantity_used: part.quantity_used,
        }))
      );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}/edit`);
}

export async function deleteWorkOrder(id: string) {
  const { supabase, role } = await requireAuth();

  if (role === "admin") {
    const { error } = await supabase.from("work_orders").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("work_orders")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/work-orders");
}

export async function searchTechnicians(query: string) {
  const { supabase } = await requireAuth();
  let technicianQuery = supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("is_active", true)
    .in("role", ["technician", "manager"])
    .order("full_name", { ascending: true })
    .limit(10);

  if (query.trim()) {
    technicianQuery = technicianQuery.or(
      `full_name.ilike.%${query}%,email.ilike.%${query}%`
    );
  }

  const { data, error } = await technicianQuery;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
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
