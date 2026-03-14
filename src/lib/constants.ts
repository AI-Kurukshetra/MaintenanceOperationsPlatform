export const ASSET_STATUSES = {
  operational: { label: "Operational", color: "bg-emerald-500" },
  needs_repair: { label: "Needs Repair", color: "bg-amber-500" },
  under_maintenance: { label: "Under Maintenance", color: "bg-blue-500" },
  decommissioned: { label: "Decommissioned", color: "bg-slate-500" },
} as const;

export const ASSET_CATEGORIES = {
  machinery: "Machinery",
  electrical: "Electrical",
  hvac: "HVAC",
  plumbing: "Plumbing",
  vehicle: "Vehicle",
  safety: "Safety",
  other: "Other",
} as const;

export const ASSET_CRITICALITIES = {
  critical: { label: "Critical", color: "bg-red-600" },
  high: { label: "High", color: "bg-orange-500" },
  medium: { label: "Medium", color: "bg-yellow-500" },
  low: { label: "Low", color: "bg-green-500" },
} as const;

export const WO_STATUSES = {
  open: { label: "Open", color: "bg-sky-500" },
  in_progress: { label: "In Progress", color: "bg-indigo-500" },
  on_hold: { label: "On Hold", color: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-slate-500" },
} as const;

export const WO_TYPES = {
  reactive: "Reactive",
  preventive: "Preventive",
  predictive: "Predictive",
  inspection: "Inspection",
  emergency: "Emergency",
} as const;

export const WO_PRIORITIES = {
  critical: { label: "Critical", color: "bg-red-600" },
  high: { label: "High", color: "bg-orange-500" },
  medium: { label: "Medium", color: "bg-yellow-500" },
  low: { label: "Low", color: "bg-green-500" },
} as const;

export const USER_ROLES = {
  admin: "Admin",
  manager: "Manager",
  technician: "Technician",
  viewer: "Viewer",
} as const;

export const PM_TYPES = {
  time_based: "Time Based",
  usage_based: "Usage Based",
  condition_based: "Condition Based",
} as const;

export const PM_FREQUENCY_UNITS = {
  days: "Days",
  weeks: "Weeks",
  months: "Months",
  years: "Years",
  hours: "Hours",
  cycles: "Cycles",
} as const;
