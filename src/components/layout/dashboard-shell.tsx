"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import type { Profile } from "@/lib/supabase/types";
import { useAuthStore } from "@/stores/auth-store";

type DashboardShellProps = {
  profile: Profile;
  children: ReactNode;
};

const SIDEBAR_COLLAPSE_KEY = "cmms-sidebar-collapsed";

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const setProfile = useAuthStore((state) => state.setProfile);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  const handleToggleCollapse = () => {
    setIsCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next));
      document.cookie = `sidebar_collapsed=${String(next)}; path=/; max-age=31536000`;
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* suppressHydrationWarning because width is driven by localStorage after mount */}
        <div suppressHydrationWarning>
          <Sidebar
            profile={profile}
            isCollapsed={isCollapsed}
            onToggle={handleToggleCollapse}
            mobileOpen={isMobileSidebarOpen}
            onMobileOpenChange={setIsMobileSidebarOpen}
          />
        </div>

        <div className="flex min-h-screen flex-1 flex-col">
          <Header
            profile={profile}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="border-b bg-card px-6 py-3">
              <Breadcrumbs />
            </div>
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
