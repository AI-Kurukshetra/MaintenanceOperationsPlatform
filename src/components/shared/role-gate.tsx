"use client";

import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/lib/supabase/types";

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const profile = useAuthStore((state) => state.profile);
  const role = profile?.role;

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
