import { z } from 'zod';

const segmentTimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  activities: z.array(z.string().max(500)).max(20),
});

const segmentVersionKinds = ['DIRECT', 'VIA'] as const;

const segmentVersionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  kind: z.enum(segmentVersionKinds),
  viaLocationIds: z.array(z.string().min(1)).max(10),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: z.array(segmentTimeSlotSchema).min(1).max(24),
  isDefault: z.boolean().optional(),
});

const segmentBaseSchema = z.object({
  regionId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: z.array(segmentTimeSlotSchema).min(1).max(24),
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

    if (value.versions.some((version) => version.kind === 'DIRECT')) {
      // versions path is canonical when provided; top-level direct fields remain required for legacy compatibility.
    }

    const directVersions = value.versions.filter((version) => version.kind === 'DIRECT');
    if (directVersions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'versions must include exactly one DIRECT version',
        path: ['versions'],
      });
    }

    value.versions.forEach((version, index) => {
      const viaSet = new Set(version.viaLocationIds);
      if (version.kind === 'DIRECT') {
        if (version.viaLocationIds.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DIRECT version must not include via locations',
            path: ['versions', index, 'viaLocationIds'],
          });
        }
        if (version.isDefault === false) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DIRECT version must be default',
            path: ['versions', index, 'isDefault'],
          });
        }
        return;
      }

      if (version.viaLocationIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'VIA version must include via locations',
          path: ['versions', index, 'viaLocationIds'],
        });
      }
      if (viaSet.size !== version.viaLocationIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'viaLocationIds must not contain duplicates',
          path: ['versions', index, 'viaLocationIds'],
        });
      }
      if (version.isDefault) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'VIA version cannot be default',
          path: ['versions', index, 'isDefault'],
        });
      }
    });
  });

export const segmentUpdateSchema = segmentBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (!value.versions) {
      return;
    }

    const directVersions = value.versions.filter((version) => version.kind === 'DIRECT');
    if (directVersions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'versions must include exactly one DIRECT version',
        path: ['versions'],
      });
    }

    value.versions.forEach((version, index) => {
      const viaSet = new Set(version.viaLocationIds);
      if (version.kind === 'DIRECT') {
        if (version.viaLocationIds.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DIRECT version must not include via locations',
            path: ['versions', index, 'viaLocationIds'],
          });
        }
        if (version.isDefault === false) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DIRECT version must be default',
            path: ['versions', index, 'isDefault'],
          });
        }
        return;
      }

      if (version.viaLocationIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'VIA version must include via locations',
          path: ['versions', index, 'viaLocationIds'],
        });
      }
      if (viaSet.size !== version.viaLocationIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'viaLocationIds must not contain duplicates',
          path: ['versions', index, 'viaLocationIds'],
        });
      }
      if (version.isDefault) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'VIA version cannot be default',
          path: ['versions', index, 'isDefault'],
        });
      }
    });
  });

export type SegmentCreateInput = z.infer<typeof segmentCreateSchema>;
export type SegmentUpdateInput = z.infer<typeof segmentUpdateSchema>;
export type SegmentTimeSlotInput = z.infer<typeof segmentTimeSlotSchema>;
export type SegmentVersionInput = z.infer<typeof segmentVersionSchema>;
