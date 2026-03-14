import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "work-order" | "asset" | "priority" | "criticality";

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

function formatLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const workOrderColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  on_hold: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const workOrderDotColors: Record<string, string> = {
  open: "bg-blue-500",
  in_progress: "bg-amber-500",
  on_hold: "bg-gray-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const assetColors: Record<string, string> = {
  operational: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  needs_repair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  under_maintenance: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  decommissioned: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const assetDotColors: Record<string, string> = {
  operational: "bg-green-500",
  needs_repair: "bg-yellow-500",
  under_maintenance: "bg-blue-500",
  decommissioned: "bg-gray-500",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const priorityDotColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-gray-500",
};

function getColors(
  status: string,
  variant: BadgeVariant
): { badge: string; dot: string } {
  const key = status.toLowerCase();

  switch (variant) {
    case "work-order":
      return {
        badge: workOrderColors[key] ?? "bg-gray-100 text-gray-800",
        dot: workOrderDotColors[key] ?? "bg-gray-500",
      };
    case "asset":
      return {
        badge: assetColors[key] ?? "bg-gray-100 text-gray-800",
        dot: assetDotColors[key] ?? "bg-gray-500",
      };
    case "priority":
    case "criticality":
      return {
        badge: priorityColors[key] ?? "bg-gray-100 text-gray-800",
        dot: priorityDotColors[key] ?? "bg-gray-500",
      };
    default:
      return { badge: "bg-gray-100 text-gray-800", dot: "bg-gray-500" };
  }
}

export function StatusBadge({
  status,
  variant = "default",
  className,
}: StatusBadgeProps) {
  const { badge, dot } = getColors(status, variant);

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 border-none font-medium",
        badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      {formatLabel(status)}
    </Badge>
  );
}
