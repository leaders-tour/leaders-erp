import { z } from 'zod';

export const safetyNoticeCreateSchema = z.object({
  title: z.string().min(1).max(120),
  contentMd: z.string().min(1).max(50000),
});

export const safetyNoticeUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  contentMd: z.string().min(1).max(50000).optional(),
});

export type SafetyNoticeCreateInput = z.infer<typeof safetyNoticeCreateSchema>;
export type SafetyNoticeUpdateInput = z.infer<typeof safetyNoticeUpdateSchema>;
