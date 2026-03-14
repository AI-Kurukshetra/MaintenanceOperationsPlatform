"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { AssetCombobox } from "@/components/shared/asset-combobox";
import { LocationCombobox } from "@/components/shared/location-combobox";
import { PageSkeleton } from "@/components/shared";
import { assetCreateSchema, type AssetCreateInput } from "@/lib/validations/asset";
import { ASSET_CATEGORIES, ASSET_CRITICALITIES, ASSET_STATUSES } from "@/lib/constants";
import { useRBAC } from "@/hooks/use-rbac";
import { getAssetById, updateAsset, deleteAsset } from "../../actions";

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isAdmin, canEdit } = useRBAC();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [assetCode, setAssetCode] = useState("");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  type AssetFormInput = z.input<typeof assetCreateSchema>;

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(assetCreateSchema),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

  useEffect(() => {
    async function load() {
      try {
        const asset = await getAssetById(id);
        if (!asset) {
          toast.error("Asset not found");
          router.push("/assets");
          return;
        }
        setAssetCode(asset.asset_code);
        const cf = asset.custom_fields as Record<string, string> | null;
        if (cf && typeof cf === "object") {
          setCustomFields(Object.entries(cf).map(([key, value]) => ({ key, value: String(value) })));
        }
        reset({
          name: asset.name,
          description: asset.description ?? "",
          category: asset.category,
          criticality: asset.criticality,
          status: asset.status,
          location_id: asset.location_id,
          parent_asset_id: asset.parent_asset_id,
          manufacturer: asset.manufacturer ?? "",
          model: asset.model ?? "",
          serial_number: asset.serial_number ?? "",
          purchase_date: asset.purchase_date ?? "",
          purchase_cost: asset.purchase_cost,
          warranty_expiry: asset.warranty_expiry ?? "",
          expected_lifespan_years: asset.expected_lifespan_years,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const onSubmit = async (data: AssetFormInput) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit assets.");
      return;
    }

    setIsSubmitting(true);
    try {
      const cf: Record<string, string> = {};
      customFields.forEach((f) => { if (f.key.trim()) cf[f.key.trim()] = f.value; });
      const parsed = assetCreateSchema.parse(data);
      await updateAsset(id, { ...parsed, custom_fields: Object.keys(cf).length > 0 ? cf : undefined });
      toast.success("Asset updated successfully");
      router.push("/assets");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAsset(id);
      toast.success("Asset decommissioned");
      router.push("/assets");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete asset");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Edit Asset"
        description={`Asset Code: ${assetCode}`}
        action={
          isAdmin ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decommission this asset?</AlertDialogTitle>
                  <AlertDialogDescription>This will set the asset status to decommissioned. This action can be reversed by editing the asset status.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : undefined
        }
      />

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
            Update Asset
          </Button>
        </div>
      </form>
    </div>
  );
}
