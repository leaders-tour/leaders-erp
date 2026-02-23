import { z } from 'zod';

const timeBlockBaseSchema = z.object({
  locationId: z.string().min(1).optional(),
  locationVersionId: z.string().min(1).optional(),
  startTime: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/),
  label: z.string().min(1).max(100),
  orderIndex: z.number().int().min(0),
});

export const timeBlockCreateSchema = timeBlockBaseSchema.superRefine((value, ctx) => {
  if (!value.locationId && !value.locationVersionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'locationId or locationVersionId is required',
      path: ['locationVersionId'],
    });
  }
});

export const timeBlockUpdateSchema = timeBlockBaseSchema.partial();

export type TimeBlockCreateInput = z.infer<typeof timeBlockCreateSchema>;
export type TimeBlockUpdateInput = z.infer<typeof timeBlockUpdateSchema>;
