import type { GuideGender, GuideLevel, GuideStatus } from '@prisma/client';

export interface GuideCreateDto {
  nameKo: string;
  nameMn?: string | null;
  level?: GuideLevel;
  status?: GuideStatus;
  gender?: GuideGender | null;
  birthYear?: number | null;
  isSmoker?: boolean;
  experienceYears?: number | null;
  joinYear?: number | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  certImageUrls?: string[];
  note?: string | null;
}

export interface GuideUpdateDto {
  nameKo?: string;
  nameMn?: string | null;
  level?: GuideLevel;
  status?: GuideStatus;
  gender?: GuideGender | null;
  birthYear?: number | null;
  isSmoker?: boolean;
  experienceYears?: number | null;
  joinYear?: number | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  certImageUrls?: string[];
  note?: string | null;
}

export interface GuidesFilterDto {
  status?: GuideStatus;
  level?: GuideLevel;
}
