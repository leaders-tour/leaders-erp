import { MealOption } from '../../generated/graphql';
import type { FacilityAvailability } from './hooks';

export type LocationNameLike = string[] | string | null | undefined;

export function normalizeLocationNameLines(value: LocationNameLike): string[] {
  if (Array.isArray(value)) {
    return value.map((line) => line.trim()).filter((line) => line.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

export function formatLocationNameMultiline(value: LocationNameLike): string {
  return normalizeLocationNameLines(value).join('\n');
}

export function formatLocationNameInline(value: LocationNameLike): string {
  return normalizeLocationNameLines(value).join(' / ');
}

export function includesLocationNameKeyword(value: LocationNameLike, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }
  return normalizeLocationNameLines(value).some((line) => line.toLowerCase().includes(normalizedKeyword));
}

export function toMealLabel(value: MealOption | null | undefined): string {
  if (!value) {
    return 'X';
  }
  const labels: Record<MealOption, string> = {
    [MealOption.CampMeal]: '캠프식',
    [MealOption.LocalRestaurant]: '현지식당',
    [MealOption.PorkParty]: '삼겹살파티',
    [MealOption.Horhog]: '허르헉',
    [MealOption.Shashlik]: '샤슬릭',
    [MealOption.ShabuShabu]: '샤브샤브',
  };
  return labels[value];
}

export function toFacilityLabel(value: FacilityAvailability | null | undefined): string {
  if (!value) {
    return '아니오';
  }
  if (value === 'YES') {
    return 'O';
  }
  if (value === 'LIMITED') {
    return '제한';
  }
  return 'X';
}
