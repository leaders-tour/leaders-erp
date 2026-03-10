import { z } from 'zod';

const travelerTypes = ['family', 'couple', 'friends', 'solo', 'unknown'] as const;

export const cafeLeadNeedsSchema = z.object({
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  durationNights: z.number().int().min(0).max(365).nullable(),
  durationDays: z.number().int().min(0).max(366).nullable(),
  travelerCount: z.number().int().min(1).max(100).nullable(),
  travelerType: z.enum(travelerTypes),
  destinations: z.array(z.string().min(1).max(100)).max(20),
  budget: z.string().min(1).max(500).nullable(),
  interests: z.array(z.string().min(1).max(100)).max(20),
  specialRequests: z.array(z.string().min(1).max(300)).max(20),
  urgency: z.string().min(1).max(100).nullable(),
  leadScore: z.number().int().min(0).max(100).nullable(),
});

export const outreachDraftCreateSchema = z.object({
  subject: z.string().min(1).max(200),
  previewText: z.string().min(1).max(300).nullable(),
  bodyText: z.string().min(1).max(5000),
  bodyHtml: z.string().min(1).max(20000),
  promptVersion: z.string().min(1).max(100),
  modelName: z.string().min(1).max(100),
  qualityScore: z.number().int().min(0).max(100).nullable().optional(),
});

export const outreachDraftEditSchema = z.object({
  subject: z.string().min(1).max(200),
  previewText: z.string().max(300).optional().nullable(),
  bodyText: z.string().min(1).max(5000),
  bodyHtml: z.string().min(1).max(20000),
});

export const contactSuppressionCreateSchema = z.object({
  email: z.string().email().max(191),
  reason: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CafeLeadNeedsInput = z.infer<typeof cafeLeadNeedsSchema>;
export type OutreachDraftCreateInput = z.infer<typeof outreachDraftCreateSchema>;
export type OutreachDraftEditInput = z.infer<typeof outreachDraftEditSchema>;
export type ContactSuppressionCreateInput = z.infer<typeof contactSuppressionCreateSchema>;
