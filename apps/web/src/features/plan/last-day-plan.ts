import { parseTimeToMinutes } from './pickup-drop';
import { parseMealCellText, toMealCellText, type MealSlot } from './special-meals';

export interface LastDayMealRuleInput {
  travelEndDate: string;
  dropDate: string;
  dropTime: string;
  flightOutTime?: string;
  previousLodgingCellText?: string | null;
}

function isBreakfastDepartureFlight(flightOutTime: string | undefined): boolean {
  const flightOutMinutes = parseTimeToMinutes(flightOutTime?.trim() ?? '');
  return flightOutMinutes !== null && flightOutMinutes >= 13 * 60 && flightOutMinutes <= 14 * 60;
}

export function resolveBreakfastFromPreviousLodging(lodgingCellText: string): string | null {
  const firstLine = lodgingCellText.split('\n')[0]?.trim() ?? '';
  const normalized = firstLine.replace(/\s+/g, '');
  if (!normalized) {
    return null;
  }

  if (normalized === '여행자캠프' || normalized.startsWith('LV4')) {
    return '캠프식';
  }

  if (firstLine.includes('호텔')) {
    return '호텔조식';
  }

  return null;
}

export function getLastDayBreakfastOverride(
  input: Pick<LastDayMealRuleInput, 'flightOutTime' | 'previousLodgingCellText'>,
): string | null {
  if (!isBreakfastDepartureFlight(input.flightOutTime)) {
    return null;
  }

  return resolveBreakfastFromPreviousLodging(input.previousLodgingCellText?.trim() ?? '');
}

export function getRequiredXMealsForLastDay(input: LastDayMealRuleInput): MealSlot[] {
  const { travelEndDate, dropDate, dropTime } = input;
  const minutes = parseTimeToMinutes(dropTime);
  if (minutes === null) {
    return [];
  }

  if (travelEndDate && dropDate && dropDate > travelEndDate) {
    return [];
  }

  const breakfastOverride = getLastDayBreakfastOverride(input);
  if (minutes < 11 * 60) {
    return breakfastOverride ? ['lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner'];
  }
  if (minutes < 14 * 60) {
    return ['lunch', 'dinner'];
  }
  if (minutes < 19 * 60) {
    return ['dinner'];
  }

  return [];
}

export function adjustLastDayMealCellText(value: string, input: LastDayMealRuleInput): string {
  if (parseTimeToMinutes(input.dropTime) === null) {
    return value;
  }

  const fields = parseMealCellText(value);
  const nextFields = { ...fields };
  const requiredXMeals = new Set(getRequiredXMealsForLastDay(input));
  const breakfastOverride = getLastDayBreakfastOverride(input);

  (['breakfast', 'lunch', 'dinner'] as const).forEach((mealSlot) => {
    if (requiredXMeals.has(mealSlot)) {
      nextFields[mealSlot] = 'X';
    }
  });

  if (breakfastOverride && !requiredXMeals.has('breakfast')) {
    nextFields.breakfast = breakfastOverride;
  }

  if (
    nextFields.breakfast === fields.breakfast &&
    nextFields.lunch === fields.lunch &&
    nextFields.dinner === fields.dinner
  ) {
    return value;
  }

  return toMealCellText(nextFields);
}
