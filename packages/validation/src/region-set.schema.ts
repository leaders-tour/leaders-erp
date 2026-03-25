import { z } from 'zod';

export const regionSetCreateSchema = z.object({
  regionIds: z.array(z.string().min(1)).min(1).max(20),
});

export type RegionSetCreateInput = z.infer<typeof regionSetCreateSchema>;
