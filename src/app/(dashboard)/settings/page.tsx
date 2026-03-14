"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsShell } from "@/app/(dashboard)/settings/_components/settings-shell";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure workspace defaults and preferences." />

      <SettingsShell>
        <Card>
          <CardHeader>
            <CardTitle>Settings Overview</CardTitle>
            <CardDescription>Select a category from the left to manage settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              General settings are available to administrators. Notification preferences and appearance are user-specific.
            </p>
          </CardContent>
        </Card>
      </SettingsShell>
    </div>
  );
}
