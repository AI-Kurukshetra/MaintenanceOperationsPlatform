import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsers } from "./actions";
import { UsersPageClient } from "./_components/users-page-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await getUsers();

  return <UsersPageClient users={users} currentUserId={user.id} />;
}
