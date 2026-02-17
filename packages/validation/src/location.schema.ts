import { z } from 'zod';

export const locationCreateSchema = z.object({
  regionId: z.string().min(1),
  name: z.string().min(1).max(100),
  defaultLodgingType: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const locationUpdateSchema = locationCreateSchema.partial();

export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
