"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/supabase/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Forbidden: Admin access required");
  return { supabase, user };
}

export async function getUsers(filters?: {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.role) query = query.eq("role", filters.role);
  if (filters?.isActive !== undefined) query = query.eq("is_active", filters.isActive);
  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Profile[];
}

export async function getUserById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function updateUser(id: string, data: Partial<Profile>) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
  return { success: true };
}

export async function inviteUser(data: {
  email: string;
  fullName: string;
  role: UserRole;
  department?: string;
}) {
  const { supabase } = await requireAdmin();

  // Create user via admin API — they will receive a confirmation email
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    email_confirm: false,
    user_metadata: { full_name: data.fullName },
  });

  if (authError) {
    // Fallback: try regular signUp
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: Math.random().toString(36) + "Aa1!",
      options: { data: { full_name: data.fullName } },
    });
    if (signUpError) throw new Error(signUpError.message);
  }

  // Update the created user's profile with role/department
  if (authData?.user) {
    await supabase
      .from("profiles")
      .update({
        role: data.role,
        department: data.department ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function deactivateUser(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
  return { success: true };
}

export async function activateUser(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const { supabase } = await requireAdmin();
  // Safer: deactivate rather than hard-delete to preserve referential integrity
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
  return { success: true };
}
