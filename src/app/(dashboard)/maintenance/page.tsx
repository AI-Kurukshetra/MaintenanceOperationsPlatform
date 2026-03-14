"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import {
  deletePlan,
  generateWorkOrderNow,
  getMaintenancePlans,
  getMaintenancePlanStats,
  togglePlanStatus,
} from "@/app/(dashboard)/maintenance/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  PageSkeleton,
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
import { Switch } from "@/components/ui/switch";
import { useRBAC } from "@/hooks/use-rbac";
import { PM_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type MaintenancePlanRow = {
  id: string;
  name: string;
  type: keyof typeof PM_TYPES;
  frequency_value: number | null;
  frequency_unit: string | null;
  next_due_date: string | null;
  last_performed_at: string | null;
  is_active: boolean;
  assets: {
    id: string;
    name: string;
    asset_code: string;
  } | null;
  assigned_profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
};

const typeClassMap: Record<MaintenancePlanRow["type"], string> = {
  time_based: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  usage_based: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  condition_based: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase() || "U";
}

function getStatusValue(plan: MaintenancePlanRow): "active" | "inactive" | "overdue" {
  if (!plan.is_active) {
    return "inactive";
  }
  if (plan.next_due_date && new Date(plan.next_due_date).getTime() < Date.now()) {
    return "overdue";
  }
  return "active";
}

function getFrequencyLabel(plan: MaintenancePlanRow) {
  if (!plan.frequency_value || !plan.frequency_unit) {
    return "Custom";
  }
  return `Every ${plan.frequency_value} ${plan.frequency_unit}`;
}

export default function MaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetId = searchParams.get("assetId") ?? undefined;
  const { canCreate, canEdit } = useRBAC();
  const [plans, setPlans] = useState<MaintenancePlanRow[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    due_this_week: 0,
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
          getMaintenancePlans(assetId ? { assetId } : {}),
          getMaintenancePlanStats(),
        ]);

        if (!mounted) {
          return;
        }

        setPlans(tableResult.data as unknown as MaintenancePlanRow[]);
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

  const columns = useMemo<ColumnDef<MaintenancePlanRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
        cell: ({ row }) => (
          <Link
            href={`/maintenance/${row.original.id}/edit`}
            className="font-medium text-blue-600 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "asset",
        header: "Asset",
        cell: ({ row }) =>
          row.original.assets ? (
            <Link
              href={`/assets/${row.original.assets.id}`}
              className="text-sm text-blue-600 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.assets.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge className={typeClassMap[row.original.type]}>{PM_TYPES[row.original.type]}</Badge>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "frequency",
        header: "Frequency",
        cell: ({ row }) => getFrequencyLabel(row.original),
      },
      {
        id: "next_due_date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Next Due Date" />,
        accessorFn: (row) => row.next_due_date ?? "",
        cell: ({ row }) => {
          if (!row.original.next_due_date) {
            return <span className="text-muted-foreground">Not scheduled</span>;
          }

          const due = new Date(row.original.next_due_date).getTime();
          const diffDays = Math.floor((due - Date.now()) / (1000 * 60 * 60 * 24));
          let className = "";
          if (due < Date.now()) {
            className = "font-medium text-red-600";
          } else if (diffDays <= 7) {
            className = "font-medium text-amber-600";
          }

          return <span className={className}>{formatDate(row.original.next_due_date)}</span>;
        },
      },
      {
        id: "last_performed_at",
        header: "Last Performed",
        accessorFn: (row) => row.last_performed_at ?? "",
        cell: ({ row }) =>
          row.original.last_performed_at ? (
            <span>{formatDistanceToNow(new Date(row.original.last_performed_at), { addSuffix: true })}</span>
          ) : (
            <span className="text-muted-foreground">Never</span>
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
        id: "status",
        accessorFn: (row) => getStatusValue(row),
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.original.is_active}
              disabled={!canEdit}
              onCheckedChange={async (checked) => {
                try {
                  await togglePlanStatus(row.original.id, checked);
                  setPlans((current) =>
                    current.map((item) =>
                      item.id === row.original.id ? { ...item, is_active: checked } : item
                    )
                  );
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to toggle status.");
                }
              }}
            />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {row.original.is_active ? "Active" : "Inactive"}
            </span>
          </div>
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
                <DropdownMenuItem onClick={() => router.push(`/maintenance/${row.original.id}/edit`)}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await generateWorkOrderNow(row.original.id);
                      toast.success("Work order generated from maintenance plan.");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Failed to generate work order."
                      );
                    }
                  }}
                >
                  Generate WO Now
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    try {
                      await deletePlan(row.original.id);
                      setPlans((current) => current.filter((item) => item.id !== row.original.id));
                      toast.success("Maintenance plan deactivated.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to deactivate.");
                    }
                  }}
                >
                  Deactivate
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
        title="Preventive Maintenance"
        description={
          assetId
            ? "Filtered by selected asset."
            : "Plan and automate recurring maintenance schedules."
        }
        action={
          canCreate ? (
            <Button asChild>
              <Link href={assetId ? `/maintenance/new?assetId=${assetId}` : "/maintenance/new"}>
                <Plus className="mr-2 h-4 w-4" />
                Create PM Schedule
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Active Plans</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <CalendarClock className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Due This Week</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.due_this_week}</p>
            </div>
            <Timer className="h-5 w-5 text-amber-600" />
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

      {plans.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No preventive plans yet"
          description="Create your first PM schedule to automate maintenance."
          actionLabel={canCreate ? "Create first PM schedule" : undefined}
          actionHref={canCreate ? "/maintenance/new" : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={plans}
          searchKey="name"
          searchPlaceholder="Search by plan name..."
          filterableColumns={[
            {
              id: "type",
              title: "Type",
              options: Object.entries(PM_TYPES).map(([value, label]) => ({ label, value })),
            },
            {
              id: "status",
              title: "Status",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Overdue", value: "overdue" },
              ],
            },
          ]}
          onRowClick={(row) => router.push(`/maintenance/${row.original.id}/edit`)}
        />
      )}
    </div>
  );
}
