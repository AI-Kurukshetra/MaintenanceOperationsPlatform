"use client";

import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/lib/supabase/types";

type RBACResult = {
  role: UserRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isTechnician: boolean;
  isViewer: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
};

export function useRBAC(): RBACResult {
  const profile = useAuthStore((state) => state.profile);
  const role = profile?.role ?? null;

  const isAdmin = role === "admin";
  const isManager = role === "admin" || role === "manager";
  const isTechnician = role === "technician";
  const isViewer = role === "viewer";

  return {
    role,
    isAdmin,
    isManager,
    isTechnician,
    isViewer,
    canCreate: isManager,
    canEdit: isManager,
    canDelete: isAdmin,
    canManageUsers: isAdmin,
  };
}
