"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getAssetById } from "@/app/(dashboard)/assets/actions";
import {
  getMaintenancePlanById,
  updateMaintenancePlan,
} from "@/app/(dashboard)/maintenance/actions";
import { searchTechnicians } from "@/app/(dashboard)/work-orders/actions";
import { PageHeader } from "@/components/layout/page-header";
import { AssetCombobox } from "@/components/shared/asset-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRBAC } from "@/hooks/use-rbac";
import { PM_FREQUENCY_UNITS, PM_TYPES, WO_PRIORITIES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import {
  maintenancePlanUpdateSchema,
  type MaintenancePlanUpdateInput,
} from "@/lib/validations/maintenance";

type TechnicianOption = {
  id: string;
  full_name: string;
  role: "technician" | "manager";
};

type AssetSummary = {
  id: string;
  name: string;
  asset_code: string;
  status: string;
  locations: {
    name: string;
    city: string | null;
  } | null;
};

function addFrequency(baseDate: Date, value: number, unit: string) {
  const date = new Date(baseDate);
  switch (unit) {
    case "days":
      date.setDate(date.getDate() + value);
      break;
    case "weeks":
      date.setDate(date.getDate() + value * 7);
      break;
    case "months":
      date.setMonth(date.getMonth() + value);
      break;
    case "years":
      date.setFullYear(date.getFullYear() + value);
      break;
    default:
      return null;
  }
  return date;
}

function TechnicianCombobox({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TechnicianOption[]>([]);
  const [selected, setSelected] = useState<TechnicianOption | null>(null);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const results = (await searchTechnicians(query)) as unknown as TechnicianOption[];
        if (!mounted) return;
        setOptions(results);
        if (value) {
          const current = results.find((item) => item.id === value);
          if (current) setSelected(current);
        }
      } catch {
        if (mounted) setOptions([]);
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, value, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {selected ? selected.full_name : <span className="text-muted-foreground">Select assignee...</span>}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search technicians..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    setSelected(option);
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex items-center gap-2">
                    <span>{option.full_name}</span>
                    <span className="text-xs capitalize text-muted-foreground">{option.role}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function EditMaintenancePlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canEdit } = useRBAC();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetSummary, setAssetSummary] = useState<AssetSummary | null>(null);

  type MaintenanceFormInput = z.input<typeof maintenancePlanUpdateSchema>;

  const form = useForm<MaintenanceFormInput>({
    resolver: zodResolver(maintenancePlanUpdateSchema),
    defaultValues: {
      name: "",
      description: "",
      asset_id: "",
      type: "time_based",
      frequency_value: 30,
      frequency_unit: "days",
      start_date: new Date().toISOString().slice(0, 10),
      assigned_to: null,
      wo_title_template: "Monthly Inspection - {asset_name}",
      wo_description_template: "",
      wo_priority: "medium",
      estimated_hours: null,
      checklist: [],
      usage_current_reading: null,
      condition_parameter_name: "",
      condition_threshold: null,
      condition_operator: ">=",
    },
  });

  const { handleSubmit, register, control, reset, setValue, watch, formState: { errors } } = form;
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "checklist",
  });

  useEffect(() => {
    let mounted = true;
    async function loadPlan() {
      setIsLoading(true);
      try {
        const plan = await getMaintenancePlanById(params.id);
        if (!mounted || !plan) return;

        reset({
          name: plan.name,
          description: plan.description ?? "",
          asset_id: plan.asset_id ?? "",
          type: plan.type,
          frequency_value: plan.frequency_value ?? null,
          frequency_unit: plan.frequency_unit ?? null,
          start_date: plan.next_due_date ? plan.next_due_date.slice(0, 10) : "",
          assigned_to: plan.assigned_to ?? null,
          wo_title_template: plan.wo_title_template ?? "",
          wo_description_template: plan.wo_description_template ?? "",
          wo_priority: plan.wo_priority,
          checklist: [],
          estimated_hours: null,
          usage_current_reading: null,
          condition_parameter_name: "",
          condition_threshold: null,
          condition_operator: ">=",
        });

        const checklistArray = Array.isArray(plan.checklist)
          ? plan.checklist
              .filter((item): item is { description: string; required?: boolean } => {
                if (!item || typeof item !== "object") return false;
                return "description" in item;
              })
              .map((item) => ({
                description: String(item.description ?? ""),
                required: Boolean(item.required),
              }))
          : [];
        replace(checklistArray);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadPlan();

    return () => {
      mounted = false;
    };
  }, [params.id, replace, reset]);

  const selectedAssetId = watch("asset_id");
  const scheduleType = watch("type");
  const frequencyValue = watch("frequency_value");
  const frequencyUnit = watch("frequency_unit");
  const startDate = watch("start_date");

  useEffect(() => {
    let mounted = true;
    async function loadAssetSummary() {
      if (!selectedAssetId) {
        setAssetSummary(null);
        return;
      }
      try {
        const asset = await getAssetById(selectedAssetId);
        if (!mounted || !asset) return;
        setAssetSummary(asset as unknown as AssetSummary);
      } catch {
        if (mounted) setAssetSummary(null);
      }
    }
    void loadAssetSummary();
    return () => {
      mounted = false;
    };
  }, [selectedAssetId]);

  const schedulePreview = useMemo(() => {
    if (
      scheduleType !== "time_based" ||
      !startDate ||
      !frequencyValue ||
      !frequencyUnit ||
      !["days", "weeks", "months", "years"].includes(frequencyUnit)
    ) {
      return [];
    }

    const dates: string[] = [];
    let current = new Date(startDate);
    for (let i = 0; i < 5; i += 1) {
      const next = addFrequency(current, frequencyValue, frequencyUnit);
      if (!next) break;
      dates.push(formatDate(next));
      current = next;
    }
    return dates;
  }, [frequencyUnit, frequencyValue, scheduleType, startDate]);

  const onSubmit = async (input: MaintenanceFormInput) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit maintenance plans.");
      return;
    }
    setIsSubmitting(true);
    try {
      const parsed = maintenancePlanUpdateSchema.parse(input) as MaintenancePlanUpdateInput;
      await updateMaintenancePlan(params.id, parsed);
      toast.success("Maintenance plan updated successfully.");
      router.push("/maintenance");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update maintenance plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading maintenance plan...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Edit PM Schedule" description={`Plan ID: ${params.id}`} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Asset *</Label>
              <AssetCombobox
                value={watch("asset_id")}
                onChange={(value) => setValue("asset_id", value ?? "", { shouldValidate: true })}
              />
            </div>
            {assetSummary ? (
              <div className="rounded-md border bg-muted/20 p-3 text-sm">
                <p className="font-medium">{assetSummary.name}</p>
                <p className="text-muted-foreground">Code: {assetSummary.asset_code}</p>
                <p className="text-muted-foreground">Status: {assetSummary.status}</p>
                <p className="text-muted-foreground">
                  Location:{" "}
                  {assetSummary.locations
                    ? `${assetSummary.locations.name}${assetSummary.locations.city ? `, ${assetSummary.locations.city}` : ""}`
                    : "Unassigned"}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as MaintenancePlanUpdateInput["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PM_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scheduleType === "time_based" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>Frequency Value</Label>
                  <Input
                    type="number"
                    min={1}
                    value={watch("frequency_value") ?? ""}
                    onChange={(event) =>
                      setValue("frequency_value", Number(event.target.value || 1), {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Frequency Unit</Label>
                  <Select
                    value={watch("frequency_unit") ?? ""}
                    onValueChange={(value) =>
                      setValue("frequency_unit", value as MaintenancePlanUpdateInput["frequency_unit"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["days", "weeks", "months", "years"] as const).map((value) => (
                        <SelectItem key={value} value={value}>
                          {PM_FREQUENCY_UNITS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" {...register("start_date")} />
                </div>
                {schedulePreview.length > 0 ? (
                  <div className="md:col-span-3 rounded-md border bg-muted/20 p-3 text-sm">
                    <p className="font-medium">Next 5 scheduled dates</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {schedulePreview.map((date) => (
                        <Badge key={date} variant="outline">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {scheduleType === "usage_based" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>Frequency Value</Label>
                  <Input
                    type="number"
                    min={1}
                    value={watch("frequency_value") ?? ""}
                    onChange={(event) =>
                      setValue("frequency_value", Number(event.target.value || 1), {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={watch("frequency_unit") ?? ""}
                    onValueChange={(value) =>
                      setValue("frequency_unit", value as MaintenancePlanUpdateInput["frequency_unit"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="cycles">Cycles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Meter Reading</Label>
                  <Input
                    type="number"
                    value={watch("usage_current_reading") ?? ""}
                    onChange={(event) =>
                      setValue(
                        "usage_current_reading",
                        event.target.value ? Number(event.target.value) : null
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {scheduleType === "condition_based" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label>Parameter</Label>
                    <Input {...register("condition_parameter_name")} placeholder="Temperature" />
                  </div>
                  <div>
                    <Label>Operator</Label>
                    <Select
                      value={watch("condition_operator") ?? ">="}
                      onValueChange={(value) =>
                        setValue(
                          "condition_operator",
                          value as MaintenancePlanUpdateInput["condition_operator"]
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["<", "<=", ">", ">="].map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      value={watch("condition_threshold") ?? ""}
                      onChange={(event) =>
                        setValue(
                          "condition_threshold",
                          event.target.value ? Number(event.target.value) : null
                        )
                      }
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Requires IoT sensor integration.</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Order Template</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="wo_title_template">WO Title Template</Label>
              <Input
                id="wo_title_template"
                {...register("wo_title_template")}
                placeholder="Monthly Inspection - {asset_name}"
              />
            </div>
            <div>
              <Label>WO Priority</Label>
              <Select
                value={watch("wo_priority")}
                onValueChange={(value) =>
                  setValue("wo_priority", value as MaintenancePlanUpdateInput["wo_priority"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WO_PRIORITIES).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="wo_description_template">WO Description Template</Label>
              <Textarea id="wo_description_template" rows={3} {...register("wo_description_template")} />
            </div>
            <div>
              <Label>Assigned To</Label>
              <TechnicianCombobox
                value={watch("assigned_to")}
                onChange={(value) => setValue("assigned_to", value)}
              />
            </div>
            <div>
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={watch("estimated_hours") ?? ""}
                onChange={(event) =>
                  setValue(
                    "estimated_hours",
                    event.target.value ? Number(event.target.value) : null
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Checklist</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", required: false })}>
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.length === 0 ? <p className="text-sm text-muted-foreground">No checklist items added.</p> : null}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-[2fr_auto_auto]">
                <div>
                  <Label>Description</Label>
                  <Input {...register(`checklist.${index}.description`)} placeholder="Inspect safety guard..." />
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox
                    checked={watch(`checklist.${index}.required`) ?? false}
                    onCheckedChange={(checked) =>
                      setValue(`checklist.${index}.required`, Boolean(checked))
                    }
                  />
                  <Label>Required</Label>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
