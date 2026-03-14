import { z } from "zod";

export const assetCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["machinery", "electrical", "hvac", "plumbing", "vehicle", "safety", "other"], { required_error: "Category is required" }),
  criticality: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  status: z.enum(["operational", "needs_repair", "under_maintenance", "decommissioned"]).default("operational"),
  location_id: z.string().uuid().nullable().optional(),
  parent_asset_id: z.string().uuid().nullable().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.coerce.number().min(0).nullable().optional(),
  warranty_expiry: z.string().optional(),
  expected_lifespan_years: z.coerce.number().min(0).nullable().optional(),
  custom_fields: z.record(z.string(), z.string()).optional(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
