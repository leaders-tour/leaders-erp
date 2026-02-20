import { MealOption } from '@tour/domain';
import { z } from 'zod';

export const locationCreateSchema = z.object({
  regionId: z.string().min(1),
  name: z.string().min(1).max(100),
  defaultLodgingType: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const locationUpdateSchema = locationCreateSchema.partial();

export const LOCATION_TIMETABLE_SLOTS = ['08:00', '12:00', '18:00'] as const;

const locationProfileTimeSlotSchema = z.object({
  startTime: z.enum(LOCATION_TIMETABLE_SLOTS),
  activities: z.array(z.string().max(500)).max(4),
});

const locationProfileLodgingSchema = z.object({
  isUnspecified: z.boolean().default(false),
  name: z.string().max(100).nullable().optional(),
  hasElectricity: z.boolean().default(false),
  hasShower: z.boolean().default(false),
  hasInternet: z.boolean().default(false),
});

const locationProfileMealsSchema = z.object({
  breakfast: z.nativeEnum(MealOption).nullable().optional(),
  lunch: z.nativeEnum(MealOption).nullable().optional(),
  dinner: z.nativeEnum(MealOption).nullable().optional(),
});

export const locationProfileCreateSchema = z.object({
  regionId: z.string().min(1),
  name: z.string().min(1).max(100),
  timeSlots: z.array(locationProfileTimeSlotSchema).length(3),
  lodging: locationProfileLodgingSchema,
  meals: locationProfileMealsSchema,
});

export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type LocationProfileCreateInput = z.infer<typeof locationProfileCreateSchema>;
