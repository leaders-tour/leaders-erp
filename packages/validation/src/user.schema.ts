import { DealStage, DealTodoStatus } from '@tour/domain';
import { z } from 'zod';

export const dealStageSchema = z.nativeEnum(DealStage);
export const dealTodoStatusSchema = z.nativeEnum(DealTodoStatus);

export const userCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().nullable().optional(),
  ownerEmployeeId: z.string().min(1).nullable().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  ownerEmployeeId: z.string().min(1).nullable().optional(),
  dealStage: dealStageSchema.optional(),
  dealStageOrder: z.number().int().min(0).optional(),
});

export const dealPipelineCardUpdateSchema = z.object({
  userId: z.string().min(1),
  dealStage: dealStageSchema,
  dealStageOrder: z.number().int().min(0),
});

export const dealPipelineReorderSchema = z
  .object({
    updates: z.array(dealPipelineCardUpdateSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const ids = value.updates.map((item) => item.userId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'updates must not contain duplicated userId',
        path: ['updates'],
      });
    }
  });

export const userNoteCreateSchema = z.object({
  userId: z.string().min(1),
  content: z.string().min(1).max(5000),
  createdBy: z.string().min(1).max(100),
});

export const userDealTodosQuerySchema = z.object({
  userId: z.string().min(1),
  includeDone: z.boolean().optional().default(false),
});

export const userDealTodoStatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: dealTodoStatusSchema,
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type DealPipelineCardUpdateInput = z.infer<typeof dealPipelineCardUpdateSchema>;
export type DealPipelineReorderInput = z.infer<typeof dealPipelineReorderSchema>;
export type UserNoteCreateInput = z.infer<typeof userNoteCreateSchema>;
export type UserDealTodosQueryInput = z.infer<typeof userDealTodosQuerySchema>;
export type UserDealTodoStatusUpdateInput = z.infer<typeof userDealTodoStatusUpdateSchema>;
