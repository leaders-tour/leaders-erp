import { z } from 'zod';

const DESCRIPTION_MAX = 50_000;
const MAX_LOCATIONS_PER_CREATE = 100;

export const locationGuideCreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z
    .string()
    .max(DESCRIPTION_MAX)
    .nullish()
    .transform((value) => (value == null ? '' : value.trim())),
  images: z.array(z.unknown()).min(1).max(20),
  locationIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_LOCATIONS_PER_CREATE)
    .transform((ids) => [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))])
    .refine((ids) => ids.length > 0, { message: 'At least one location id is required' }),
});

export const locationGuideUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(DESCRIPTION_MAX).optional(),
  images: z.array(z.unknown()).max(20).optional(),
  locationId: z.string().min(1).optional(),
});

export type LocationGuideCreateInput = z.infer<typeof locationGuideCreateSchema>;
export type LocationGuideUpdateInput = z.infer<typeof locationGuideUpdateSchema>;
