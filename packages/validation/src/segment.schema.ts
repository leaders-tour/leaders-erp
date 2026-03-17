import { z } from 'zod';

const segmentTimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  activities: z.array(z.string().max(500)).max(20),
});

const segmentTimeSlotsSchema = z.array(segmentTimeSlotSchema).min(1).max(24);

const segmentVersionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: segmentTimeSlotsSchema,
  earlyTimeSlots: segmentTimeSlotsSchema.optional(),
  extendTimeSlots: segmentTimeSlotsSchema.optional(),
  earlyExtendTimeSlots: segmentTimeSlotsSchema.optional(),
  isDefault: z.boolean().optional(),
});

const segmentBaseSchema = z.object({
  regionId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: segmentTimeSlotsSchema,
  earlyTimeSlots: segmentTimeSlotsSchema.optional(),
  extendTimeSlots: segmentTimeSlotsSchema.optional(),
  earlyExtendTimeSlots: segmentTimeSlotsSchema.optional(),
  versions: z.array(segmentVersionSchema).min(1).max(20).optional(),
});

export const segmentCreateSchema = segmentBaseSchema
  .refine((value) => value.fromLocationId !== value.toLocationId, {
    message: 'fromLocationId and toLocationId must be different',
    path: ['toLocationId'],
  })
  .superRefine((value, ctx) => {
    if (!value.versions) {
      return;
    }

    const defaultVersions = value.versions.filter((version) => version.isDefault !== false);
    if (defaultVersions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'versions must include exactly one default version',
        path: ['versions'],
      });
    }
  });

export const segmentUpdateSchema = segmentBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (!value.versions) {
      return;
    }

    const defaultVersions = value.versions.filter((version) => version.isDefault !== false);
    if (defaultVersions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'versions must include exactly one default version',
        path: ['versions'],
      });
    }
  });

export type SegmentCreateInput = z.infer<typeof segmentCreateSchema>;
export type SegmentUpdateInput = z.infer<typeof segmentUpdateSchema>;
export type SegmentTimeSlotInput = z.infer<typeof segmentTimeSlotSchema>;
export type SegmentVersionInput = z.infer<typeof segmentVersionSchema>;
