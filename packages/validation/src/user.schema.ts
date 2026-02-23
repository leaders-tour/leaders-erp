import { z } from 'zod';

export const userCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
