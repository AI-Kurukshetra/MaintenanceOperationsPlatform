import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

function getDefaultProfile(user: User): Profile {
  const fullNameValue =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;
  const fallbackName = fullNameValue ?? user.email?.split("@")[0] ?? "User";
  const nowIso = new Date().toISOString();

  return {
    id: user.id,
    full_name: fallbackName,
    email: user.email ?? "",
    role: "technician",
    department: null,
    phone: null,
    avatar_url: null,
    hourly_rate: 0,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const resolvedProfile = profile ?? getDefaultProfile(user);

  return <DashboardShell profile={resolvedProfile}>{children}</DashboardShell>;
}
