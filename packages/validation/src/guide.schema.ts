import { GuideGender, GuideLevel, GuideStatus } from '@tour/domain';
import { z } from 'zod';

export const guideLevelSchema = z.nativeEnum(GuideLevel);
export const guideStatusSchema = z.nativeEnum(GuideStatus);
export const guideGenderSchema = z.nativeEnum(GuideGender);

export const guideCreateSchema = z.object({
  nameKo: z.string().min(1).max(100),
  nameMn: z.string().max(100).nullable().optional(),
  level: guideLevelSchema.optional(),
  status: guideStatusSchema.optional(),
  gender: guideGenderSchema.nullable().optional(),
  birthYear: z.number().int().min(1900).max(2020).nullable().optional(),
  isSmoker: z.boolean().optional(),
  experienceYears: z.number().int().min(0).max(100).nullable().optional(),
  joinYear: z.number().int().min(2000).max(2100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  certImageUrls: z.array(z.string().url()).optional(),
  note: z.string().max(5000).nullable().optional(),
});

export const guideUpdateSchema = z.object({
  nameKo: z.string().min(1).max(100).optional(),
  nameMn: z.string().max(100).nullable().optional(),
  level: guideLevelSchema.optional(),
  status: guideStatusSchema.optional(),
  gender: guideGenderSchema.nullable().optional(),
  birthYear: z.number().int().min(1900).max(2020).nullable().optional(),
  isSmoker: z.boolean().optional(),
  experienceYears: z.number().int().min(0).max(100).nullable().optional(),
  joinYear: z.number().int().min(2000).max(2100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  certImageUrls: z.array(z.string().url()).optional(),
  note: z.string().max(5000).nullable().optional(),
});

export type GuideCreateInput = z.infer<typeof guideCreateSchema>;
export type GuideUpdateInput = z.infer<typeof guideUpdateSchema>;
