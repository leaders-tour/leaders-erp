import { LOCATION_MEAL_SET_FIRST_DAY, LOCATION_MEAL_SET_FIRST_DAY_EARLY } from '@tour/domain';
import type { MealOption } from '../../generated/graphql';

export interface LocationMealSetRow {
  setName: string;
  breakfast: MealOption | null;
  lunch: MealOption | null;
  dinner: MealOption | null;
}

export interface MealsTriplet {
  breakfast: MealOption | null;
  lunch: MealOption | null;
  dinner: MealOption | null;
}

/** 버전의 mealSets에서 1일차 일반·얼리 식사 폼 값으로 분해 */
export function mealsFromVersionMealSets(mealSets: LocationMealSetRow[]): {
  meals: MealsTriplet;
  mealsEarly: MealsTriplet;
} {
  const primary = mealSets.find((m) => m.setName === LOCATION_MEAL_SET_FIRST_DAY) ?? mealSets[0];
  const early = mealSets.find((m) => m.setName === LOCATION_MEAL_SET_FIRST_DAY_EARLY);
  return {
    meals: {
      breakfast: primary?.breakfast ?? null,
      lunch: primary?.lunch ?? null,
      dinner: primary?.dinner ?? null,
    },
    mealsEarly: {
      breakfast: early?.breakfast ?? primary?.breakfast ?? null,
      lunch: early?.lunch ?? primary?.lunch ?? null,
      dinner: early?.dinner ?? primary?.dinner ?? null,
    },
  };
}

export function mealsEarlyDiffersFromRegular(meals: MealsTriplet, mealsEarly: MealsTriplet): boolean {
  return (
    meals.breakfast !== mealsEarly.breakfast ||
    meals.lunch !== mealsEarly.lunch ||
    meals.dinner !== mealsEarly.dinner
  );
}
