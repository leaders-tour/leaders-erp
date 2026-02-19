import { z } from 'zod';

export const lodgingCreateSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1).max(100),
  specialNotes: z.string().max(5000).nullable().optional(),
});

export const lodgingUpdateSchema = lodgingCreateSchema.partial();

export type LodgingCreateInput = z.infer<typeof lodgingCreateSchema>;
export type LodgingUpdateInput = z.infer<typeof lodgingUpdateSchema>;
