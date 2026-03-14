"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { getAssetById } from "@/app/(dashboard)/assets/actions";
import {
  createWorkOrder,
  searchParts,
  searchTechnicians,
} from "@/app/(dashboard)/work-orders/actions";
import { PageHeader } from "@/components/layout/page-header";
import { AssetCombobox } from "@/components/shared/asset-combobox";
import { LocationCombobox } from "@/components/shared/location-combobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { WO_PRIORITIES, WO_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { workOrderCreateSchema, type WorkOrderCreateInput } from "@/lib/validations/work-order";

type TechnicianOption = {
  id: string;
  full_name: string;
  role: "technician" | "manager";
  avatar_url: string | null;
};

type PartOption = {
  id: string;
  name: string;
  part_number: string | null;
  quantity_on_hand: number;
};

type SearchComboboxProps<TOption extends { id: string }> = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  getOptions: (query: string) => Promise<TOption[]>;
  renderLabel: (option: TOption) => ReactNode;
  renderRow: (option: TOption) => ReactNode;
  onOptionSelected?: (option: TOption) => void;
};

function SearchCombobox<TOption extends { id: string }>({
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  getOptions,
  renderLabel,
  renderRow,
  onOptionSelected,
}: SearchComboboxProps<TOption>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<TOption[]>([]);
  const [selected, setSelected] = useState<TOption | null>(null);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const results = await getOptions(search);
        if (!mounted) {
          return;
        }
        setOptions(results);
        if (value) {
          const current = results.find((item) => item.id === value);
          if (current) {
            setSelected(current);
          }
        }
      } catch {
        if (mounted) {
          setOptions([]);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [getOptions, search, value, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected ? (
            <span className="truncate">{renderLabel(selected)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    setSelected(option);
                    onOptionSelected?.(option);
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                  {renderRow(option)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const params = useSearchParams();
  const preselectedAssetId = params.get("assetId");
  const { canCreate } = useRBAC();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partMeta, setPartMeta] = useState<Record<string, PartOption>>({});

  const form = useForm<WorkOrderCreateInput>({
    resolver: zodResolver(workOrderCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "reactive",
      priority: "medium",
      asset_id: preselectedAssetId ?? "",
      location_id: null,
      assigned_to: null,
      due_date: "",
      estimated_hours: null,
      parts: [],
    },
  });

  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "parts",
  });

  const selectedAssetId = watch("asset_id");

  useEffect(() => {
    let mounted = true;

    async function autofillLocation() {
      if (!selectedAssetId) {
        setValue("location_id", null);
        return;
      }
      try {
        const asset = await getAssetById(selectedAssetId);
        if (mounted) {
          setValue("location_id", asset?.location_id ?? null);
        }
      } catch {
        if (mounted) {
          setValue("location_id", null);
        }
      }
    }

    void autofillLocation();

    return () => {
      mounted = false;
    };
  }, [selectedAssetId, setValue]);

  const onSubmit = async (input: WorkOrderCreateInput) => {
    if (!canCreate) {
      toast.error("You do not have permission to create work orders.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: WorkOrderCreateInput = {
        ...input,
        due_date: input.due_date ? new Date(input.due_date).toISOString() : "",
        estimated_hours: input.estimated_hours ?? null,
        parts: (input.parts ?? []).filter((part) => !!part.part_id && part.quantity_used > 0),
      };

      await createWorkOrder(payload);
      toast.success("Work order created successfully.");
      router.push("/work-orders");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create work order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = useMemo(
    () =>
      Object.entries(WO_PRIORITIES).map(([value, meta]) => ({
        value,
        label: meta.label,
        color: meta.color,
      })),
    []
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Create Work Order" description="Log and assign a maintenance task." />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register("title")} />
              {errors.title ? <p className="mt-1 text-sm text-red-600">{errors.title.message}</p> : null}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>
            <div>
              <Label>Type *</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as WorkOrderCreateInput["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WO_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type ? <p className="mt-1 text-sm text-red-600">{errors.type.message}</p> : null}
            </div>
            <div>
              <Label>Priority *</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) =>
                  setValue("priority", value as WorkOrderCreateInput["priority"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", item.color)} />
                        {item.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority ? (
                <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset &amp; Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Asset *</Label>
              <AssetCombobox
                value={watch("asset_id")}
                onChange={(value) => setValue("asset_id", value ?? "", { shouldValidate: true })}
              />
              {errors.asset_id ? (
                <p className="mt-1 text-sm text-red-600">{errors.asset_id.message}</p>
              ) : null}
            </div>
            <div>
              <Label>Location</Label>
              <LocationCombobox
                value={watch("location_id")}
                onChange={(value) => setValue("location_id", value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label>Assigned To</Label>
              <SearchCombobox<TechnicianOption>
                value={watch("assigned_to")}
                onChange={(value) => setValue("assigned_to", value)}
                placeholder="Select technician..."
                searchPlaceholder="Search technicians..."
                getOptions={async (query) =>
                  (await searchTechnicians(query)) as unknown as TechnicianOption[]
                }
                renderLabel={(option) => option.full_name}
                renderRow={(option) => (
                  <span className="flex items-center gap-2">
                    <span>{option.full_name}</span>
                    <Badge variant="outline" className="capitalize">
                      {option.role}
                    </Badge>
                  </span>
                )}
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="datetime-local" {...register("due_date")} />
            </div>
            <div>
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
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
            <CardTitle>Parts Required</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ part_id: "", quantity_used: 1 })}>
              <Plus className="mr-1 h-4 w-4" />
              Add Part
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parts added.</p>
            ) : null}
            {fields.map((field, index) => {
              const selectedPartId = watch(`parts.${index}.part_id`);
              const selectedPart = selectedPartId ? partMeta[selectedPartId] : undefined;

              return (
                <div key={field.id} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-[2fr_1fr_auto]">
                  <div>
                    <Label>Part</Label>
                    <SearchCombobox<PartOption>
                      value={selectedPartId}
                      onChange={(value) =>
                        setValue(`parts.${index}.part_id`, value ?? "", { shouldValidate: true })
                      }
                      placeholder="Search part..."
                      searchPlaceholder="Search by name or part #..."
                      getOptions={async (query) =>
                        (await searchParts(query)) as unknown as PartOption[]
                      }
                      onOptionSelected={(option) =>
                        setPartMeta((current) => ({ ...current, [option.id]: option }))
                      }
                      renderLabel={(option) => `${option.part_number ?? "N/A"} - ${option.name}`}
                      renderRow={(option) => (
                        <span className="flex items-center gap-2">
                          <span>{option.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {option.part_number ?? "N/A"}
                          </span>
                        </span>
                      )}
                    />
                    {selectedPart ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Available stock: {selectedPart.quantity_on_hand}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={watch(`parts.${index}.quantity_used`) ?? 1}
                      onChange={(event) =>
                        setValue(`parts.${index}.quantity_used`, Number(event.target.value || 1), {
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Work Order
          </Button>
        </div>
      </form>
    </div>
  );
}
