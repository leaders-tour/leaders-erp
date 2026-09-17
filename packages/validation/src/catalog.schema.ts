import { z } from 'zod';

const catalogPlaceTypeSchema = z.enum(['LODGING', 'EXPERIENCE', 'MEETING', 'GATE', 'AREA']);
const catalogUsageStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const catalogElementCompositionSchema = z.enum(['SINGLE', 'SET']);
const catalogElementKindSchema = z.enum(['MEETING', 'TRANSFER', 'MEAL', 'EXPERIENCE', 'MIXED']);
const catalogBlockShapeSchema = z.enum(['DAY', 'SET']);

export const catalogPlaceCreateSchema = z.object({
  name: z.string().min(1).max(120),
  placeType: catalogPlaceTypeSchema,
  country: z.string().min(1).max(60).optional(),
  regionId: z.string().min(1).nullable().optional(),
  parentPlaceId: z.string().min(1).nullable().optional(),
  status: catalogUsageStatusSchema.optional(),
});

export const catalogElementCreateSchema = z.object({
  name: z.string().min(1).max(120),
  kind: catalogElementKindSchema,
  composition: catalogElementCompositionSchema.optional(),
  customerText: z.string().max(500).nullable().optional(),
  status: catalogUsageStatusSchema.optional(),
});

export const catalogBlockCreateSchema = z.object({
  name: z.string().min(1).max(120),
  shape: catalogBlockShapeSchema.optional(),
  fromLabel: z.string().max(120).nullable().optional(),
  toLabel: z.string().max(120).nullable().optional(),
  status: catalogUsageStatusSchema.optional(),
});

export type CatalogPlaceCreateInput = z.infer<typeof catalogPlaceCreateSchema>;
export type CatalogElementCreateInput = z.infer<typeof catalogElementCreateSchema>;
export type CatalogBlockCreateInput = z.infer<typeof catalogBlockCreateSchema>;
