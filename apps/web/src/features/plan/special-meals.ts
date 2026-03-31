/**
 * 특식 4종 규칙 기반 배치: 상수, mealCellText 변환, assignment 타입, 샤브샤브 제약/삼겹살 추천 규칙.
 * 일정빌더/템플릿/멀티데이블록에서 공통 사용.
 */

import {
  SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
  type SpecialMealDestinationRulesPayload,
} from '@tour/validation';
import { includesLocationNameKeyword } from '../location/display';

// --- 상수 ---

export const SPECIAL_MEAL_KINDS = ['샤브샤브', '삼겹살파티', '허르헉', '샤슬릭'] as const;
export type SpecialMealKind = (typeof SPECIAL_MEAL_KINDS)[number];

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
};

export function mealSlotToLabel(slot: MealSlot): string {
  return MEAL_SLOT_LABELS[slot];
}

export function labelToMealSlot(label: string): MealSlot | null {
  const t = label.trim();
  if (t === '아침') return 'breakfast';
  if (t === '점심') return 'lunch';
  if (t === '저녁') return 'dinner';
  return null;
}

// --- mealCellText 파싱/직렬화 ---

export interface MealCellFields {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export function parseMealCellText(value: string | null | undefined): MealCellFields {
  const result: MealCellFields = {
    breakfast: '',
    lunch: '',
    dinner: '',
  };
  const text = value?.trim() ?? '';
  if (!text || text === '-') {
    return result;
  }

  const unlabeled: string[] = [];
  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const breakfastMatch = /^아침\s*[:：]?\s*(.*)$/.exec(trimmed);
    if (breakfastMatch) {
      result.breakfast = breakfastMatch[1]?.trim() ?? '';
      return;
    }
    const lunchMatch = /^점심\s*[:：]?\s*(.*)$/.exec(trimmed);
    if (lunchMatch) {
      result.lunch = lunchMatch[1]?.trim() ?? '';
      return;
    }
    const dinnerMatch = /^저녁\s*[:：]?\s*(.*)$/.exec(trimmed);
    if (dinnerMatch) {
      result.dinner = dinnerMatch[1]?.trim() ?? '';
      return;
    }
    unlabeled.push(trimmed);
  });

  if (!result.breakfast && unlabeled[0]) result.breakfast = unlabeled[0];
  if (!result.lunch && unlabeled[1]) result.lunch = unlabeled[1];
  if (!result.dinner && unlabeled[2]) result.dinner = unlabeled[2];

  return result;
}

export function toMealCellText(fields: MealCellFields): string {
  return [
    fields.breakfast ? `아침 ${fields.breakfast}` : '',
    fields.lunch ? `점심 ${fields.lunch}` : '',
    fields.dinner ? `저녁 ${fields.dinner}` : '',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

// --- Assignment ---

export interface SpecialMealAssignment {
  specialMeal: SpecialMealKind;
  dayIndex: number;
  mealSlot: MealSlot;
}

export type SpecialMealOriginalSlotValues = Record<string, string>;

export interface SpecialMealSelectionValue {
  dayIndex: number;
  mealSlot: MealSlot;
}

export type SpecialMealSelectionMap = Record<SpecialMealKind, SpecialMealSelectionValue | null>;

export interface PlanRowForSpecialMeals {
  mealCellText: string;
  destinationCellText?: string | null;
  scheduleCellText?: string | null;
}

/** planRows에서 특식 4종 배치 상태를 역산 */
export function getAssignmentsFromPlanRows(
  rows: PlanRowForSpecialMeals[],
): SpecialMealAssignment[] {
  const assignments: SpecialMealAssignment[] = [];
  rows.forEach((row, dayIndex) => {
    const fields = parseMealCellText(row.mealCellText);
    (MEAL_SLOTS as readonly MealSlot[]).forEach((slot) => {
      const value = fields[slot].trim();
      if (SPECIAL_MEAL_KINDS.some((k) => value.includes(k))) {
        assignments.push({
          specialMeal: SPECIAL_MEAL_KINDS.find((k) => value.includes(k))!,
          dayIndex,
          mealSlot: slot,
        });
      }
    });
  });
  return assignments;
}

// --- Row context (후보/추천 계산용) ---

export interface SpecialMealRowContext {
  dayIndex: number;
  mealSlot: MealSlot;
  destinationCellText?: string | null;
  scheduleCellText?: string | null;
}

export function getSpecialMealSlotKey(dayIndex: number, mealSlot: MealSlot): string {
  return `${dayIndex}:${mealSlot}`;
}

function getRowCombinedText(ctx: SpecialMealRowContext): string {
  const d = ctx.destinationCellText?.trim() ?? '';
  const s = ctx.scheduleCellText?.trim() ?? '';
  return [d, s].filter(Boolean).join('\n');
}

/** 울란바토르 지역 여부 (destination/schedule 텍스트 기준) */
export function isUlaanbaatarRow(ctx: SpecialMealRowContext): boolean {
  return includesLocationNameKeyword(getRowCombinedText(ctx), '울란바토르');
}

/** GraphQL에서 채운 목적지 이름 줄(일정 셀 텍스트와 부분 일치) */
export type SpecialMealDestinationRules = SpecialMealDestinationRulesPayload & {
  shabushabuResolvedNameLines?: string[][];
};

/** 설정 미로드·테스트용 기본 규칙 (@tour/validation과 동일) */
export const DEFAULT_SPECIAL_MEAL_DESTINATION_RULES = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT;

export function formatShabushabuAllowedSummary(rules: SpecialMealDestinationRules): string {
  if (rules.shabushabuLocationIds.length === 0) {
    return '허용 목적지 없음';
  }
  const lines = rules.shabushabuResolvedNameLines;
  if (lines && lines.length > 0) {
    const labels = lines
      .map((l) => l.map((s) => s.trim()).filter(Boolean).join(' / '))
      .filter(Boolean);
    return labels.length > 0 ? labels.join(', ') : '목적지 이름을 불러오는 중…';
  }
  return `등록된 목적지 ${rules.shabushabuLocationIds.length}곳 (이름 로딩 대기)`;
}

// --- 샤브샤브: hard constraint (규칙에 등록된 Location 이름이 목적지/일정에 보이는 행) ---

/** 샤브샤브 배치 가능 후보 */
export function getShabushabuAllowedCandidates(
  rowContexts: SpecialMealRowContext[],
  rules: SpecialMealDestinationRules = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
): SpecialMealRowContext[] {
  if (rules.shabushabuLocationIds.length === 0) {
    return [];
  }
  return rowContexts.filter((ctx) => isShabushabuAllowed(ctx, rules));
}

export function isShabushabuAllowed(
  ctx: SpecialMealRowContext,
  rules: SpecialMealDestinationRules = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
): boolean {
  if (rules.shabushabuLocationIds.length === 0) {
    return false;
  }
  const resolved = rules.shabushabuResolvedNameLines;
  if (!resolved || resolved.length === 0) {
    return false;
  }
  const blob = getRowCombinedText(ctx);
  return resolved.some((nameLines) =>
    nameLines.some((line) => {
      const t = line.trim();
      return t.length > 0 && includesLocationNameKeyword(blob, t);
    }),
  );
}

// --- 삼겹살파티: soft recommendation (지역별 우선 추천지) ---

function inferRegion(
  ctx: SpecialMealRowContext,
  rules: SpecialMealDestinationRules,
): string | null {
  const text = getRowCombinedText(ctx).toLowerCase();
  for (const { keyword, regionLabel } of rules.samgyeopsalRegionKeywordMap) {
    if (text.includes(keyword.toLowerCase())) {
      return regionLabel;
    }
  }
  return null;
}

function getLocationPriorityInRegion(
  region: string,
  rules: SpecialMealDestinationRules,
): string[] {
  const block = rules.samgyeopsalPriorityByRegion.find((p) => p.regionLabel === region);
  return block?.orderedLocationKeywords ?? [];
}

export function getSamgyeopsalRecommendationRank(
  ctx: SpecialMealRowContext,
  rules: SpecialMealDestinationRules = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
): number | null {
  const region = inferRegion(ctx, rules);
  if (!region) {
    return null;
  }
  const priorityList = getLocationPriorityInRegion(region, rules);
  const text = getRowCombinedText(ctx).toLowerCase();
  const index = priorityList.findIndex((loc) => text.includes(loc.toLowerCase()));
  return index >= 0 ? index + 1 : null;
}

/** 삼겹살파티 추천 순서로 정렬 */
export function getSamgyeopsalRecommendedCandidates(
  rowContexts: SpecialMealRowContext[],
  rules: SpecialMealDestinationRules = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
): SpecialMealRowContext[] {
  const withScore = rowContexts.map((ctx) => {
    const region = inferRegion(ctx, rules);
    const text = getRowCombinedText(ctx).toLowerCase();
    const priorityList = region ? getLocationPriorityInRegion(region, rules) : [];
    let order = priorityList.length;
    const idx = priorityList.findIndex((loc) => text.includes(loc.toLowerCase()));
    if (idx >= 0) {
      order = idx;
    }
    return { ctx, order };
  });
  withScore.sort((a, b) => a.order - b.order);
  return withScore.map((x) => x.ctx);
}

export function isSamgyeopsalRecommended(
  ctx: SpecialMealRowContext,
  rules: SpecialMealDestinationRules = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
): boolean {
  return getSamgyeopsalRecommendationRank(ctx, rules) !== null;
}

function inferShashlikRegion(
  ctx: SpecialMealRowContext,
  rules: SpecialMealDestinationRules,
): string | null {
  const text = getRowCombinedText(ctx).toLowerCase();
  for (const { keyword, regionLabel } of rules.shashlikRegionKeywordMap) {
    if (text.includes(keyword.toLowerCase())) {
      return regionLabel;
    }
  }
  return null;
}

function getShashlikLocationPriorityInRegion(region: string, rules: SpecialMealDestinationRules): string[] {
  const block = rules.shashlikPriorityByRegion.find((p) => p.regionLabel === region);
  return block?.orderedLocationKeywords ?? [];
}

export function getShashlikRecommendationRank(
  ctx: SpecialMealRowContext,
  rules: SpecialMealDestinationRules = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
): number | null {
  const region = inferShashlikRegion(ctx, rules);
  if (!region) {
    return null;
  }
  const priorityList = getShashlikLocationPriorityInRegion(region, rules);
  const text = getRowCombinedText(ctx).toLowerCase();
  const index = priorityList.findIndex((loc) => text.includes(loc.toLowerCase()));
  return index >= 0 ? index + 1 : null;
}

export function isShashlikRecommended(
  ctx: SpecialMealRowContext,
  rules: SpecialMealDestinationRules = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
): boolean {
  return getShashlikRecommendationRank(ctx, rules) !== null;
}

/** 삼겹살 검증 안내용 */
export function formatSamgyeopsalRecommendationHint(rules: SpecialMealDestinationRules): string {
  const flat = rules.samgyeopsalPriorityByRegion.flatMap((p) => p.orderedLocationKeywords);
  const unique = [...new Set(flat)];
  if (unique.length === 0) {
    return '설정된 추천지 없음';
  }
  const head = unique.slice(0, 6);
  const tail = unique.length > 6 ? ` 외 ${unique.length - 6}곳` : '';
  return head.join(', ') + tail;
}

/** 샤슬릭 검증·안내용 */
export function formatShashlikRecommendationHint(rules: SpecialMealDestinationRules): string {
  const flat = rules.shashlikPriorityByRegion.flatMap((p) => p.orderedLocationKeywords);
  const unique = [...new Set(flat)];
  if (unique.length === 0) {
    return '설정된 추천지 없음';
  }
  const head = unique.slice(0, 6);
  const tail = unique.length > 6 ? ` 외 ${unique.length - 6}곳` : '';
  return head.join(', ') + tail;
}

// --- mealCellText에 특식 배치 반영 ---

/** 한 row의 mealCellText에서 특정 slot 내용을 특식 이름으로 설정/해제 */
export function setSpecialMealInMealCellText(
  mealCellText: string,
  mealSlot: MealSlot,
  specialMeal: SpecialMealKind | null,
): string {
  const fields = parseMealCellText(mealCellText);
  const current = fields[mealSlot].trim();
  const nextContent = specialMeal ?? '';
  // 기존 값에 해당 특식만 들어있는 경우 치환, 아니면 덧붙이기/제거는 단순 치환으로
  let nextSlot = nextContent;
  if (!specialMeal && current) {
    // 제거: 해당 특식 이름만 제거
    nextSlot = current
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter((s) => s && !SPECIAL_MEAL_KINDS.some((k) => s.includes(k)))
      .join(', ');
  }
  const next: MealCellFields = { ...fields, [mealSlot]: nextSlot };
  return toMealCellText(next);
}

/** 배치 적용: 해당 dayIndex row의 mealSlot에 specialMeal 설정 */
export function applyAssignmentToPlanRows(
  rows: PlanRowForSpecialMeals[],
  assignment: SpecialMealAssignment,
): PlanRowForSpecialMeals[] {
  return rows.map((row, i) => {
    if (i !== assignment.dayIndex) return row;
    const next = setSpecialMealInMealCellText(
      row.mealCellText,
      assignment.mealSlot,
      assignment.specialMeal,
    );
    return { ...row, mealCellText: next };
  });
}

/** 특정 특식을 특정 (dayIndex, mealSlot)에 배치했을 때 전체 rows의 mealCellText 반영.
 * 기존 같은 특식 배치는 제거하고, 새 위치에만 넣음. */
export function setAssignmentInPlanRows(
  rows: PlanRowForSpecialMeals[],
  specialMeal: SpecialMealKind,
  dayIndex: number,
  mealSlot: MealSlot,
): PlanRowForSpecialMeals[] {
  // 1) 기존 해당 특식 배치 제거 (같은 특식이 다른 slot에 있으면 제거)
  let next = rows.map((row) => {
    const fields = parseMealCellText(row.mealCellText);
    const removeSpecial = (content: string) =>
      content
        .split(/[,/]/)
        .map((s) => s.trim())
        .filter((s) => s && !s.includes(specialMeal))
        .join(', ');
    return {
      ...row,
      mealCellText: toMealCellText({
        breakfast: removeSpecial(fields.breakfast),
        lunch: removeSpecial(fields.lunch),
        dinner: removeSpecial(fields.dinner),
      }),
    };
  });
  // 2) 목표 위치에 해당 특식 설정
  next = next.map((row, i) => {
    if (i !== dayIndex) return row;
    return {
      ...row,
      mealCellText: setSpecialMealInMealCellText(row.mealCellText, mealSlot, specialMeal),
    };
  });
  return next;
}

function containsSpecialMeal(value: string): boolean {
  return SPECIAL_MEAL_KINDS.some((specialMeal) => value.includes(specialMeal));
}

export function buildSpecialMealOriginalSlotValues(
  rows: PlanRowForSpecialMeals[],
): SpecialMealOriginalSlotValues {
  const result: SpecialMealOriginalSlotValues = {};
  rows.forEach((row, dayIndex) => {
    const fields = parseMealCellText(row.mealCellText);
    (MEAL_SLOTS as readonly MealSlot[]).forEach((mealSlot) => {
      const value = fields[mealSlot].trim();
      if (value && !containsSpecialMeal(value)) {
        result[getSpecialMealSlotKey(dayIndex, mealSlot)] = value;
      }
    });
  });
  return result;
}

export function applySpecialMealSelections(input: {
  rows: PlanRowForSpecialMeals[];
  selections: SpecialMealSelectionMap;
  originalSlotValues: SpecialMealOriginalSlotValues;
}): {
  rows: PlanRowForSpecialMeals[];
  originalSlotValues: SpecialMealOriginalSlotValues;
} {
  const nextOriginalSlotValues: SpecialMealOriginalSlotValues = { ...input.originalSlotValues };

  (SPECIAL_MEAL_KINDS as readonly SpecialMealKind[]).forEach((specialMeal) => {
    const selection = input.selections[specialMeal];
    if (!selection) {
      return;
    }
    const row = input.rows[selection.dayIndex];
    if (!row) {
      return;
    }
    const fields = parseMealCellText(row.mealCellText);
    const currentValue = fields[selection.mealSlot].trim();
    const key = getSpecialMealSlotKey(selection.dayIndex, selection.mealSlot);
    if (!(key in nextOriginalSlotValues) && !containsSpecialMeal(currentValue)) {
      nextOriginalSlotValues[key] = currentValue;
    }
  });

  let nextRows = input.rows.map((row, dayIndex) => {
    const fields = parseMealCellText(row.mealCellText);
    const restoredFields: MealCellFields = {
      breakfast: containsSpecialMeal(fields.breakfast)
        ? nextOriginalSlotValues[getSpecialMealSlotKey(dayIndex, 'breakfast')] ?? ''
        : fields.breakfast,
      lunch: containsSpecialMeal(fields.lunch)
        ? nextOriginalSlotValues[getSpecialMealSlotKey(dayIndex, 'lunch')] ?? ''
        : fields.lunch,
      dinner: containsSpecialMeal(fields.dinner)
        ? nextOriginalSlotValues[getSpecialMealSlotKey(dayIndex, 'dinner')] ?? ''
        : fields.dinner,
    };
    return {
      ...row,
      mealCellText: toMealCellText(restoredFields),
    };
  });

  (SPECIAL_MEAL_KINDS as readonly SpecialMealKind[]).forEach((specialMeal) => {
    const selection = input.selections[specialMeal];
    if (!selection) {
      return;
    }
    nextRows = setAssignmentInPlanRows(nextRows, specialMeal, selection.dayIndex, selection.mealSlot);
  });

  return {
    rows: nextRows,
    originalSlotValues: nextOriginalSlotValues,
  };
}
