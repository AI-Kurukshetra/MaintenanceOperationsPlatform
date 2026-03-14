"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Droplet,
  MoreHorizontal,
  Package,
  Plus,
  Server,
  Settings2,
  ShieldAlert,
  Snowflake,
  Wrench,
  Zap,
} from "lucide-react";

import { getAssets, getAssetStats } from "@/app/(dashboard)/assets/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  PageSkeleton,
  StatusBadge,
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
import { ASSET_CATEGORIES, ASSET_CRITICALITIES, ASSET_STATUSES } from "@/lib/constants";

type AssetRow = {
  id: string;
  asset_code: string;
  name: string;
  category: keyof typeof ASSET_CATEGORIES;
  status: keyof typeof ASSET_STATUSES;
  criticality: keyof typeof ASSET_CRITICALITIES;
  locations: { id: string; name: string; city: string | null } | null;
};

const categoryIconMap = {
  machinery: Wrench,
  electrical: Zap,
  hvac: Snowflake,
  plumbing: Droplet,
  vehicle: Car,
  safety: ShieldAlert,
  other: Package,
} as const;

export default function AssetsPage() {
  const router = useRouter();
  const { canCreate, canEdit } = useRBAC();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    operational: 0,
    needs_repair: 0,
    under_maintenance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [assetResult, statResult] = await Promise.all([getAssets(), getAssetStats()]);
        if (!mounted) {
          return;
        }

        setAssets(assetResult.data as unknown as AssetRow[]);
        setStats(statResult);
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

  const columns = useMemo<ColumnDef<AssetRow>[]>(
    () => [
      {
        accessorKey: "asset_code",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Asset Code" />,
        cell: ({ row }) => (
          <Link
            href={`/assets/${row.original.id}`}
            className="font-mono text-sm text-blue-600 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.asset_code}
          </Link>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => `${row.name} ${row.asset_code}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) => {
          const Icon = categoryIconMap[row.original.category] ?? Package;
          return (
            <Badge variant="outline" className="gap-1.5 capitalize">
              <Icon className="h-3.5 w-3.5" />
              {ASSET_CATEGORIES[row.original.category]}
            </Badge>
          );
        },
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} variant="asset" />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "criticality",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Criticality" />,
        cell: ({ row }) => <StatusBadge status={row.original.criticality} variant="criticality" />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) =>
          row.original.locations
            ? `${row.original.locations.name}${row.original.locations.city ? `, ${row.original.locations.city}` : ""}`
            : "Root",
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
              <DropdownMenuItem onClick={() => router.push(`/assets/${row.original.id}`)}>
                View
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem onClick={() => router.push(`/assets/${row.original.id}/edit`)}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canCreate ? (
                <DropdownMenuItem
                  onClick={() => router.push(`/work-orders/new?assetId=${row.original.id}`)}
                >
                  Create Work Order
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canCreate, canEdit, router]
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Registry"
        description="Manage equipment and facilities in one registry."
        action={
          canCreate ? (
            <Button asChild>
              <Link href="/assets/new">
                <Plus className="mr-2 h-4 w-4" />
                Register Asset
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <Server className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Operational</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.operational}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Needs Repair</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.needs_repair}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Under Maintenance</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.under_maintenance}</p>
            </div>
            <Settings2 className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No assets found"
          description="Start by registering your first asset."
          actionLabel={canCreate ? "Create first asset" : undefined}
          actionHref={canCreate ? "/assets/new" : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={assets}
          searchKey="name"
          searchPlaceholder="Search by asset name or code..."
          filterableColumns={[
            {
              id: "status",
              title: "Status",
              options: Object.entries(ASSET_STATUSES).map(([value, item]) => ({
                label: item.label,
                value,
              })),
            },
            {
              id: "category",
              title: "Category",
              options: Object.entries(ASSET_CATEGORIES).map(([value, label]) => ({
                label,
                value,
              })),
            },
            {
              id: "criticality",
              title: "Criticality",
              options: Object.entries(ASSET_CRITICALITIES).map(([value, item]) => ({
                label: item.label,
                value,
              })),
            },
          ]}
          onRowClick={(row) => router.push(`/assets/${row.original.id}`)}
        />
      )}
    </div>
  );
}
