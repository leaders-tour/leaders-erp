import { MealOption } from '@tour/domain';
import { z } from 'zod';
import { facilityAvailabilitySchema } from './lodging.schema';

const locationNameLineSchema = z.string().max(100);
const locationNameSchema = z.array(locationNameLineSchema).min(1).max(20);

function validateLocationName(name: unknown, ctx: z.RefinementCtx): void {
  if (!Array.isArray(name)) {
    return;
  }

  name.forEach((line, index) => {
    if (typeof line !== 'string' || line.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'location name lines must not be empty',
        path: ['name', index],
      });
    }
  });
}

const locationBaseSchema = z.object({
  regionId: z.string().min(1),
  name: locationNameSchema,
  defaultLodgingType: z.string().min(1).max(100),
  isFirstDayEligible: z.boolean().default(false),
  isLastDayEligible: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const locationCreateSchema = locationBaseSchema.superRefine((value, ctx) => validateLocationName(value.name, ctx));

export const locationUpdateSchema = locationBaseSchema.partial().superRefine((value, ctx) => {
  if (value.name !== undefined) {
    validateLocationName(value.name, ctx);
  }
});

const locationProfileTimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  activities: z.array(z.string().max(500)).max(20),
});

export const locationProfileLodgingSchema = z.object({
  isUnspecified: z.boolean().default(false),
  /** 멀티라인 숙소 안내(예: 일정별 상이 숙소) */
  name: z.string().max(4000).nullable().optional(),
  hasElectricity: facilityAvailabilitySchema.default('NO'),
  hasShower: facilityAvailabilitySchema.default('NO'),
  hasInternet: facilityAvailabilitySchema.default('NO'),
});

export const locationProfileMealsSchema = z.object({
  breakfast: z.nativeEnum(MealOption).nullable().optional(),
  lunch: z.nativeEnum(MealOption).nullable().optional(),
  dinner: z.nativeEnum(MealOption).nullable().optional(),
});

const firstDayMovementMetaSchema = z.object({
  firstDayAverageDistanceKm: z.number().min(0).optional(),
  firstDayAverageTravelHours: z.number().min(0).optional(),
});

const locationProfileTimeSlotsSchema = z.array(locationProfileTimeSlotSchema).min(1).max(24);

const locationProfileFirstDaySchema = z.object({
  isFirstDayEligible: z.boolean().default(false),
  isLastDayEligible: z.boolean().default(false),
  firstDayTimeSlots: locationProfileTimeSlotsSchema.optional(),
  firstDayEarlyTimeSlots: locationProfileTimeSlotsSchema.optional(),
  ...firstDayMovementMetaSchema.shape,
});

function validateFirstDaySchedules<
  T extends {
    isFirstDayEligible?: boolean;
    firstDayTimeSlots?: unknown;
    firstDayEarlyTimeSlots?: unknown;
    firstDayAverageDistanceKm?: unknown;
    firstDayAverageTravelHours?: unknown;
  },
>(value: T, ctx: z.RefinementCtx): void {
  if (!value.isFirstDayEligible) {
    return;
  }

  if (!Array.isArray(value.firstDayTimeSlots) || value.firstDayTimeSlots.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'firstDayTimeSlots is required when isFirstDayEligible is true',
      path: ['firstDayTimeSlots'],
    });
  }

  if (!Array.isArray(value.firstDayEarlyTimeSlots) || value.firstDayEarlyTimeSlots.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'firstDayEarlyTimeSlots is required when isFirstDayEligible is true',
      path: ['firstDayEarlyTimeSlots'],
    });
  }

  if (typeof value.firstDayAverageDistanceKm !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'firstDayAverageDistanceKm is required when isFirstDayEligible is true',
      path: ['firstDayAverageDistanceKm'],
    });
  }

  if (typeof value.firstDayAverageTravelHours !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'firstDayAverageTravelHours is required when isFirstDayEligible is true',
      path: ['firstDayAverageTravelHours'],
    });
  }
}

export const locationProfileCreateSchema = z.object({
  regionId: z.string().min(1),
  name: locationNameSchema,
  ...locationProfileFirstDaySchema.shape,
  lodging: locationProfileLodgingSchema,
  meals: locationProfileMealsSchema,
  /** 1일차 얼리 식사. 생략 시 서버에서 일반 meals와 동일하게 저장 */
  mealsEarly: locationProfileMealsSchema.optional(),
}).superRefine((value, ctx) => {
  validateLocationName(value.name, ctx);
  validateFirstDaySchedules(value, ctx);
});

export const locationProfileUpdateSchema = locationProfileCreateSchema;

export const locationVersionProfileSchema = z.object({
  firstDayTimeSlots: locationProfileTimeSlotsSchema.optional(),
  firstDayEarlyTimeSlots: locationProfileTimeSlotsSchema.optional(),
  ...firstDayMovementMetaSchema.shape,
  lodging: locationProfileLodgingSchema,
  meals: locationProfileMealsSchema,
  mealsEarly: locationProfileMealsSchema.optional(),
});

export const locationVersionCreateSchema = z.object({
  locationId: z.string().min(1),
  sourceVersionId: z.string().min(1).optional(),
  label: z.string().min(1).max(100),
  changeNote: z.string().max(1000).optional(),
  isFirstDayEligible: z.boolean().optional(),
  isLastDayEligible: z.boolean().optional(),
  profile: locationVersionProfileSchema.optional(),
});

export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type LocationProfileCreateInput = z.infer<typeof locationProfileCreateSchema>;
export type LocationProfileUpdateInput = z.infer<typeof locationProfileUpdateSchema>;
export type LocationProfileTimeSlotInput = z.infer<typeof locationProfileTimeSlotSchema>;
export type LocationProfileLodgingInput = z.infer<typeof locationProfileLodgingSchema>;
export type LocationProfileMealsInput = z.infer<typeof locationProfileMealsSchema>;
export type LocationVersionProfileInput = z.infer<typeof locationVersionProfileSchema>;
export type LocationVersionCreateInput = z.infer<typeof locationVersionCreateSchema>;
