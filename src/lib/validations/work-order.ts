import { z } from "zod";

const workOrderBaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  type: z.enum(["reactive", "preventive", "predictive", "inspection", "emergency"], {
    required_error: "Type is required",
  }),
  status: z.enum(["open", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"], {
    required_error: "Priority is required",
  }),
  asset_id: z.string().uuid("Please select an asset"),
  location_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().optional(),
  estimated_hours: z.coerce.number().min(0).nullable().optional(),
  parts: z
    .array(
      z.object({
        part_id: z.string().uuid("Please select a part"),
        quantity_used: z.coerce.number().min(1, "Quantity must be at least 1"),
      })
    )
    .optional(),
});

export const workOrderCreateSchema = workOrderBaseSchema;
export const workOrderUpdateSchema = workOrderBaseSchema.partial();

export type WorkOrderCreateInput = z.infer<typeof workOrderCreateSchema>;
export type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateSchema>;
