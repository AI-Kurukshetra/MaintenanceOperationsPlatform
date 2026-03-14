"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bell,
  CalendarClock,
  ClipboardList,
  MoreHorizontal,
  Package,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteNotification,
  deleteNotifications,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "@/app/(dashboard)/notifications/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  EmptyState,
  PageSkeleton,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationType } from "@/lib/supabase/types";

type NotificationRow = {
  id: string;
  title: string;
  message: string | null;
  type: NotificationType | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
};

const iconMap: Record<NonNullable<NotificationType>, typeof Bell> = {
  work_order: ClipboardList,
  maintenance: CalendarClock,
  inventory: Package,
  system: Bell,
};

const labelMap: Record<NonNullable<NotificationType>, string> = {
  work_order: "Work Order",
  maintenance: "Maintenance",
  inventory: "Inventory",
  system: "System",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<NotificationRow[]>([]);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications();
      setRows(result.data as unknown as NotificationRow[]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo<ColumnDef<NotificationRow>[]>(
    () => [
      {
        id: "type",
        accessorFn: (row) => row.type ?? "system",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const type = row.original.type ?? "system";
          const Icon = iconMap[type];
          return (
            <span className="inline-flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {labelMap[type]}
            </span>
          );
        },
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "title",
        accessorFn: (row) => `${row.title} ${row.message ?? ""}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => (
          <div
            className={`border-l-2 pl-3 ${
              row.original.is_read
                ? "border-transparent font-medium"
                : "border-blue-500 font-semibold"
            }`}
          >
            {row.original.title}
          </div>
        ),
      },
      {
        id: "message",
        header: "Message",
        cell: ({ row }) => (
          <p className="max-w-[32ch] truncate text-sm text-muted-foreground">
            {row.original.message ?? "No message"}
          </p>
        ),
      },
      {
        id: "time",
        accessorFn: (row) => row.created_at,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Time" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "read_status",
        accessorFn: (row) => (row.is_read ? "read" : "unread"),
        header: "Read",
        cell: ({ row }) =>
          row.original.is_read ? (
            <span className="inline-block h-2 w-2 rounded-full bg-transparent" />
          ) : (
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
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
              {!row.original.is_read ? (
                <DropdownMenuItem
                  onClick={async () => {
                    await markAsRead(row.original.id);
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.original.id ? { ...item, is_read: true } : item
                      )
                    );
                  }}
                >
                  Mark as Read
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  await deleteNotification(row.original.id);
                  setRows((current) => current.filter((item) => item.id !== row.original.id));
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  const selectedIds = selectedRows.map((row) => row.id);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay up to date with maintenance events and alerts."
        action={
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await markAllAsRead();
                setRows((current) => current.map((item) => ({ ...item, is_read: true })));
                toast.success("All notifications marked as read.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to mark all as read.");
              }
            }}
          >
            Mark All as Read
          </Button>
        }
      />

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-3">
          <p className="text-sm text-muted-foreground">{selectedIds.length} selected</p>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await Promise.all(selectedIds.map((id) => markAsRead(id)));
                setRows((current) =>
                  current.map((item) =>
                    selectedIds.includes(item.id) ? { ...item, is_read: true } : item
                  )
                );
                toast.success("Selected notifications marked as read.");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Failed to mark selected notifications."
                );
              }
            }}
          >
            Mark Selected as Read
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={async () => {
              try {
                await deleteNotifications(selectedIds);
                setRows((current) => current.filter((item) => !selectedIds.includes(item.id)));
                setSelectedRows([]);
                toast.success("Selected notifications deleted.");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Failed to delete selected notifications."
                );
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchKey="title"
          searchPlaceholder="Search notifications..."
          filterableColumns={[
            {
              id: "type",
              title: "Type",
              options: Object.entries(labelMap).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              id: "read_status",
              title: "Read Status",
              options: [
                { label: "Unread", value: "unread" },
                { label: "Read", value: "read" },
              ],
            },
          ]}
          enableRowSelection
          onSelectionChange={(items) => setSelectedRows(items)}
          onRowClick={async (row) => {
            try {
              if (!row.original.is_read) {
                await markAsRead(row.original.id);
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.original.id ? { ...item, is_read: true } : item
                  )
                );
              }
              if (row.original.link) {
                router.push(row.original.link);
              }
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Failed to update notification."
              );
            }
          }}
        />
      )}
    </div>
  );
}
