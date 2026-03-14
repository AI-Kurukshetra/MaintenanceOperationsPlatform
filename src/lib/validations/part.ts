import { z } from "zod";

export const partCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  part_number: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit_cost: z.coerce.number().min(0).default(0),
  quantity_on_hand: z.coerce.number().min(0).default(0),
  minimum_quantity: z.coerce.number().min(0).default(0),
  location_id: z.string().uuid().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  supplier: z.string().optional(),
});

export const partUpdateSchema = partCreateSchema.partial();

export const stockAdjustmentSchema = z.object({
  type: z.enum(["add", "remove", "set"]),
  quantity: z.coerce.number().min(0, "Quantity must be positive"),
  reason: z.enum(["received_shipment", "used_in_work_order", "damaged", "audit_adjustment", "returned"]),
  notes: z.string().optional(),
});

export type PartCreateInput = z.infer<typeof partCreateSchema>;
export type PartUpdateInput = z.infer<typeof partUpdateSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
