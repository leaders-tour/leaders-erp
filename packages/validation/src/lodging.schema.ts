import { z } from 'zod';

export const facilityAvailabilitySchema = z.enum(['YES', 'LIMITED', 'NO']);

const lodgingBaseSchema = z.object({
  locationId: z.string().min(1).optional(),
  locationVersionId: z.string().min(1).optional(),
  name: z.string().min(1).max(100),
  specialNotes: z.string().max(5000).nullable().optional(),
  isUnspecified: z.boolean().optional(),
  hasElectricity: facilityAvailabilitySchema.optional(),
  hasShower: facilityAvailabilitySchema.optional(),
  hasInternet: facilityAvailabilitySchema.optional(),
});

export const lodgingCreateSchema = lodgingBaseSchema.superRefine((value, ctx) => {
  if (!value.locationId && !value.locationVersionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'locationId or locationVersionId is required',
      path: ['locationVersionId'],
    });
  }
});

export const lodgingUpdateSchema = lodgingBaseSchema.partial();

export type LodgingCreateInput = z.infer<typeof lodgingCreateSchema>;
export type LodgingUpdateInput = z.infer<typeof lodgingUpdateSchema>;
