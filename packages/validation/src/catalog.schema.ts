import { z } from 'zod';

const catalogPlaceTypeSchema = z.enum(['LODGING', 'EXPERIENCE', 'MEETING', 'GATE', 'AREA']);
const catalogUsageStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const catalogElementCompositionSchema = z.enum(['SINGLE', 'SET']);
const catalogElementKindSchema = z.enum(['MEETING', 'TRANSFER', 'MEAL', 'EXPERIENCE', 'MIXED']);
const catalogBlockShapeSchema = z.enum(['DAY', 'SET']);
const lifecycleStatusSchema = z.enum(['ACTIVE', 'PENDING_REVIEW', 'DRAFT']);

const optionalId = z.string().min(1).nullable().optional();
const optionalText = z.string().max(500).nullable().optional();

export const catalogRegionCreateSchema = z.object({
  name: z.string().min(1).max(120),
  country: z.string().min(1).max(60).optional(),
  description: optionalText,
  status: catalogUsageStatusSchema.optional(),
});

export const catalogRegionUpdateSchema = catalogRegionCreateSchema.partial();

const catalogPlaceFields = z.object({
  name: z.string().min(1).max(120),
  placeType: catalogPlaceTypeSchema,
  country: z.string().min(1).max(60).optional(),
  regionId: optionalId,
  parentPlaceId: optionalId,
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  displayName: z.string().max(120).nullable().optional(),
  internalNote: optionalText,
  accommodationId: optionalId,
  visitRadiusM: z.number().int().nonnegative().nullable().optional(),
  status: catalogUsageStatusSchema.optional(),
});

function lodgingOnlyAccommodation(
  data: { placeType?: 'LODGING' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA'; accommodationId?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.placeType != null && data.placeType !== 'LODGING' && data.accommodationId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accommodationId'],
      message: 'accommodationId is only allowed when placeType is LODGING',
    });
  }
}

export const catalogPlaceCreateSchema = catalogPlaceFields.superRefine(lodgingOnlyAccommodation);

export const catalogPlaceUpdateSchema = catalogPlaceFields.partial().superRefine(lodgingOnlyAccommodation);

export const catalogRouteCreateSchema = z.object({
  name: z.string().min(1).max(120),
  fromPlaceId: z.string().min(1),
  toPlaceId: z.string().min(1),
  regionId: optionalId,
  averageDistanceKm: z.number().nonnegative().nullable().optional(),
  averageTravelHours: z.number().nonnegative().nullable().optional(),
  status: catalogUsageStatusSchema.optional(),
});

export const catalogRouteUpdateSchema = catalogRouteCreateSchema.partial();

export const catalogElementCreateSchema = z.object({
  name: z.string().min(1).max(120),
  kind: catalogElementKindSchema,
  composition: catalogElementCompositionSchema.optional(),
  customerText: optionalText,
  durationText: z.string().max(120).nullable().optional(),
  costRuleText: z.string().max(200).nullable().optional(),
  defaultPlaceId: optionalId,
  lifecycleStatus: lifecycleStatusSchema.optional(),
  status: catalogUsageStatusSchema.optional(),
});

export const catalogElementUpdateSchema = catalogElementCreateSchema.partial();

export const catalogElementSetItemSchema = z.object({
  setElementId: z.string().min(1),
  memberElementId: z.string().min(1),
});

export const catalogBlockCreateSchema = z.object({
  name: z.string().min(1).max(120),
  shape: catalogBlockShapeSchema.optional(),
  dayCount: z.number().int().min(1).max(30).optional(),
  fromLabel: z.string().max(120).nullable().optional(),
  toLabel: z.string().max(120).nullable().optional(),
  status: catalogUsageStatusSchema.optional(),
});

export const catalogBlockUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  dayCount: z.number().int().min(1).max(30).optional(),
  fromLabel: z.string().max(120).nullable().optional(),
  toLabel: z.string().max(120).nullable().optional(),
  status: catalogUsageStatusSchema.optional(),
});

export const catalogBlockPlacementSchema = z.object({
  blockId: z.string().min(1),
  elementId: z.string().min(1),
  dayIndex: z.number().int().min(1).optional(),
  startLabel: z.string().max(40).nullable().optional(),
});

export const catalogJourneyCreateSchema = z.object({
  name: z.string().min(1).max(120),
  nightCount: z.number().int().min(0).max(60).optional(),
  dayCount: z.number().int().min(1).max(60).optional(),
  status: catalogUsageStatusSchema.optional(),
});

export const catalogJourneyUpdateSchema = catalogJourneyCreateSchema.partial();

export const catalogJourneyPlacementSchema = z.object({
  journeyId: z.string().min(1),
  blockId: z.string().min(1),
  dayOffset: z.number().int().min(0).optional(),
});

export const catalogPlaceBatchUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: catalogUsageStatusSchema.optional(),
  regionId: optionalId,
});

export type CatalogRegionCreateInput = z.infer<typeof catalogRegionCreateSchema>;
export type CatalogRegionUpdateInput = z.infer<typeof catalogRegionUpdateSchema>;
export type CatalogPlaceCreateInput = z.infer<typeof catalogPlaceCreateSchema>;
export type CatalogPlaceUpdateInput = z.infer<typeof catalogPlaceUpdateSchema>;
export type CatalogRouteCreateInput = z.infer<typeof catalogRouteCreateSchema>;
export type CatalogRouteUpdateInput = z.infer<typeof catalogRouteUpdateSchema>;
export type CatalogElementCreateInput = z.infer<typeof catalogElementCreateSchema>;
export type CatalogElementUpdateInput = z.infer<typeof catalogElementUpdateSchema>;
export type CatalogElementSetItemInput = z.infer<typeof catalogElementSetItemSchema>;
export type CatalogBlockCreateInput = z.infer<typeof catalogBlockCreateSchema>;
export type CatalogBlockUpdateInput = z.infer<typeof catalogBlockUpdateSchema>;
export type CatalogBlockPlacementInput = z.infer<typeof catalogBlockPlacementSchema>;
export type CatalogJourneyCreateInput = z.infer<typeof catalogJourneyCreateSchema>;
export type CatalogJourneyUpdateInput = z.infer<typeof catalogJourneyUpdateSchema>;
export type CatalogJourneyPlacementInput = z.infer<typeof catalogJourneyPlacementSchema>;
export type CatalogPlaceBatchUpdateInput = z.infer<typeof catalogPlaceBatchUpdateSchema>;
