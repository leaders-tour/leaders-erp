import { OverrideTargetType } from '@tour/domain';
import { z } from 'zod';

export const overrideCreateSchema = z.object({
  planVersionId: z.string().min(1),
  targetType: z.nativeEnum(OverrideTargetType),
  targetId: z.string().min(1),
  fieldName: z.string().min(1).max(100),
  value: z.string().min(1).max(1000),
});

export const overrideUpdateSchema = overrideCreateSchema.partial();

export type OverrideCreateInput = z.infer<typeof overrideCreateSchema>;
export type OverrideUpdateInput = z.infer<typeof overrideUpdateSchema>;
