"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  MoreHorizontal,
  Package,
  Plus,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import {
  adjustStock,
  getInventoryStats,
  getParts,
} from "@/app/(dashboard)/inventory/actions";
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
import { formatCurrency } from "@/lib/utils";
import type { StockAdjustmentInput } from "@/lib/validations/part";

type PartRow = {
  id: string;
  part_number: string | null;
  name: string;
  category: string | null;
  unit_cost: number;
  quantity_on_hand: number;
  minimum_quantity: number;
  supplier: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  locations: {
    id: string;
    name: string;
    city: string | null;
  } | null;
};

type AdjustmentState = {
  part: PartRow | null;
  type: StockAdjustmentInput["type"];
  quantity: number;
  reason: StockAdjustmentInput["reason"];
  notes: string;
  submitting: boolean;
};

const stockStatusLabelMap: Record<PartRow["stock_status"], string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const stockStatusBadgeMap: Record<PartRow["stock_status"], string> = {
  in_stock: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  low_stock: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  out_of_stock: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function InventoryPage() {
  const router = useRouter();
  const { canCreate, canEdit } = useRBAC();
  const [parts, setParts] = useState<PartRow[]>([]);
  const [stats, setStats] = useState({
    total_parts: 0,
    total_value: 0,
    low_stock: 0,
    out_of_stock: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [adjustment, setAdjustment] = useState<AdjustmentState>({
    part: null,
    type: "add",
    quantity: 1,
    reason: "received_shipment",
    notes: "",
    submitting: false,
  });

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [tableResult, statsResult] = await Promise.all([getParts(), getInventoryStats()]);
        if (!mounted) return;
        setParts(tableResult.data as unknown as PartRow[]);
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
  }, []);

  const columns = useMemo<ColumnDef<PartRow>[]>(
    () => [
      {
        accessorKey: "part_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Part Number" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.part_number ?? "N/A"}</span>
        ),
      },
      {
        id: "search",
        accessorFn: (row) => `${row.name} ${row.part_number ?? ""}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) =>
          row.original.category ? (
            <Badge variant="outline">{row.original.category}</Badge>
          ) : (
            <span className="text-muted-foreground">Uncategorized</span>
          ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "unit_cost",
        accessorKey: "unit_cost",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Unit Cost" />,
        cell: ({ row }) => formatCurrency(row.original.unit_cost),
      },
      {
        id: "quantity_on_hand",
        accessorKey: "quantity_on_hand",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Qty On Hand" />,
        cell: ({ row }) => (
          <span
            className={
              row.original.quantity_on_hand <= row.original.minimum_quantity
                ? "font-medium text-red-600"
                : ""
            }
          >
            {row.original.quantity_on_hand}
          </span>
        ),
      },
      {
        accessorKey: "minimum_quantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Min Qty" />,
      },
      {
        id: "stock_status",
        accessorFn: (row) => row.stock_status,
        header: "Stock Status",
        cell: ({ row }) => (
          <Badge className={stockStatusBadgeMap[row.original.stock_status]}>
            {stockStatusLabelMap[row.original.stock_status]}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => row.original.locations?.name ?? "Unassigned",
      },
      {
        accessorKey: "supplier",
        header: "Supplier",
        cell: ({ row }) => row.original.supplier ?? "N/A",
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
                <DropdownMenuItem onClick={() => router.push(`/inventory/${row.original.id}/edit`)}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <DropdownMenuItem
                  onClick={() =>
                    setAdjustment({
                      part: row.original,
                      type: "add",
                      quantity: 1,
                      reason: "received_shipment",
                      notes: "",
                      submitting: false,
                    })
                  }
                >
                  Adjust Stock
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canEdit, router]
  );

  const categories = useMemo(() => {
    return Array.from(new Set(parts.map((item) => item.category).filter(Boolean) as string[])).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [parts]);

  const handleAdjustStock = async () => {
    if (!adjustment.part) {
      return;
    }
    if (adjustment.quantity <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }

    setAdjustment((current) => ({ ...current, submitting: true }));
    try {
      await adjustStock(adjustment.part.id, {
        type: adjustment.type,
        quantity: adjustment.quantity,
        reason: adjustment.reason,
        notes: adjustment.notes,
      });
      toast.success("Stock adjusted successfully.");
      const refreshed = await getParts();
      setParts(refreshed.data as unknown as PartRow[]);
      setAdjustment({
        part: null,
        type: "add",
        quantity: 1,
        reason: "received_shipment",
        notes: "",
        submitting: false,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to adjust stock.");
      setAdjustment((current) => ({ ...current, submitting: false }));
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Parts"
        description="Track stock levels, values, and suppliers."
        action={
          canCreate ? (
            <Button asChild>
              <Link href="/inventory/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Part
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Parts</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.total_parts}</p>
            </div>
            <Package className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Inventory Value</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(stats.total_value)}</p>
            </div>
            <Warehouse className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.low_stock}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{stats.out_of_stock}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardContent>
        </Card>
      </div>

      {parts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No parts in inventory"
          description="Add your first part to start tracking inventory."
          actionLabel={canCreate ? "Create first part" : undefined}
          actionHref={canCreate ? "/inventory/new" : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={parts}
          searchKey="search"
          searchPlaceholder="Search by name or part number..."
          filterableColumns={[
            {
              id: "stock_status",
              title: "Stock Status",
              options: [
                { label: "In Stock", value: "in_stock" },
                { label: "Low Stock", value: "low_stock" },
                { label: "Out of Stock", value: "out_of_stock" },
              ],
            },
            {
              id: "category",
              title: "Category",
              options: categories.map((category) => ({ label: category, value: category })),
            },
          ]}
          onRowClick={(row) => router.push(`/inventory/${row.original.id}/edit`)}
        />
      )}

      <Dialog
        open={Boolean(adjustment.part)}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustment({
              part: null,
              type: "add",
              quantity: 1,
              reason: "received_shipment",
              notes: "",
              submitting: false,
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {adjustment.part ? `Current quantity: ${adjustment.part.quantity_on_hand}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Adjustment Type</Label>
              <Select
                value={adjustment.type}
                onValueChange={(value) =>
                  setAdjustment((current) => ({ ...current, type: value as StockAdjustmentInput["type"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="remove">Remove</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={adjustment.quantity}
                onChange={(event) =>
                  setAdjustment((current) => ({
                    ...current,
                    quantity: Number(event.target.value || 1),
                  }))
                }
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select
                value={adjustment.reason}
                onValueChange={(value) =>
                  setAdjustment((current) => ({
                    ...current,
                    reason: value as StockAdjustmentInput["reason"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received_shipment">Received Shipment</SelectItem>
                  <SelectItem value="used_in_work_order">Used in Work Order</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="audit_adjustment">Audit Adjustment</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={adjustment.notes}
                onChange={(event) =>
                  setAdjustment((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Optional note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAdjustment({
                  part: null,
                  type: "add",
                  quantity: 1,
                  reason: "received_shipment",
                  notes: "",
                  submitting: false,
                })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleAdjustStock} disabled={adjustment.submitting}>
              {adjustment.submitting ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
