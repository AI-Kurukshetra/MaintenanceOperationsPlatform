import { z } from "zod";

export const vendorCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_name: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  category: z.enum(["parts_supplier", "service_provider", "equipment_manufacturer", "contractor", "other"]).nullable().optional(),
  rating: z.coerce.number().min(1).max(5).nullable().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const vendorUpdateSchema = vendorCreateSchema.partial();

export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
