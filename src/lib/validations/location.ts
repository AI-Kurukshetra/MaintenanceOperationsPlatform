import { z } from "zod";

export const locationCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  parent_location_id: z.string().uuid().nullable().optional(),
});

export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
export const locationUpdateSchema = locationCreateSchema.partial();
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
