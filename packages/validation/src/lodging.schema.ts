import { z } from 'zod';

export const facilityAvailabilitySchema = z.enum(['YES', 'LIMITED', 'NO']);

export const lodgingCreateSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1).max(100),
  specialNotes: z.string().max(5000).nullable().optional(),
  isUnspecified: z.boolean().optional(),
  hasElectricity: facilityAvailabilitySchema.optional(),
  hasShower: facilityAvailabilitySchema.optional(),
  hasInternet: facilityAvailabilitySchema.optional(),
});

export const lodgingUpdateSchema = lodgingCreateSchema.partial();

export type LodgingCreateInput = z.infer<typeof lodgingCreateSchema>;
export type LodgingUpdateInput = z.infer<typeof lodgingUpdateSchema>;
