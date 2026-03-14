"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  CompanySettingsUpdate,
  NotificationPreferencesInsert,
  NotificationPreferencesUpdate,
} from "@/lib/supabase/types";

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

async function requireAdmin() {
  const { supabase, userId } = await requireAuth();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { supabase, userId };
}

export async function getCompanySettings() {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateCompanySettings(data: CompanySettingsUpdate) {
  const { supabase } = await requireAdmin();
  const current = await getCompanySettings();

  if (!current) {
    const { error: insertError } = await supabase.from("company_settings").insert({
      company_name: data.company_name ?? "My Company",
      default_currency: data.default_currency ?? "USD",
      default_timezone: data.default_timezone ?? "UTC",
      date_format: data.date_format ?? "MM/dd/yyyy",
      wo_prefix: data.wo_prefix ?? "WO",
      asset_prefix: data.asset_prefix ?? "AST",
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  } else {
    const { error } = await supabase
      .from("company_settings")
      .update(data)
      .eq("id", current.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/settings/general");
}

export async function getNotificationPreferences(userId?: string) {
  const { supabase, userId: currentUserId } = await requireAuth();
  const targetUserId = userId ?? currentUserId;

  let query = supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data;
  }

  const defaults: NotificationPreferencesInsert = {
    user_id: targetUserId,
    email_enabled: true,
    wo_assigned: true,
    wo_completed: true,
    pm_due: true,
    low_stock: true,
    wo_overdue: true,
  };

  const { data: created, error: createError } = await supabase
    .from("notification_preferences")
    .insert(defaults)
    .select("*")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return created;
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: NotificationPreferencesUpdate
) {
  const { supabase, userId: currentUserId } = await requireAuth();

  if (userId !== currentUserId) {
    throw new Error("Forbidden");
  }

  const existing = await getNotificationPreferences(userId);

  const { error } = await supabase
    .from("notification_preferences")
    .update(prefs)
    .eq("id", existing.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/settings/notifications");
}
