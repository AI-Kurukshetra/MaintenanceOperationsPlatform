"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, Settings, User } from "lucide-react";

import { getUnreadCount } from "@/app/(dashboard)/notifications/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

type HeaderProps = {
  profile: Profile;
  onOpenMobileSidebar?: () => void;
};

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/assets": "Assets",
  "/work-orders": "Work Orders",
  "/maintenance": "Maintenance",
  "/inventory": "Inventory",
  "/locations": "Locations",
  "/reports": "Reports",
  "/vendors": "Vendors",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "Profile",
};

function getPageTitle(pathname: string) {
  if (titleMap[pathname]) {
    return titleMap[pathname];
  }

  const [firstSegment] = pathname.split("/").filter(Boolean);
  if (!firstSegment) {
    return "Dashboard";
  }

  return titleMap[`/${firstSegment}`] ?? "Dashboard";
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

export function Header({ profile, onOpenMobileSidebar }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadUnreadCount() {
      try {
        const count = await getUnreadCount();
        if (mounted) {
          setUnreadCount(count);
        }
      } catch {
        if (mounted) {
          setUnreadCount(0);
        }
      }
    }

    void loadUnreadCount();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">{getPageTitle(pathname)}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          type="button"
          variant="outline"
          className="hidden h-9 min-w-[220px] justify-start text-muted-foreground md:flex"
        >
          <Search className="mr-2 size-4" />
          <span>Search... Cmd+K</span>
        </Button>

        <Button asChild type="button" variant="ghost" size="icon-sm" className="relative">
          <Link href="/notifications" aria-label="Notifications">
            <Bell className="size-5" />
            {unreadCount > 0 ? (
              <>
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </>
            ) : null}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="h-10 px-2">
              <Avatar className="size-8">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void handleSignOut();
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
