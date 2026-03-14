"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/app/(dashboard)/settings/actions";
import { SettingsShell } from "@/app/(dashboard)/settings/_components/settings-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/auth-store";

type PreferenceState = {
  email_enabled: boolean;
  wo_assigned: boolean;
  wo_completed: boolean;
  pm_due: boolean;
  low_stock: boolean;
  wo_overdue: boolean;
};

export default function NotificationPreferencesPage() {
  const userId = useAuthStore((state) => state.profile?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<PreferenceState>({
    email_enabled: true,
    wo_assigned: true,
    wo_completed: true,
    pm_due: true,
    low_stock: true,
    wo_overdue: true,
  });

  useEffect(() => {
    let mounted = true;
    async function loadPreferences() {
      setIsLoading(true);
      try {
        const data = await getNotificationPreferences(userId);
        if (!mounted || !data) return;
        setPrefs({
          email_enabled: data.email_enabled,
          wo_assigned: data.wo_assigned,
          wo_completed: data.wo_completed,
          pm_due: data.pm_due,
          low_stock: data.low_stock,
          wo_overdue: data.wo_overdue,
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    if (userId) {
      void loadPreferences();
    }

    return () => {
      mounted = false;
    };
  }, [userId]);

  const updateField = async (field: keyof PreferenceState, value: boolean) => {
    if (!userId) return;
    const previous = prefs;
    const next = { ...prefs, [field]: value };
    setPrefs(next);
    try {
      await updateNotificationPreferences(userId, { [field]: value });
    } catch (error) {
      setPrefs(previous);
      toast.error(error instanceof Error ? error.message : "Failed to update preferences.");
    }
  };

  const items: { key: keyof PreferenceState; label: string }[] = [
    { key: "email_enabled", label: "Email Notifications" },
    { key: "wo_assigned", label: "Work Order Assigned to Me" },
    { key: "wo_completed", label: "Work Order Completed" },
    { key: "pm_due", label: "Preventive Maintenance Coming Due" },
    { key: "low_stock", label: "Low Stock Alert" },
    { key: "wo_overdue", label: "Overdue Work Orders" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Preferences"
        description="Control what maintenance events trigger alerts."
      />
      <SettingsShell>
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading preferences...
              </div>
            ) : (
              items.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-md border p-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Switch
                    checked={prefs[item.key]}
                    onCheckedChange={(checked) => {
                      void updateField(item.key, checked);
                    }}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </SettingsShell>
    </div>
  );
}
