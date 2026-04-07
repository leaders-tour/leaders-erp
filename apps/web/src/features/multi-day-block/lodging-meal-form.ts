import { MealOption } from '../../generated/graphql';
import type { FacilityAvailability } from '../location/hooks';
import { toFacilityLabel, toMealLabel } from '../location/display';

export interface MultiDayBlockLodgingFormValue {
  isUnspecified: boolean;
  name: string;
  hasElectricity: FacilityAvailability;
  hasShower: FacilityAvailability;
  hasInternet: FacilityAvailability;
}

export interface MultiDayBlockMealsFormValue {
  breakfast: MealOption | null;
  lunch: MealOption | null;
  dinner: MealOption | null;
}

export interface MultiDayBlockLodgingMealsDraft {
  lodging: MultiDayBlockLodgingFormValue;
  meals: MultiDayBlockMealsFormValue;
}

const DEFAULT_LODGING: MultiDayBlockLodgingFormValue = {
  isUnspecified: false,
  name: '',
  hasElectricity: 'YES',
  hasShower: 'YES',
  hasInternet: 'YES',
};

const DEFAULT_MEALS: MultiDayBlockMealsFormValue = {
  breakfast: null,
  lunch: null,
  dinner: null,
};

const MEAL_LABEL_TO_OPTION: Record<string, MealOption | null> = {
  캠프식: MealOption.CampMeal,
  호텔조식: MealOption.HotelBreakfast,
  현지식: MealOption.LocalMeal,
  현지식당: MealOption.LocalRestaurant,
  샤브샤브: MealOption.ShabuShabu,
  삼겹살파티: MealOption.PorkParty,
  허르헉: MealOption.Horhog,
  샤슬릭: MealOption.Shashlik,
  X: null,
  없음: null,
  '-': null,
};

function parseFacilityAvailability(value: string | undefined): FacilityAvailability | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'o' || normalized === '예' || normalized === 'yes') {
    return 'YES';
  }
  if (normalized === '제한' || normalized === 'limited') {
    return 'LIMITED';
  }
  if (normalized === 'x' || normalized === '아니오' || normalized === 'no') {
    return 'NO';
  }
  return undefined;
}

function parseMealOption(value: string | undefined): MealOption | null | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized in MEAL_LABEL_TO_OPTION) {
    return MEAL_LABEL_TO_OPTION[normalized] ?? null;
  }
  return undefined;
}

export function createDefaultMultiDayBlockLodgingMealsDraft(): MultiDayBlockLodgingMealsDraft {
  return {
    lodging: { ...DEFAULT_LODGING },
    meals: { ...DEFAULT_MEALS },
  };
}

export function parseMultiDayBlockLodgingCellText(value: string | null | undefined): MultiDayBlockLodgingFormValue {
  const text = value?.trim() ?? '';
  if (!text) {
    return { ...DEFAULT_LODGING };
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const name = lines[0] ?? DEFAULT_LODGING.name;
  const parsed: MultiDayBlockLodgingFormValue = {
    ...DEFAULT_LODGING,
    name,
    isUnspecified: name === '숙소 미지정',
  };

  for (const line of lines.slice(1)) {
    const electricityMatch = /^전기\s+(.+)$/.exec(line);
    if (electricityMatch) {
      parsed.hasElectricity = parseFacilityAvailability(electricityMatch[1]) ?? parsed.hasElectricity;
      continue;
    }
    const showerMatch = /^샤워\s+(.+)$/.exec(line);
    if (showerMatch) {
      parsed.hasShower = parseFacilityAvailability(showerMatch[1]) ?? parsed.hasShower;
      continue;
    }
    const internetMatch = /^인터넷\s+(.+)$/.exec(line);
    if (internetMatch) {
      parsed.hasInternet = parseFacilityAvailability(internetMatch[1]) ?? parsed.hasInternet;
    }
  }

  return parsed;
}

export function serializeMultiDayBlockLodgingCellText(lodging: MultiDayBlockLodgingFormValue): string {
  const name = lodging.isUnspecified ? '숙소 미지정' : lodging.name.trim();
  if (!name) {
    return '';
  }

  return [
    name,
    `전기 ${toFacilityLabel(lodging.isUnspecified ? 'NO' : lodging.hasElectricity)}`,
    `샤워 ${toFacilityLabel(lodging.isUnspecified ? 'NO' : lodging.hasShower)}`,
    `인터넷 ${toFacilityLabel(lodging.isUnspecified ? 'NO' : lodging.hasInternet)}`,
  ].join('\n');
}

export function parseMultiDayBlockMealCellText(value: string | null | undefined): MultiDayBlockMealsFormValue {
  const text = value?.trim() ?? '';
  if (!text) {
    return { ...DEFAULT_MEALS };
  }

  const result: MultiDayBlockMealsFormValue = { ...DEFAULT_MEALS };
  const unlabeled: string[] = [];

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const breakfastMatch = /^아침\s*[:：]?\s*(.*)$/.exec(line);
      if (breakfastMatch) {
        result.breakfast = parseMealOption(breakfastMatch[1]) ?? result.breakfast;
        return;
      }
      const lunchMatch = /^점심\s*[:：]?\s*(.*)$/.exec(line);
      if (lunchMatch) {
        result.lunch = parseMealOption(lunchMatch[1]) ?? result.lunch;
        return;
      }
      const dinnerMatch = /^저녁\s*[:：]?\s*(.*)$/.exec(line);
      if (dinnerMatch) {
        result.dinner = parseMealOption(dinnerMatch[1]) ?? result.dinner;
        return;
      }
      unlabeled.push(line);
    });

  if (result.breakfast == null && unlabeled[0]) {
    result.breakfast = parseMealOption(unlabeled[0]) ?? null;
  }
  if (result.lunch == null && unlabeled[1]) {
    result.lunch = parseMealOption(unlabeled[1]) ?? null;
  }
  if (result.dinner == null && unlabeled[2]) {
    result.dinner = parseMealOption(unlabeled[2]) ?? null;
  }

  return result;
}

export function serializeMultiDayBlockMealCellText(meals: MultiDayBlockMealsFormValue): string {
  if (meals.breakfast == null && meals.lunch == null && meals.dinner == null) {
    return '';
  }

  return [toMealLabel(meals.breakfast), toMealLabel(meals.lunch), toMealLabel(meals.dinner)].join('\n');
}

export function parseMultiDayBlockLodgingMealsDraft(input: {
  lodgingCellText: string | null | undefined;
  mealCellText: string | null | undefined;
}): MultiDayBlockLodgingMealsDraft {
  return {
    lodging: parseMultiDayBlockLodgingCellText(input.lodgingCellText),
    meals: parseMultiDayBlockMealCellText(input.mealCellText),
  };
}
