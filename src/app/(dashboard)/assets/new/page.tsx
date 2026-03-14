"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { AssetCombobox } from "@/components/shared/asset-combobox";
import { LocationCombobox } from "@/components/shared/location-combobox";
import { useRBAC } from "@/hooks/use-rbac";
import { assetCreateSchema, type AssetCreateInput } from "@/lib/validations/asset";
import { ASSET_CATEGORIES, ASSET_CRITICALITIES, ASSET_STATUSES } from "@/lib/constants";
import { createAsset } from "../actions";

export default function NewAssetPage() {
  const router = useRouter();
  const { canCreate } = useRBAC();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  type AssetFormInput = z.input<typeof assetCreateSchema>;

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(assetCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      category: undefined,
      criticality: "medium",
      status: "operational",
      location_id: null,
      parent_asset_id: null,
      manufacturer: "",
      model: "",
      serial_number: "",
      purchase_date: "",
      purchase_cost: null,
      warranty_expiry: "",
      expected_lifespan_years: null,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const onSubmit = async (data: AssetFormInput) => {
    if (!canCreate) {
      toast.error("You do not have permission to create assets.");
      return;
    }

    setIsSubmitting(true);
    try {
      const cf: Record<string, string> = {};
      customFields.forEach((f) => { if (f.key.trim()) cf[f.key.trim()] = f.value; });
      const parsed = assetCreateSchema.parse(data);
      await createAsset({ ...parsed, custom_fields: Object.keys(cf).length > 0 ? cf : undefined });
      toast.success("Asset created successfully");
      router.push("/assets");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Register New Asset" description="Add a new asset to the registry" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Category *</Label>
                <Select value={watch("category")} onValueChange={(v) => setValue("category", v as AssetCreateInput["category"], { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_CATEGORIES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <Label>Criticality</Label>
                <Select value={watch("criticality")} onValueChange={(v) => setValue("criticality", v as AssetCreateInput["criticality"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_CRITICALITIES).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as AssetCreateInput["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_STATUSES).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location & Hierarchy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Location</Label>
              <LocationCombobox value={watch("location_id")} onChange={(v) => setValue("location_id", v)} />
            </div>
            <div>
              <Label>Parent Asset</Label>
              <AssetCombobox value={watch("parent_asset_id")} onChange={(v) => setValue("parent_asset_id", v)} placeholder="Select parent asset (optional)..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Manufacturer</Label>
                <Input {...register("manufacturer")} />
              </div>
              <div>
                <Label>Model</Label>
                <Input {...register("model")} />
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input {...register("serial_number")} />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input type="date" {...register("purchase_date")} />
              </div>
              <div>
                <Label>Purchase Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" className="pl-7" {...register("purchase_cost")} />
                </div>
              </div>
              <div>
                <Label>Warranty Expiry</Label>
                <Input type="date" {...register("warranty_expiry")} />
              </div>
              <div>
                <Label>Expected Lifespan</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" {...register("expected_lifespan_years")} />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">years</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Custom Fields</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}>
                <Plus className="mr-1 h-4 w-4" />Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {customFields.length === 0 && <p className="text-sm text-muted-foreground">No custom fields added.</p>}
            {customFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Key"
                  value={field.key}
                  onChange={(e) => {
                    const updated = [...customFields];
                    updated[index] = { ...updated[index], key: e.target.value };
                    setCustomFields(updated);
                  }}
                />
                <Input
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => {
                    const updated = [...customFields];
                    updated[index] = { ...updated[index], value: e.target.value };
                    setCustomFields(updated);
                  }}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Asset
          </Button>
        </div>
      </form>
    </div>
  );
}
