"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, MoreHorizontal, Plus, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createLocation,
  deleteLocation,
  getLocationCountries,
  getLocations,
  getLocationStats,
  updateLocation,
} from "@/app/(dashboard)/locations/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  PageSkeleton,
} from "@/components/shared";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRBAC } from "@/hooks/use-rbac";
import { locationCreateSchema, type LocationCreateInput } from "@/lib/validations/location";

type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  parent_location_id: string | null;
  parent: { id: string; name: string } | null;
  asset_count: number;
};

export default function LocationsPage() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useRBAC();
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    total_assets: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LocationCreateInput>({
    resolver: zodResolver(locationCreateSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      parent_location_id: null,
    },
  });

  const { handleSubmit, register, reset, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [locationResult, statsResult, countryResult] = await Promise.all([
          getLocations(),
          getLocationStats(),
          getLocationCountries(),
        ]);

        if (!mounted) return;
        setLocations(locationResult.data as unknown as LocationRow[]);
        setStats(statsResult);
        setCountries(countryResult);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const parentOptions = useMemo(
    () =>
      locations
        .filter((location) => location.id !== editing?.id)
        .map((location) => ({
          id: location.id,
          name: location.name,
        })),
    [editing?.id, locations]
  );

  const openCreateDialog = () => {
    setEditing(null);
    reset({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      parent_location_id: null,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (location: LocationRow) => {
    setEditing(location);
    reset({
      name: location.name,
      address: location.address ?? "",
      city: location.city ?? "",
      state: location.state ?? "",
      country: location.country ?? "",
      parent_location_id: location.parent_location_id,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (input: LocationCreateInput) => {
    if (!(editing ? canEdit : canCreate)) {
      toast.error("You do not have permission for this action.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await updateLocation(editing.id, input);
        toast.success("Location updated successfully.");
      } else {
        await createLocation(input);
        toast.success("Location created successfully.");
      }

      const refreshed = await getLocations();
      setLocations(refreshed.data as unknown as LocationRow[]);
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save location.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo<ColumnDef<LocationRow>[]>(
    () => [
      {
        id: "search",
        accessorFn: (row) => `${row.name} ${row.city ?? ""}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <Link
            href={`/locations?locationId=${row.original.id}`}
            className="font-semibold text-blue-600 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => row.original.address ?? "N/A",
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => row.original.city ?? "N/A",
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => row.original.state ?? "N/A",
      },
      {
        accessorKey: "country",
        header: "Country",
        cell: ({ row }) => row.original.country ?? "N/A",
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "parent",
        header: "Parent Location",
        cell: ({ row }) => row.original.parent?.name ?? "Root",
      },
      {
        id: "asset_count",
        accessorKey: "asset_count",
        header: "Asset Count",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit ? (
                <DropdownMenuItem onClick={() => openEditDialog(row.original)}>Edit</DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(event) => event.preventDefault()}
                    >
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this location?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will fail if there are child locations or assigned assets.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            await deleteLocation(row.original.id);
                            setLocations((current) =>
                              current.filter((location) => location.id !== row.original.id)
                            );
                            toast.success("Location deleted successfully.");
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Failed to delete location."
                            );
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canDelete, canEdit]
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage site hierarchy and facility map."
        action={
          canCreate ? (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Locations</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <Building2 className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Active Locations</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <Warehouse className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Assets Across Locations</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.total_assets}</p>
            </div>
            <Building2 className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {locations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No locations yet"
          description="Create your first location to organize assets."
          actionLabel={canCreate ? "Create first location" : undefined}
          actionHref={canCreate ? "/locations" : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={locations}
          searchKey="search"
          searchPlaceholder="Search by name or city..."
          filterableColumns={[
            {
              id: "country",
              title: "Country",
              options: countries.map((country) => ({ label: country, value: country })),
            },
          ]}
          onRowClick={(row) => {
            if (canEdit) {
              openEditDialog(row.original);
            } else {
              router.push(`/locations?locationId=${row.original.id}`);
            }
          }}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>
              Configure site details and parent hierarchy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
            </div>
            <div>
              <Label>Parent Location</Label>
              <Select
                value={watch("parent_location_id") ?? "none"}
                onValueChange={(value) =>
                  setValue("parent_location_id", value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Root</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
