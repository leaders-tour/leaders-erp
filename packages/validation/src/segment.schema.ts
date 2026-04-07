import { z } from 'zod';

const pricingTimeBands = ['DAWN', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as const;

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
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  flightOutTimeBand: z.enum(pricingTimeBands).optional(),
  timeSlots: segmentTimeSlotsSchema,
  earlyTimeSlots: segmentTimeSlotsSchema.optional(),
  extendTimeSlots: segmentTimeSlotsSchema.optional(),
  earlyExtendTimeSlots: segmentTimeSlotsSchema.optional(),
  isDefault: z.boolean().optional(),
}).superRefine((value, ctx) => {
  const hasStartDate = Boolean(value.startDate);
  const hasEndDate = Boolean(value.endDate);

  if (hasStartDate !== hasEndDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate and endDate must both be provided',
      path: [hasStartDate ? 'endDate' : 'startDate'],
    });
  }

  if (hasStartDate && hasEndDate && value.startDate! > value.endDate!) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    });
  }

  if (value.isDefault !== false && (hasStartDate || hasEndDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'default version cannot have startDate or endDate',
      path: ['startDate'],
    });
  }
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

    const seenBands = new Set<(typeof pricingTimeBands)[number]>();
    value.versions.forEach((version, index) => {
      const band = version.flightOutTimeBand;
      if (!band) {
        return;
      }
      if (seenBands.has(band)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'versions must not contain duplicate flightOutTimeBand values',
          path: ['versions', index, 'flightOutTimeBand'],
        });
        return;
      }
      seenBands.add(band);
    });
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

    const seenBands = new Set<(typeof pricingTimeBands)[number]>();
    value.versions.forEach((version, index) => {
      const band = version.flightOutTimeBand;
      if (!band) {
        return;
      }
      if (seenBands.has(band)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'versions must not contain duplicate flightOutTimeBand values',
          path: ['versions', index, 'flightOutTimeBand'],
        });
        return;
      }
      seenBands.add(band);
    });
  });

export type SegmentCreateInput = z.infer<typeof segmentCreateSchema>;
export type SegmentUpdateInput = z.infer<typeof segmentUpdateSchema>;
export type SegmentTimeSlotInput = z.infer<typeof segmentTimeSlotSchema>;
export type SegmentVersionInput = z.infer<typeof segmentVersionSchema>;
