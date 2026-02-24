import { z } from 'zod';

export const locationGuideCreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1),
  imageUrls: z.array(z.string().url()).max(20),
  locationId: z.string().min(1),
});

export const locationGuideUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).optional(),
  imageUrls: z.array(z.string().url()).max(20).optional(),
  locationId: z.string().min(1).optional(),
});

export type LocationGuideCreateInput = z.infer<typeof locationGuideCreateSchema>;
export type LocationGuideUpdateInput = z.infer<typeof locationGuideUpdateSchema>;
