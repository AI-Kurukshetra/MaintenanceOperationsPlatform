"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { getWorkOrders, getWorkOrderStats, updateWorkOrder } from "@/app/(dashboard)/work-orders/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  PageSkeleton,
  StatusBadge,
} from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { WO_PRIORITIES, WO_STATUSES, WO_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type WorkOrderRow = {
  id: string;
  wo_number: string;
  title: string;
  type: keyof typeof WO_TYPES;
  status: keyof typeof WO_STATUSES;
  priority: keyof typeof WO_PRIORITIES;
  due_date: string | null;
  created_at: string;
  assets: {
    id: string;
    name: string;
    asset_code: string;
  } | null;
  assigned_profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
};

const typeBadgeClassMap: Record<WorkOrderRow["type"], string> = {
  reactive: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  preventive: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  emergency: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  inspection: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  predictive: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

function isOverdue(row: WorkOrderRow) {
  if (!row.due_date) {
    return false;
  }
  if (row.status === "completed" || row.status === "cancelled") {
    return false;
  }
  return new Date(row.due_date).getTime() < Date.now();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  return `${first}${second}`.toUpperCase() || "U";
}

export default function WorkOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId") ?? undefined;
  const { canCreate, canEdit } = useRBAC();
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    on_hold: 0,
    overdue: 0,
    completed_this_month: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [tableResult, statsResult] = await Promise.all([
          getWorkOrders(assetId ? { assetId } : {}),
          getWorkOrderStats(),
        ]);
        if (!mounted) {
          return;
        }

        setRows(tableResult.data as unknown as WorkOrderRow[]);
        setStats(statsResult);
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
  }, [assetId]);

  const columns = useMemo<ColumnDef<WorkOrderRow>[]>(
    () => [
      {
        accessorKey: "wo_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="WO Number" />,
        cell: ({ row }) => (
          <Link
            href={`/work-orders/${row.original.id}`}
            className="font-mono text-sm text-blue-600 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.wo_number}
          </Link>
        ),
      },
      {
        id: "search",
        accessorFn: (row) => `${row.wo_number} ${row.title}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge className={typeBadgeClassMap[row.original.type]}>
            {WO_TYPES[row.original.type]}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} variant="work-order" />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "priority",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => <StatusBadge status={row.original.priority} variant="priority" />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "asset",
        header: "Asset",
        cell: ({ row }) =>
          row.original.assets ? (
            <Link
              href={`/assets/${row.original.assets.id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.assets.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          ),
      },
      {
        id: "assigned_to",
        header: "Assigned To",
        cell: ({ row }) =>
          row.original.assigned_profile ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={row.original.assigned_profile.avatar_url ?? undefined}
                  alt={row.original.assigned_profile.full_name}
                />
                <AvatarFallback className="text-xs">
                  {getInitials(row.original.assigned_profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{row.original.assigned_profile.full_name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          ),
      },
      {
        id: "due_date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
        accessorFn: (row) => row.due_date ?? "",
        cell: ({ row }) =>
          row.original.due_date ? (
            <span className={isOverdue(row.original) ? "font-medium text-red-600" : ""}>
              {formatDate(row.original.due_date)}
            </span>
          ) : (
            <span className="text-muted-foreground">No due date</span>
          ),
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
              <DropdownMenuItem onClick={() => router.push(`/work-orders/${row.original.id}`)}>
                View
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem onClick={() => router.push(`/work-orders/${row.original.id}/edit`)}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canEdit && row.original.status !== "completed" && row.original.status !== "cancelled" ? (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await updateWorkOrder(row.original.id, { status: "completed" });
                      toast.success("Work order marked as completed.");
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.original.id ? { ...item, status: "completed" } : item
                        )
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Failed to complete work order."
                      );
                    }
                  }}
                >
                  Complete
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
        title="Work Orders"
        description={
          assetId
            ? "Showing work orders for selected asset."
            : "Track, assign, and complete maintenance work."
        }
        action={
          canCreate ? (
            <Button asChild>
              <Link href={assetId ? `/work-orders/new?assetId=${assetId}` : "/work-orders/new"}>
                <Plus className="mr-2 h-4 w-4" />
                Create Work Order
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <Timer className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.in_progress}</p>
            </div>
            <Clock3 className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">On Hold</p>
              <p className="mt-1 text-2xl font-bold text-slate-600">{stats.on_hold}</p>
            </div>
            <PauseCircle className="h-5 w-5 text-slate-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Completed This Month</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed_this_month}</p>
            </div>
            <CalendarCheck2 className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No work orders yet"
          description="Create your first work order to start tracking maintenance tasks."
          actionLabel={canCreate ? "Create first work order" : undefined}
          actionHref={canCreate ? "/work-orders/new" : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchKey="search"
          searchPlaceholder="Search by WO number or title..."
          filterableColumns={[
            {
              id: "status",
              title: "Status",
              options: Object.entries(WO_STATUSES).map(([value, item]) => ({
                label: item.label,
                value,
              })),
            },
            {
              id: "priority",
              title: "Priority",
              options: Object.entries(WO_PRIORITIES).map(([value, item]) => ({
                label: item.label,
                value,
              })),
            },
            {
              id: "type",
              title: "Type",
              options: Object.entries(WO_TYPES).map(([value, label]) => ({
                label,
                value,
              })),
            },
          ]}
          onRowClick={(row) => router.push(`/work-orders/${row.original.id}`)}
        />
      )}
    </div>
  );
}
