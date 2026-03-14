"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  MaintenancePlanCreateInput,
  MaintenancePlanUpdateInput,
} from "@/lib/validations/maintenance";

type GetMaintenancePlansParams = {
  search?: string;
  type?: string;
  status?: "active" | "inactive" | "overdue";
  assetId?: string;
  page?: number;
  pageSize?: number;
};

function addFrequency(baseDate: Date, value: number, unit: string) {
  const date = new Date(baseDate);
  switch (unit) {
    case "days":
      date.setDate(date.getDate() + value);
      break;
    case "weeks":
      date.setDate(date.getDate() + value * 7);
      break;
    case "months":
      date.setMonth(date.getMonth() + value);
      break;
    case "years":
      date.setFullYear(date.getFullYear() + value);
      break;
    case "hours":
      date.setHours(date.getHours() + value);
      break;
    case "cycles":
      date.setDate(date.getDate() + value);
      break;
    default:
      return null;
  }

  return date.toISOString();
}

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

export async function getMaintenancePlans(params: GetMaintenancePlansParams = {}) {
  const { supabase } = await requireAuth();
  const {
    search,
    type,
    status,
    assetId,
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from("maintenance_plans")
    .select(
      "*, assets(id, name, asset_code, status, location_id), assigned_profile:profiles!maintenance_plans_assigned_to_fkey(id, full_name, avatar_url, role)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (type) {
    query = query.eq("type", type as never);
  }
  if (assetId) {
    query = query.eq("asset_id", assetId);
  }
  if (status === "active") {
    query = query.eq("is_active", true);
  }
  if (status === "inactive") {
    query = query.eq("is_active", false);
  }
  if (status === "overdue") {
    query = query.eq("is_active", true).lt("next_due_date", new Date().toISOString());
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return { data: data ?? [], count: count ?? 0 };
}

export async function getMaintenancePlanStats() {
  const { supabase } = await requireAuth();
  const now = new Date();
  const nowIso = now.toISOString();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ count: active }, { count: dueThisWeek }, { count: overdue }, { count: completedThisMonth }] =
    await Promise.all([
      supabase
        .from("maintenance_plans")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("maintenance_plans")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("next_due_date", nowIso)
        .lte("next_due_date", weekEnd.toISOString()),
      supabase
        .from("maintenance_plans")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .lt("next_due_date", nowIso),
      supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("type", "preventive")
        .eq("status", "completed")
        .gte("completed_at", startOfMonth),
    ]);

  return {
    active: active ?? 0,
    due_this_week: dueThisWeek ?? 0,
    overdue: overdue ?? 0,
    completed_this_month: completedThisMonth ?? 0,
  };
}

export async function getMaintenancePlanById(id: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("maintenance_plans")
    .select(
      "*, assets(id, name, asset_code, status, location_id, locations(name, city)), assigned_profile:profiles!maintenance_plans_assigned_to_fkey(id, full_name, avatar_url, role)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createMaintenancePlan(data: MaintenancePlanCreateInput) {
  const { supabase, userId, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const nextDueDate =
    data.type === "time_based" &&
    data.frequency_value &&
    data.frequency_unit &&
    data.start_date
      ? addFrequency(new Date(data.start_date), data.frequency_value, data.frequency_unit)
      : data.next_due_date || null;

  const { checklist = [], ...payload } = data;
  const { data: inserted, error } = await supabase
    .from("maintenance_plans")
    .insert({
      name: payload.name,
      description: payload.description || null,
      asset_id: payload.asset_id || null,
      type: payload.type,
      frequency_value: payload.frequency_value ?? null,
      frequency_unit: payload.frequency_unit ?? null,
      next_due_date: nextDueDate,
      assigned_to: payload.assigned_to || null,
      checklist,
      wo_title_template: payload.wo_title_template || null,
      wo_description_template: payload.wo_description_template || null,
      wo_priority: payload.wo_priority,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/maintenance");
  return inserted;
}

export async function updateMaintenancePlan(id: string, data: MaintenancePlanUpdateInput) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description || null;
  if (data.asset_id !== undefined) payload.asset_id = data.asset_id || null;
  if (data.type !== undefined) payload.type = data.type;
  if (data.frequency_value !== undefined) payload.frequency_value = data.frequency_value ?? null;
  if (data.frequency_unit !== undefined) payload.frequency_unit = data.frequency_unit ?? null;
  if (data.assigned_to !== undefined) payload.assigned_to = data.assigned_to || null;
  if (data.checklist !== undefined) payload.checklist = data.checklist;
  if (data.wo_title_template !== undefined) payload.wo_title_template = data.wo_title_template || null;
  if (data.wo_description_template !== undefined) {
    payload.wo_description_template = data.wo_description_template || null;
  }
  if (data.wo_priority !== undefined) payload.wo_priority = data.wo_priority;
  if (data.next_due_date !== undefined) payload.next_due_date = data.next_due_date || null;

  if (data.type === "time_based" && data.start_date && data.frequency_value && data.frequency_unit) {
    payload.next_due_date = addFrequency(
      new Date(data.start_date),
      data.frequency_value,
      data.frequency_unit
    );
  }

  const { error } = await supabase.from("maintenance_plans").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${id}/edit`);
}

export async function togglePlanStatus(id: string, isActive: boolean) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase
    .from("maintenance_plans")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/maintenance");
}

export async function generateWorkOrderNow(planId: string) {
  const { supabase, role } = await requireAuth();
  if (!canWrite(role)) {
    throw new Error("Forbidden");
  }

  const plan = await getMaintenancePlanById(planId);
  if (!plan) {
    throw new Error("Plan not found");
  }

  const now = new Date();
  const assetName = plan.assets?.name ?? "Asset";
  const titleTemplate = plan.wo_title_template || "Preventive Maintenance - {asset_name}";
  const woTitle = titleTemplate.replace("{asset_name}", assetName);
  const nextDue =
    plan.frequency_value && plan.frequency_unit
      ? addFrequency(now, plan.frequency_value, plan.frequency_unit)
      : plan.next_due_date;

  const { error: woError } = await supabase.from("work_orders").insert({
    title: woTitle,
    description: plan.wo_description_template || null,
    type: "preventive",
    priority: plan.wo_priority,
    status: "open",
    asset_id: plan.asset_id,
    location_id: plan.assets?.location_id ?? null,
    assigned_to: plan.assigned_to,
    due_date: nextDue,
  });

  if (woError) {
    throw new Error(woError.message);
  }

  const { error: planError } = await supabase
    .from("maintenance_plans")
    .update({
      last_performed_at: now.toISOString(),
      next_due_date: nextDue,
    })
    .eq("id", planId);

  if (planError) {
    throw new Error(planError.message);
  }

  revalidatePath("/maintenance");
  revalidatePath("/work-orders");
}

export async function deletePlan(id: string) {
  const { supabase, role } = await requireAuth();

  if (role === "admin") {
    const { error } = await supabase.from("maintenance_plans").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("maintenance_plans")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/maintenance");
}
