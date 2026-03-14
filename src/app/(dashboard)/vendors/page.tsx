"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Star,
  StarHalf,
  Truck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { getVendors, getVendorStats, updateVendor } from "@/app/(dashboard)/vendors/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  PageSkeleton,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRBAC } from "@/hooks/use-rbac";

type VendorRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  category:
    | "parts_supplier"
    | "service_provider"
    | "equipment_manufacturer"
    | "contractor"
    | "other"
    | null;
  rating: number | null;
  is_active: boolean;
};

const vendorCategoryLabelMap: Record<NonNullable<VendorRow["category"]>, string> = {
  parts_supplier: "Parts Supplier",
  service_provider: "Service Provider",
  equipment_manufacturer: "Equipment Manufacturer",
  contractor: "Contractor",
  other: "Other",
};

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        if (rating >= value) {
          return <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" />;
        }
        if (rating >= value - 0.5) {
          return <StarHalf key={index} className="h-4 w-4 fill-amber-400 text-amber-400" />;
        }
        return <Star key={index} className="h-4 w-4 text-muted-foreground/40" />;
      })}
    </span>
  );
}

export default function VendorsPage() {
  const router = useRouter();
  const { canCreate, canEdit } = useRBAC();
  const [isLoading, setIsLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    parts_suppliers: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [tableResult, statsResult] = await Promise.all([getVendors(), getVendorStats()]);
        if (!mounted) return;
        setVendors(tableResult.data as unknown as VendorRow[]);
        setStats(statsResult);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo<ColumnDef<VendorRow>[]>(
    () => [
      {
        id: "search",
        accessorFn: (row) => `${row.name} ${row.email ?? ""}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <Link
            href={`/vendors/${row.original.id}/edit`}
            className="font-semibold text-blue-600 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "contact_name",
        header: "Contact Name",
        cell: ({ row }) => row.original.contact_name ?? "N/A",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email ?? "N/A",
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "N/A",
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) =>
          row.original.category ? (
            <Badge variant="outline">{vendorCategoryLabelMap[row.original.category]}</Badge>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "rating",
        header: "Rating",
        cell: ({ row }) => <RatingStars rating={row.original.rating} />,
      },
      {
        id: "is_active",
        accessorFn: (row) => (row.is_active ? "active" : "inactive"),
        header: "Active",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${row.original.is_active ? "bg-green-500" : "bg-red-500"}`} />
            <span className={row.original.is_active ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
              {row.original.is_active ? "Active" : "Inactive"}
            </span>
          </span>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
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
                <DropdownMenuItem onClick={() => router.push(`/vendors/${row.original.id}/edit`)}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await updateVendor(row.original.id, {
                        name: row.original.name,
                        contact_name: row.original.contact_name ?? "",
                        email: row.original.email ?? "",
                        phone: row.original.phone ?? "",
                        website: "",
                        address: "",
                        city: "",
                        state: "",
                        country: "",
                        category: row.original.category,
                        rating: row.original.rating,
                        notes: "",
                        is_active: !row.original.is_active,
                      });
                      setVendors((current) =>
                        current.map((item) =>
                          item.id === row.original.id
                            ? { ...item, is_active: !item.is_active }
                            : item
                        )
                      );
                      toast.success("Vendor status updated.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to update vendor.");
                    }
                  }}
                >
                  {row.original.is_active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canEdit, router]
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors & Contractors"
        description="Manage suppliers and service providers."
        action={
          canCreate ? (
            <Button asChild>
              <Link href="/vendors/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <Truck className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Active Vendors</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Parts Suppliers</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.parts_suppliers}</p>
            </div>
            <Truck className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {vendors.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vendors yet"
          description="Add a vendor to connect suppliers and contractors."
          actionLabel={canCreate ? "Create first vendor" : undefined}
          actionHref={canCreate ? "/vendors/new" : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={vendors}
          searchKey="search"
          searchPlaceholder="Search by name or email..."
          filterableColumns={[
            {
              id: "category",
              title: "Category",
              options: Object.entries(vendorCategoryLabelMap).map(([value, label]) => ({
                label,
                value,
              })),
            },
            {
              id: "is_active",
              title: "Status",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ],
            },
          ]}
          onRowClick={(row) => router.push(`/vendors/${row.original.id}/edit`)}
        />
      )}
    </div>
  );
}
