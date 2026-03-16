import { z } from 'zod';

const regionLodgingBaseSchema = z.object({
  regionId: z.string().min(1),
  name: z.string().min(1).max(100),
  priceKrw: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  pricePerPersonKrw: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  pricePerTeamKrw: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

function validatePricingFields<
  TValue extends {
    priceKrw?: number | null;
    pricePerPersonKrw?: number | null;
    pricePerTeamKrw?: number | null;
  },
>(value: TValue, ctx: z.RefinementCtx): void {
  if (value.pricePerPersonKrw != null && value.pricePerTeamKrw != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'pricePerPersonKrw and pricePerTeamKrw cannot both be set',
      path: ['pricePerPersonKrw'],
    });
  }

  if (value.pricePerPersonKrw == null && value.pricePerTeamKrw == null && value.priceKrw == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'priceKrw is required when pricePerPersonKrw and pricePerTeamKrw are empty',
      path: ['priceKrw'],
    });
  }
}

export const regionLodgingCreateSchema = regionLodgingBaseSchema.superRefine(validatePricingFields);

export const regionLodgingUpdateSchema = regionLodgingBaseSchema.partial().superRefine(validatePricingFields);

export type RegionLodgingCreateInput = z.infer<typeof regionLodgingCreateSchema>;
export type RegionLodgingUpdateInput = z.infer<typeof regionLodgingUpdateSchema>;
