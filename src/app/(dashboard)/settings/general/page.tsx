"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  getCompanySettings,
  updateCompanySettings,
} from "@/app/(dashboard)/settings/actions";
import { SettingsShell } from "@/app/(dashboard)/settings/_components/settings-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRBAC } from "@/hooks/use-rbac";

type FormValues = {
  company_name: string;
  default_currency: string;
  default_timezone: string;
  date_format: string;
  wo_prefix: string;
  asset_prefix: string;
};

const currencies = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"];
const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
];
const dateFormats = ["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"];

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { isAdmin } = useRBAC();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      company_name: "My Company",
      default_currency: "USD",
      default_timezone: "UTC",
      date_format: "MM/dd/yyyy",
      wo_prefix: "WO",
      asset_prefix: "AST",
    },
  });

  const { register, setValue, watch, handleSubmit } = form;

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      setIsLoading(true);
      try {
        const settings = await getCompanySettings();
        if (!mounted || !settings) return;
        setValue("company_name", settings.company_name);
        setValue("default_currency", settings.default_currency);
        setValue("default_timezone", settings.default_timezone);
        setValue("date_format", settings.date_format);
        setValue("wo_prefix", settings.wo_prefix);
        setValue("asset_prefix", settings.asset_prefix);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, [setValue]);

  const onSubmit = async (values: FormValues) => {
    if (!isAdmin) {
      toast.error("Only administrators can update general settings.");
      return;
    }

    setIsSaving(true);
    try {
      await updateCompanySettings(values);
      toast.success("Settings saved successfully.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="General Settings" description="Manage global CMMS defaults." />
      <SettingsShell>
        <Card>
          <CardHeader>
            <CardTitle>Company Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">
                You do not have permission to edit general settings.
              </p>
            ) : isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading settings...
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input id="company_name" {...register("company_name")} />
                </div>
                <div>
                  <Label>Default Currency</Label>
                  <Select
                    value={watch("default_currency")}
                    onValueChange={(value) => setValue("default_currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Timezone</Label>
                  <Select
                    value={watch("default_timezone")}
                    onValueChange={(value) => setValue("default_timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Select
                    value={watch("date_format")}
                    onValueChange={(value) => setValue("date_format", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormats.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wo_prefix">Work Order Prefix</Label>
                  <Input id="wo_prefix" {...register("wo_prefix")} />
                </div>
                <div>
                  <Label htmlFor="asset_prefix">Asset Code Prefix</Label>
                  <Input id="asset_prefix" {...register("asset_prefix")} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Settings
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </SettingsShell>
    </div>
  );
}
