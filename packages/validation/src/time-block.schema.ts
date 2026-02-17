import { z } from 'zod';

export const timeBlockCreateSchema = z.object({
  dayPlanId: z.string().min(1),
  startTime: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/),
  label: z.string().min(1).max(100),
  orderIndex: z.number().int().min(0),
});

export const timeBlockUpdateSchema = timeBlockCreateSchema.partial();

export type TimeBlockCreateInput = z.infer<typeof timeBlockCreateSchema>;
export type TimeBlockUpdateInput = z.infer<typeof timeBlockUpdateSchema>;
