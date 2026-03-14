"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";

import { SettingsShell } from "@/app/(dashboard)/settings/_components/settings-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
};

const options: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Bright interface for daytime work.",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Reduced glare for low-light environments.",
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "Follow your operating system theme.",
  },
];

export default function AppearanceSettingsPage() {
  const { theme = "system", setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader title="Appearance" description="Customize how the CMMS looks for your account." />
      <SettingsShell>
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {options.map((option) => {
              const active = theme === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <p className="mt-3 font-medium">{option.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </SettingsShell>
    </div>
  );
}
