"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { Bell, Palette, Settings2, Users } from "lucide-react";

import { useRBAC } from "@/hooks/use-rbac";
import { cn } from "@/lib/utils";

type SettingsShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/settings/general", label: "General", icon: Settings2, adminOnly: true },
  { href: "/settings/users", label: "User Management", icon: Users },
  { href: "/settings/notifications", label: "Notification Preferences", icon: Bell },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
];

export function SettingsShell({ children }: SettingsShellProps) {
  const pathname = usePathname();
  const { isAdmin } = useRBAC();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border bg-card p-3">
        <nav className="space-y-1">
          {navItems
            .filter((item) => (item.adminOnly ? isAdmin : true))
            .map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  );
}
