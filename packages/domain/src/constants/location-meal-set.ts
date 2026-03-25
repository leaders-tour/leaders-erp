/** 1일차 일반 스케줄(FIRST_DAY)용 식사 세트 — 기존 DB와 호환 */
export const LOCATION_MEAL_SET_FIRST_DAY = '기본 세트';

/** 1일차 얼리 스케줄(FIRST_DAY_EARLY)용 식사 세트 */
export const LOCATION_MEAL_SET_FIRST_DAY_EARLY = '1일차_얼리';

/** GraphQL/Prisma MealOption enum과 동일한 문자열 값 */
export interface LocationVersionMealSetLike {
  setName: string;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
}

/** 2일차 이후·체류일 등: 일반 1일차 세트(기본 세트). 없으면 첫 번째 세트. */
export function pickDefaultLocationMealSet(
  mealSets: LocationVersionMealSetLike[] | null | undefined,
): LocationVersionMealSetLike | undefined {
  const list = mealSets ?? [];
  return list.find((m) => m.setName === LOCATION_MEAL_SET_FIRST_DAY) ?? list[0];
}

/** 자동 일정 1일차 행: FIRST_DAY / FIRST_DAY_EARLY에 맞는 식사 세트. 얼리 세트 없으면 일반과 동일. */
export function pickFirstDayMealSetByProfile(
  mealSets: LocationVersionMealSetLike[] | null | undefined,
  profile: 'FIRST_DAY' | 'FIRST_DAY_EARLY',
): LocationVersionMealSetLike | undefined {
  const firstDay = pickDefaultLocationMealSet(mealSets);
  if (profile !== 'FIRST_DAY_EARLY') {
    return firstDay;
  }
  const list = mealSets ?? [];
  const early = list.find((m) => m.setName === LOCATION_MEAL_SET_FIRST_DAY_EARLY);
  return early ?? firstDay;
}
