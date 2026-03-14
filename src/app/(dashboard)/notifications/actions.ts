"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/supabase/types";

type GetNotificationsParams = {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
};

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { supabase, userId: user.id };
}

export async function getNotifications(params: GetNotificationsParams = {}) {
  const { supabase, userId } = await requireUserId();
  const { type, isRead, page = 1, pageSize = 50 } = params;

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  if (typeof isRead === "boolean") {
    query = query.eq("is_read", isRead);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return { data: data ?? [], count: count ?? 0 };
}

export async function getUnreadCount() {
  const { supabase, userId } = await requireUserId();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markAsRead(id: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
}

export async function markAllAsRead() {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
}

export async function deleteNotification(id: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
}

export async function deleteNotifications(ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
}
