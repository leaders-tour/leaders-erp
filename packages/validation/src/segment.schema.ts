import { z } from 'zod';
import { locationProfileLodgingSchema, locationProfileMealsSchema } from './location.schema';

const segmentFlightOutTimeBands = ['EVENING_18_21'] as const;
const segmentVersionKinds = ['DEFAULT', 'SEASON', 'FLIGHT'] as const;

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
  kind: z.enum(segmentVersionKinds),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  flightOutTimeBand: z.enum(segmentFlightOutTimeBands).optional(),
  lodgingOverride: locationProfileLodgingSchema.optional(),
  mealsOverride: locationProfileMealsSchema.optional(),
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

  if (value.kind === 'DEFAULT') {
    if (value.isDefault === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'default kind must be marked as default version',
        path: ['kind'],
      });
    }
    if (hasStartDate || hasEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'default version cannot have startDate or endDate',
        path: ['startDate'],
      });
    }
    if (value.flightOutTimeBand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'default version cannot have flightOutTimeBand',
        path: ['flightOutTimeBand'],
      });
    }
    return;
  }

  if (value.isDefault !== false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'non-default alternative version must set isDefault to false',
      path: ['isDefault'],
    });
  }

  if (value.kind === 'SEASON') {
    if (!hasStartDate || !hasEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'season version requires startDate and endDate',
        path: [hasStartDate ? 'endDate' : 'startDate'],
      });
    }
    if (value.flightOutTimeBand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'season version cannot have flightOutTimeBand',
        path: ['flightOutTimeBand'],
      });
    }
  }

  if (value.kind === 'FLIGHT') {
    if (hasStartDate || hasEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'flight version cannot have startDate or endDate',
        path: ['startDate'],
      });
    }
    if (!value.flightOutTimeBand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'flight version requires flightOutTimeBand',
        path: ['flightOutTimeBand'],
      });
    }
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

    const seenBands = new Set<(typeof segmentFlightOutTimeBands)[number]>();
    const seasonalVersions = value.versions
      .filter((version) => version.kind === 'SEASON' && version.startDate && version.endDate)
      .slice()
      .sort((left, right) => left.startDate!.localeCompare(right.startDate!));
    for (let index = 1; index < seasonalVersions.length; index += 1) {
      const previousVersion = seasonalVersions[index - 1]!;
      const currentVersion = seasonalVersions[index]!;
      if (previousVersion.endDate! >= currentVersion.startDate!) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'season versions must not have overlapping date ranges',
          path: ['versions'],
        });
        break;
      }
    }
    value.versions.forEach((version, index) => {
      if (version.kind !== 'FLIGHT') {
        return;
      }
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

    const seenBands = new Set<(typeof segmentFlightOutTimeBands)[number]>();
    const seasonalVersions = value.versions
      .filter((version) => version.kind === 'SEASON' && version.startDate && version.endDate)
      .slice()
      .sort((left, right) => left.startDate!.localeCompare(right.startDate!));
    for (let index = 1; index < seasonalVersions.length; index += 1) {
      const previousVersion = seasonalVersions[index - 1]!;
      const currentVersion = seasonalVersions[index]!;
      if (previousVersion.endDate! >= currentVersion.startDate!) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'season versions must not have overlapping date ranges',
          path: ['versions'],
        });
        break;
      }
    }
    value.versions.forEach((version, index) => {
      if (version.kind !== 'FLIGHT') {
        return;
      }
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

const segmentBulkBaseSchema = segmentBaseSchema
  .omit({ fromLocationId: true, regionId: true })
  .extend({
    regionId: z.string().min(1).optional(),
    fromLocationIds: z.array(z.string().min(1)).min(1).max(50),
  });

const segmentUpdateWithAdditionalFromsBaseSchema = z.object({
  update: segmentUpdateSchema,
  additionalFromLocationIds: z.array(z.string().min(1)).max(50),
});

export const segmentUpdateWithAdditionalFromsSchema = segmentUpdateWithAdditionalFromsBaseSchema.superRefine(
  (value, ctx) => {
    const set = new Set(value.additionalFromLocationIds);
    if (set.size !== value.additionalFromLocationIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'additionalFromLocationIds must not contain duplicates',
        path: ['additionalFromLocationIds'],
      });
    }
  },
);

export const segmentBulkCreateSchema = segmentBulkBaseSchema
  .superRefine((value, ctx) => {
    const uniqueFromIds = new Set(value.fromLocationIds);
    if (uniqueFromIds.size !== value.fromLocationIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fromLocationIds must not contain duplicates',
        path: ['fromLocationIds'],
      });
    }
    if (value.fromLocationIds.includes(value.toLocationId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fromLocationIds must not include toLocationId',
        path: ['fromLocationIds'],
      });
    }

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

    const seenBands = new Set<(typeof segmentFlightOutTimeBands)[number]>();
    const seasonalVersions = value.versions
      .filter((version) => version.kind === 'SEASON' && version.startDate && version.endDate)
      .slice()
      .sort((left, right) => left.startDate!.localeCompare(right.startDate!));
    for (let index = 1; index < seasonalVersions.length; index += 1) {
      const previousVersion = seasonalVersions[index - 1]!;
      const currentVersion = seasonalVersions[index]!;
      if (previousVersion.endDate! >= currentVersion.startDate!) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'season versions must not have overlapping date ranges',
          path: ['versions'],
        });
        break;
      }
    }
    value.versions.forEach((version, index) => {
      if (version.kind !== 'FLIGHT') {
        return;
      }
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
export type SegmentBulkCreateInput = z.infer<typeof segmentBulkCreateSchema>;
export type SegmentUpdateWithAdditionalFromsInput = z.infer<typeof segmentUpdateWithAdditionalFromsSchema>;
export type SegmentTimeSlotInput = z.infer<typeof segmentTimeSlotSchema>;
export type SegmentVersionInput = z.infer<typeof segmentVersionSchema>;
