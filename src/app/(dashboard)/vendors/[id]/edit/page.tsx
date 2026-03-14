"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Star, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  deleteVendor,
  getVendorById,
  updateVendor,
} from "@/app/(dashboard)/vendors/actions";
import { PageHeader } from "@/components/layout/page-header";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useRBAC } from "@/hooks/use-rbac";
import { cn } from "@/lib/utils";
import { vendorCreateSchema, type VendorCreateInput } from "@/lib/validations/vendor";

const categoryOptions = [
  { value: "parts_supplier", label: "Parts Supplier" },
  { value: "service_provider", label: "Service Provider" },
  { value: "equipment_manufacturer", label: "Equipment Manufacturer" },
  { value: "contractor", label: "Contractor" },
  { value: "other", label: "Other" },
] as const;

export default function EditVendorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canEdit, canDelete } = useRBAC();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<VendorCreateInput>({
    resolver: zodResolver(vendorCreateSchema),
    defaultValues: {
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      country: "",
      category: null,
      rating: null,
      notes: "",
      is_active: true,
    },
  });

  const { handleSubmit, register, reset, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    let mounted = true;
    async function loadVendor() {
      setIsLoading(true);
      try {
        const vendor = await getVendorById(params.id);
        if (!mounted) return;
        if (!vendor) {
          toast.error("Vendor not found.");
          router.push("/vendors");
          return;
        }

        reset({
          name: vendor.name,
          contact_name: vendor.contact_name ?? "",
          email: vendor.email ?? "",
          phone: vendor.phone ?? "",
          website: vendor.website ?? "",
          address: vendor.address ?? "",
          city: vendor.city ?? "",
          state: vendor.state ?? "",
          country: vendor.country ?? "",
          category: vendor.category,
          rating: vendor.rating ?? null,
          notes: vendor.notes ?? "",
          is_active: vendor.is_active,
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadVendor();

    return () => {
      mounted = false;
    };
  }, [params.id, reset, router]);

  const onSubmit = async (input: VendorCreateInput) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit vendors.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateVendor(params.id, input);
      toast.success("Vendor updated successfully.");
      router.push("/vendors");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update vendor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Only administrators can delete vendors.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteVendor(params.id);
      toast.success("Vendor deleted successfully.");
      router.push("/vendors");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete vendor.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading vendor details...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Edit Vendor"
        description="Update vendor profile and status."
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
                  <AlertDialogTitle>Delete this vendor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
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
            <CardTitle>Vendor Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" {...register("contact_name")} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...register("website")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("state")} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select
                value={watch("category") ?? "none"}
                onValueChange={(value) =>
                  setValue("category", value === "none" ? null : (value as VendorCreateInput["category"]))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rating</Label>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const active = (watch("rating") ?? 0) >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className="rounded-sm p-1"
                      onClick={() => setValue("rating", value)}
                    >
                      <Star
                        className={cn(
                          "h-5 w-5",
                          active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                        )}
                      />
                    </button>
                  );
                })}
                <Button type="button" variant="ghost" size="sm" onClick={() => setValue("rating", null)}>
                  Clear
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} {...register("notes")} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive vendors remain in history but are hidden from new assignments.
                </p>
              </div>
              <Switch
                checked={watch("is_active")}
                onCheckedChange={(checked) => setValue("is_active", checked)}
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
