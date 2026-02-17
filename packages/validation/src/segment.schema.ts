import { z } from 'zod';

const segmentBaseSchema = z.object({
  regionId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
});

export const segmentCreateSchema = segmentBaseSchema
  .refine((value) => value.fromLocationId !== value.toLocationId, {
    message: 'fromLocationId and toLocationId must be different',
    path: ['toLocationId'],
  });

export const segmentUpdateSchema = segmentBaseSchema.partial();

export type SegmentCreateInput = z.infer<typeof segmentCreateSchema>;
export type SegmentUpdateInput = z.infer<typeof segmentUpdateSchema>;
