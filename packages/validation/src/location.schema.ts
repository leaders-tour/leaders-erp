import { MealOption } from '@tour/domain';
import { z } from 'zod';
import { facilityAvailabilitySchema } from './lodging.schema';

export const locationCreateSchema = z.object({
  regionId: z.string().min(1),
  name: z.string().min(1).max(100),
  defaultLodgingType: z.string().min(1).max(100),
  internalMovementDistance: z.number().int().min(1).max(1000).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const locationUpdateSchema = locationCreateSchema.partial();

const locationProfileTimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  activities: z.array(z.string().max(500)).max(20),
});

const locationProfileLodgingSchema = z.object({
  isUnspecified: z.boolean().default(false),
  name: z.string().max(100).nullable().optional(),
  hasElectricity: facilityAvailabilitySchema.default('NO'),
  hasShower: facilityAvailabilitySchema.default('NO'),
  hasInternet: facilityAvailabilitySchema.default('NO'),
});

const locationProfileMealsSchema = z.object({
  breakfast: z.nativeEnum(MealOption).nullable().optional(),
  lunch: z.nativeEnum(MealOption).nullable().optional(),
  dinner: z.nativeEnum(MealOption).nullable().optional(),
});

export const locationProfileCreateSchema = z.object({
  regionId: z.string().min(1),
  name: z.string().min(1).max(100),
  internalMovementDistance: z.number().int().min(1).max(1000).nullable().optional(),
  timeSlots: z.array(locationProfileTimeSlotSchema).min(1).max(24),
  lodging: locationProfileLodgingSchema,
  meals: locationProfileMealsSchema,
});

export const locationProfileUpdateSchema = locationProfileCreateSchema;

export const locationVersionProfileSchema = z.object({
  internalMovementDistance: z.number().int().min(1).max(1000).nullable().optional(),
  timeSlots: z.array(locationProfileTimeSlotSchema).min(1).max(24),
  lodging: locationProfileLodgingSchema,
  meals: locationProfileMealsSchema,
});

export const locationVersionCreateSchema = z.object({
  locationId: z.string().min(1),
  parentVersionId: z.string().min(1).optional(),
  label: z.string().min(1).max(100),
  changeNote: z.string().max(1000).optional(),
  profile: locationVersionProfileSchema,
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
