import { AccommodationLevel, PaymentMethod } from '@tour/domain';
import { z } from 'zod';

export const accommodationLevelSchema = z.nativeEnum(AccommodationLevel);
export const paymentMethodSchema = z.nativeEnum(PaymentMethod);

export const accommodationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  destination: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
});

export const accommodationUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destination: z.string().min(1).max(100).optional(),
  region: z.string().min(1).max(100).optional(),
});

export const accommodationOptionCreateSchema = z.object({
  accommodationId: z.string().min(1),
  roomType: z.string().min(1).max(200),
  level: accommodationLevelSchema.optional(),
  priceOffSeason: z.number().int().min(0).nullable().optional(),
  pricePeakSeason: z.number().int().min(0).nullable().optional(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  mealCostPerServing: z.number().int().min(0).nullable().optional(),
  capacity: z.string().max(50).nullable().optional(),
  mealIncluded: z.boolean().optional(),
  facilities: z.string().max(500).nullable().optional(),
  bookingPriority: z.string().max(50).nullable().optional(),
  bookingMethod: z.string().max(100).nullable().optional(),
  phone: z.string().max(100).nullable().optional(),
  googleMapsUrl: z.string().url().nullable().optional(),
  openingDate: z.string().max(100).nullable().optional(),
  closingDate: z.string().max(100).nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  note: z.string().max(5000).nullable().optional(),
});

export const accommodationOptionUpdateSchema = z.object({
  roomType: z.string().min(1).max(200).optional(),
  level: accommodationLevelSchema.optional(),
  priceOffSeason: z.number().int().min(0).nullable().optional(),
  pricePeakSeason: z.number().int().min(0).nullable().optional(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  mealCostPerServing: z.number().int().min(0).nullable().optional(),
  capacity: z.string().max(50).nullable().optional(),
  mealIncluded: z.boolean().optional(),
  facilities: z.string().max(500).nullable().optional(),
  bookingPriority: z.string().max(50).nullable().optional(),
  bookingMethod: z.string().max(100).nullable().optional(),
  phone: z.string().max(100).nullable().optional(),
  googleMapsUrl: z.string().url().nullable().optional(),
  openingDate: z.string().max(100).nullable().optional(),
  closingDate: z.string().max(100).nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  note: z.string().max(5000).nullable().optional(),
});

export type AccommodationCreateInput = z.infer<typeof accommodationCreateSchema>;
export type AccommodationUpdateInput = z.infer<typeof accommodationUpdateSchema>;
export type AccommodationOptionCreateInput = z.infer<typeof accommodationOptionCreateSchema>;
export type AccommodationOptionUpdateInput = z.infer<typeof accommodationOptionUpdateSchema>;
