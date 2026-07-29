import { GuideGender, GuideLevel, GuideStatus } from '@tour/domain';
import { z } from 'zod';

export const guideLevelSchema = z.nativeEnum(GuideLevel);
export const guideStatusSchema = z.nativeEnum(GuideStatus);
export const guideGenderSchema = z.nativeEnum(GuideGender);

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

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

export const guideLeaderstepsAuthLinkSchema = z.object({
  guideId: z.string().min(1),
  authUserId: z.string().uuid(),
});

export const guideLeaderstepsAuthUnlinkSchema = z.object({
  guideId: z.string().min(1),
});

export const guideLocationFilterSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.')
    .refine(isValidCalendarDate, '유효한 날짜를 입력해 주세요.'),
  guideId: z.string().min(1).nullable().optional(),
});

export type GuideCreateInput = z.infer<typeof guideCreateSchema>;
export type GuideUpdateInput = z.infer<typeof guideUpdateSchema>;
export type GuideLeaderstepsAuthLinkInput = z.infer<typeof guideLeaderstepsAuthLinkSchema>;
export type GuideLeaderstepsAuthUnlinkInput = z.infer<typeof guideLeaderstepsAuthUnlinkSchema>;
export type GuideLocationFilterInput = z.infer<typeof guideLocationFilterSchema>;
