"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Package,
  Server,
  Settings,
  Shield,
  Truck,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

type SidebarProps = {
  profile: Profile;
  isCollapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const mainItems: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Assets", icon: Server, href: "/assets" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Maintenance", icon: CalendarClock, href: "/maintenance" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Locations", icon: MapPin, href: "/locations" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Vendors", icon: Truck, href: "/vendors" },
];

const secondaryItems: NavigationItem[] = [
  { label: "Notifications", icon: Bell, href: "/notifications" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function isItemActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }

  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  return `${first}${second}`.toUpperCase();
}

function NavList({
  items,
  isCollapsed,
  pathname,
  onNavigate,
}: {
  items: NavigationItem[];
  isCollapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <TooltipProvider>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(pathname, item.href);

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex h-10 items-center rounded-md text-sm transition-colors",
                    isCollapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "border-l-2 border-l-blue-500 bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", !isCollapsed && "mr-3")} />
                  <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

function SidebarContent({
  profile,
  isCollapsed,
  pathname,
  onToggle,
  onNavigate,
}: {
  profile: Profile;
  isCollapsed: boolean;
  pathname: string;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          <Shield className="size-5 text-white" />
        </div>
        <div className={cn("min-w-0 overflow-hidden transition-all", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <p className="truncate text-sm font-semibold text-white">MaintainX Pro</p>
          <p className="truncate text-xs text-slate-400">CMMS Platform</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        <NavList
          items={mainItems}
          isCollapsed={isCollapsed}
          pathname={pathname}
          onNavigate={onNavigate}
        />

        <div className="h-px bg-slate-800" />

        <NavList
          items={secondaryItems}
          isCollapsed={isCollapsed}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </div>

      <div className="border-t border-slate-800 p-3">
        <div
          className={cn(
            "mb-3 flex items-center gap-3 rounded-md bg-slate-800/40 p-2",
            isCollapsed && "justify-center",
          )}
        >
          <Avatar className="size-9 shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
            <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className={cn("min-w-0 overflow-hidden transition-all", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
            <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
            <p className="truncate text-xs capitalize text-slate-400">{profile.role}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onToggle}
          className={cn(
            "w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white",
            isCollapsed && "justify-center px-0",
          )}
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          <span className={cn("ml-2", isCollapsed && "hidden")}>Collapse</span>
        </Button>
      </div>
    </>
  );
}

export function Sidebar({
  profile,
  isCollapsed,
  onToggle,
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside
        suppressHydrationWarning
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-white transition-[width] duration-300 md:flex",
          isCollapsed ? "w-[68px]" : "w-[280px]",
        )}
      >
        <SidebarContent
          profile={profile}
          isCollapsed={isCollapsed}
          pathname={pathname}
          onToggle={onToggle}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[280px] border-r border-slate-800 bg-slate-900 p-0 text-white"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Main application navigation</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <SidebarContent
              profile={profile}
              isCollapsed={false}
              pathname={pathname}
              onToggle={onToggle}
              onNavigate={() => onMobileOpenChange?.(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
