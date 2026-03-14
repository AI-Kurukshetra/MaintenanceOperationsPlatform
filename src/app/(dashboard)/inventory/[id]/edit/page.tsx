"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  deletePart,
  getPartById,
  getParts,
  getVendorsForParts,
  updatePart,
} from "@/app/(dashboard)/inventory/actions";
import { PageHeader } from "@/components/layout/page-header";
import { LocationCombobox } from "@/components/shared/location-combobox";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRBAC } from "@/hooks/use-rbac";
import { partUpdateSchema, type PartUpdateInput } from "@/lib/validations/part";

type VendorOption = {
  id: string;
  name: string;
};

export default function EditPartPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canEdit, canDelete } = useRBAC();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

  type PartFormInput = z.input<typeof partUpdateSchema>;

  const form = useForm<PartFormInput>({
    resolver: zodResolver(partUpdateSchema),
    defaultValues: {
      name: "",
      part_number: "",
      description: "",
      category: "",
      unit_cost: 0,
      quantity_on_hand: 0,
      minimum_quantity: 0,
      location_id: null,
      vendor_id: null,
      supplier: "",
    },
  });

  const { handleSubmit, register, reset, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [part, vendorRows, partRows] = await Promise.all([
          getPartById(params.id),
          getVendorsForParts(),
          getParts(),
        ]);
        if (!mounted) return;
        if (!part) {
          toast.error("Part not found.");
          router.push("/inventory");
          return;
        }

        reset({
          name: part.name,
          part_number: part.part_number ?? "",
          description: part.description ?? "",
          category: part.category ?? "",
          unit_cost: part.unit_cost,
          quantity_on_hand: part.quantity_on_hand,
          minimum_quantity: part.minimum_quantity,
          location_id: part.location_id,
          vendor_id: part.vendor_id,
          supplier: part.supplier ?? "",
        });

        setVendors(vendorRows as unknown as VendorOption[]);
        const categories = Array.from(
          new Set(
            (partRows.data as { category: string | null }[])
              .map((row) => row.category)
              .filter((category): category is string => !!category)
          )
        ).sort((a, b) => a.localeCompare(b));
        setCategorySuggestions(categories);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [params.id, reset, router]);

  const onSubmit = async (input: PartFormInput) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit parts.");
      return;
    }
    setIsSubmitting(true);
    try {
      const parsed = partUpdateSchema.parse(input) as PartUpdateInput;
      await updatePart(params.id, parsed);
      toast.success("Part updated successfully.");
      router.push("/inventory");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update part.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Only administrators can delete parts.");
      return;
    }

    setIsDeleting(true);
    try {
      await deletePart(params.id);
      toast.success("Part deleted successfully.");
      router.push("/inventory");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete part.");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedVendorId = watch("vendor_id");
  const resolvedVendorId = useMemo(() => selectedVendorId ?? "none", [selectedVendorId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading part details...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Edit Part"
        description="Update inventory details."
        action={
          canDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this part?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The part cannot be deleted if it is referenced by any work order.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : undefined
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Part Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="part_number">Part Number</Label>
              <Input id="part_number" {...register("part_number")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" list="part-category-options" {...register("category")} />
              <datalist id="part-category-options">
                {categorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock &amp; Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label>Unit Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  className="pl-7"
                  value={Number(watch("unit_cost") ?? 0)}
                  onChange={(event) =>
                    setValue("unit_cost", Number(event.target.value || 0), { shouldValidate: true })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Quantity On Hand</Label>
              <Input
                type="number"
                min={0}
                value={Number(watch("quantity_on_hand") ?? 0)}
                onChange={(event) =>
                  setValue("quantity_on_hand", Number(event.target.value || 0), {
                    shouldValidate: true,
                  })
                }
              />
            </div>
            <div>
              <Label>Minimum Quantity</Label>
              <Input
                type="number"
                min={0}
                value={Number(watch("minimum_quantity") ?? 0)}
                onChange={(event) =>
                  setValue("minimum_quantity", Number(event.target.value || 0), {
                    shouldValidate: true,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" {...register("supplier")} />
            </div>
            <div>
              <Label>Vendor</Label>
              <Select
                value={resolvedVendorId}
                onValueChange={(value) => setValue("vendor_id", value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
