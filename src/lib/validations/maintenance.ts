import { z } from "zod";

const checklistItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  required: z.boolean().default(false),
});

const maintenancePlanBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  asset_id: z.string().uuid("Please select an asset"),
  type: z.enum(["time_based", "usage_based", "condition_based"], {
    required_error: "Type is required",
  }),
  frequency_value: z.coerce.number().min(1).nullable().optional(),
  frequency_unit: z
    .enum(["days", "weeks", "months", "years", "hours", "cycles"])
    .nullable()
    .optional(),
  start_date: z.string().optional(),
  next_due_date: z.string().optional(),
  usage_current_reading: z.coerce.number().nullable().optional(),
  condition_parameter_name: z.string().optional(),
  condition_threshold: z.coerce.number().nullable().optional(),
  condition_operator: z.enum([">", "<", ">=", "<="]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  wo_title_template: z.string().optional(),
  wo_description_template: z.string().optional(),
  wo_priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  estimated_hours: z.coerce.number().min(0).nullable().optional(),
  checklist: z.array(checklistItemSchema).optional(),
});

export const maintenancePlanCreateSchema = maintenancePlanBaseSchema;
export const maintenancePlanUpdateSchema = maintenancePlanBaseSchema.partial();

export type MaintenancePlanCreateInput = z.infer<typeof maintenancePlanCreateSchema>;
export type MaintenancePlanUpdateInput = z.infer<typeof maintenancePlanUpdateSchema>;
