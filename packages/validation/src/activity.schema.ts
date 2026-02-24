import { z } from 'zod';

export const activityCreateSchema = z.object({
  timeBlockId: z.string().min(1),
  description: z.string().min(1).max(500),
  orderIndex: z.number().int().min(0),
  isOptional: z.boolean().optional().default(false),
  conditionNote: z.string().max(500).nullable().optional(),
});

export const activityUpdateSchema = activityCreateSchema.partial();

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;
