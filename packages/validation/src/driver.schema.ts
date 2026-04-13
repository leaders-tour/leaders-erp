import { DriverLevel, DriverStatus, GuideGender, VehicleType } from '@tour/domain';
import { z } from 'zod';

export const driverLevelSchema = z.nativeEnum(DriverLevel);
export const driverStatusSchema = z.nativeEnum(DriverStatus);
export const vehicleTypeSchema = z.nativeEnum(VehicleType);
export const driverGenderSchema = z.nativeEnum(GuideGender);

export const driverCreateSchema = z.object({
  nameMn: z.string().min(1).max(100),
  vehicleType: vehicleTypeSchema.optional(),
  vehicleNumber: z.string().max(50).nullable().optional(),
  vehicleOptions: z.string().max(500).nullable().optional(),
  vehicleYear: z.number().int().min(1990).max(2100).nullable().optional(),
  maxPassengers: z.number().int().min(1).max(50).nullable().optional(),
  level: driverLevelSchema.optional(),
  status: driverStatusSchema.optional(),
  gender: driverGenderSchema.nullable().optional(),
  birthYear: z.number().int().min(1900).max(2010).nullable().optional(),
  isSmoker: z.boolean().optional(),
  hasTouristLicense: z.boolean().optional(),
  joinYear: z.number().int().min(2000).max(2100).nullable().optional(),
  phone: z.string().max(100).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  vehicleImageUrls: z.array(z.string().url()).optional(),
  note: z.string().max(5000).nullable().optional(),
});

export const driverUpdateSchema = z.object({
  nameMn: z.string().min(1).max(100).optional(),
  vehicleType: vehicleTypeSchema.optional(),
  vehicleNumber: z.string().max(50).nullable().optional(),
  vehicleOptions: z.string().max(500).nullable().optional(),
  vehicleYear: z.number().int().min(1990).max(2100).nullable().optional(),
  maxPassengers: z.number().int().min(1).max(50).nullable().optional(),
  level: driverLevelSchema.optional(),
  status: driverStatusSchema.optional(),
  gender: driverGenderSchema.nullable().optional(),
  birthYear: z.number().int().min(1900).max(2010).nullable().optional(),
  isSmoker: z.boolean().optional(),
  hasTouristLicense: z.boolean().optional(),
  joinYear: z.number().int().min(2000).max(2100).nullable().optional(),
  phone: z.string().max(100).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  vehicleImageUrls: z.array(z.string().url()).optional(),
  note: z.string().max(5000).nullable().optional(),
});

export type DriverCreateInput = z.infer<typeof driverCreateSchema>;
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;
