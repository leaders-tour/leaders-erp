import { MealOption } from '../../generated/graphql';
import type { FacilityAvailability } from './hooks';

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

export function splitLocationNameAndTag(name: string): { name: string; tag: string | null } {
  const matched = name.match(/^(.*)\s+\(([^()]+)\)$/);
  if (!matched) {
    return { name, tag: null };
  }
  return { name: matched[1] ?? name, tag: matched[2] ?? null };
}

export function mergeLocationNameAndTag(name: string, tag: string): string {
  const trimmedName = name.trim();
  const trimmedTag = tag.trim();
  return trimmedTag ? `${trimmedName} (${trimmedTag})` : trimmedName;
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
