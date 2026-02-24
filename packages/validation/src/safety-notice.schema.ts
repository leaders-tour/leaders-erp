import { z } from 'zod';

export const safetyNoticeCreateSchema = z.object({
  title: z.string().min(1).max(120),
  contentMd: z.string().min(1).max(50000),
  imageUrls: z.array(z.string().url()).max(20).optional(),
});

export const safetyNoticeUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  contentMd: z.string().min(1).max(50000).optional(),
  imageUrls: z.array(z.string().url()).max(20).optional(),
});

export type SafetyNoticeCreateInput = z.infer<typeof safetyNoticeCreateSchema>;
export type SafetyNoticeUpdateInput = z.infer<typeof safetyNoticeUpdateSchema>;
