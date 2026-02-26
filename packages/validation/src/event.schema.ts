import { z } from 'zod';

export const eventCreateSchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  securityDepositKrw: z.number().int().min(0).max(1_000_000_000).default(0),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
});

export const eventUpdateSchema = eventCreateSchema.partial();

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
