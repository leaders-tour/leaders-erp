/**
 * 특식 4종 규칙 기반 배치 모달.
 * 흐름: 특식 선택 -> 일차 선택(선택 일차 아래 아침·점심·저녁) -> 배치 요약
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from '@tour/ui';
import {
  applySpecialMealSelections,
  buildSpecialMealOriginalSlotValues,
  DEFAULT_SPECIAL_MEAL_DESTINATION_RULES,
  getSamgyeopsalRecommendationRank,
  getShashlikRecommendationRank,
  type MealSlot,
  type PlanRowForSpecialMeals,
  type SpecialMealDestinationRules,
  type SpecialMealOriginalSlotValues,
  type SpecialMealKind,
  type SpecialMealSelectionMap,
  type SpecialMealSelectionValue,
  type SpecialMealRowContext,
  MEAL_SLOTS,
  SPECIAL_MEAL_KINDS,
  getAssignmentsFromPlanRows,
  mealSlotToLabel,
} from '../special-meals';

export interface SpecialMealsModalProps {
  open: boolean;
  rows: PlanRowForSpecialMeals[];
  onClose: () => void;
  onSave: (updatedRows: PlanRowForSpecialMeals[]) => void;
  specialMealDestinationRules?: SpecialMealDestinationRules;
}

const EMPTY_SELECTIONS: SpecialMealSelectionMap = {
  샤브샤브: [],
  삼겹살파티: [],
  허르헉: [],
  샤슬릭: [],
};

function getDestinationLabel(value: string | null | undefined): string {
  const lines = (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] ?? '목적지 미입력';
}

function toRowContext(row: PlanRowForSpecialMeals, dayIndex: number, mealSlot: MealSlot): SpecialMealRowContext {
  return {
    dayIndex,
    mealSlot,
    destinationCellText: row.destinationCellText,
    scheduleCellText: row.scheduleCellText,
  };
}

function buildInitialSelections(rows: PlanRowForSpecialMeals[]): SpecialMealSelectionMap {
  const next: SpecialMealSelectionMap = {
    샤브샤브: [],
    삼겹살파티: [],
    허르헉: [],
    샤슬릭: [],
  };
  const assignments = getAssignmentsFromPlanRows(rows);
  for (const assignment of assignments) {
    next[assignment.specialMeal].push({
      dayIndex: assignment.dayIndex,
      mealSlot: assignment.mealSlot,
    });
  }
  return next;
}

function uniqueSortedDayIndices(placements: SpecialMealSelectionValue[]): number[] {
  return [...new Set(placements.map((p) => p.dayIndex))].sort((a, b) => a - b);
}

function formatMealPlacementsSummary(list: SpecialMealSelectionValue[]): string {
  if (list.length === 0) {
    return '미배치';
  }
  return list.map((p) => `${p.dayIndex + 1}일차 ${mealSlotToLabel(p.mealSlot)}`).join(', ');
}

function getAllowedMealSlots(
  _specialMeal: SpecialMealKind,
  row: PlanRowForSpecialMeals | undefined,
  _dayIndex: number,
  _rules: SpecialMealDestinationRules,
): MealSlot[] {
  if (!row) {
    return [];
  }

  return [...MEAL_SLOTS];
}

export function SpecialMealsModal({
  open,
  rows,
  onClose,
  onSave,
  specialMealDestinationRules: rulesProp,
}: SpecialMealsModalProps): JSX.Element | null {
  const specialMealDestinationRules = rulesProp ?? DEFAULT_SPECIAL_MEAL_DESTINATION_RULES;

  const [draftSelections, setDraftSelections] = useState<SpecialMealSelectionMap>(EMPTY_SELECTIONS);
  const [activeMeal, setActiveMeal] = useState<SpecialMealKind>('샤브샤브');
  const [selectedDayIndices, setSelectedDayIndices] = useState<number[]>([]);
  const [originalSlotValues, setOriginalSlotValues] = useState<SpecialMealOriginalSlotValues>({});
  const hasInitializedOpenSessionRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasInitializedOpenSessionRef.current = false;
      return;
    }
    if (hasInitializedOpenSessionRef.current) {
      return;
    }
    hasInitializedOpenSessionRef.current = true;
    const initial = buildInitialSelections(rows);
    setDraftSelections(initial);
    setOriginalSlotValues((prev) => ({
      ...buildSpecialMealOriginalSlotValues(rows),
      ...prev,
    }));
    setActiveMeal('샤브샤브');
    setSelectedDayIndices(uniqueSortedDayIndices(initial.샤브샤브));
  }, [open, rows]);

  const dayOptions = useMemo(
    () =>
      rows.map((row, dayIndex) => {
        const allowedSlots = getAllowedMealSlots(activeMeal, row, dayIndex, specialMealDestinationRules);
        const rowContext = toRowContext(row, dayIndex, 'dinner');
        const recommendationRank =
          activeMeal === '삼겹살파티'
            ? getSamgyeopsalRecommendationRank(rowContext, specialMealDestinationRules)
            : activeMeal === '샤슬릭'
              ? getShashlikRecommendationRank(rowContext, specialMealDestinationRules)
              : null;
        const isRecommended =
          activeMeal === '삼겹살파티' || activeMeal === '샤슬릭'
            ? recommendationRank !== null
            : false;
        return {
          dayIndex,
          destinationLabel: getDestinationLabel(row.destinationCellText),
          allowedSlots,
          isSelectable: allowedSlots.length > 0,
          recommendationRank,
          isRecommended,
        };
      }),
    [activeMeal, rows, specialMealDestinationRules],
  );

  const handleActivateMeal = (meal: SpecialMealKind): void => {
    setActiveMeal(meal);
    setSelectedDayIndices(uniqueSortedDayIndices(draftSelections[meal]));
  };

  const toggleDay = (dayIndex: number): void => {
    const allowedSlots = getAllowedMealSlots(activeMeal, rows[dayIndex], dayIndex, specialMealDestinationRules);
    if (allowedSlots.length === 0) {
      return;
    }
    setSelectedDayIndices((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  /** 해당 일차만 현재 특식 + 끼니로 갱신(같은 일차의 기존 해당 특식 배치는 덮어씀). */
  const handleSelectMealForDay = (dayIndex: number, mealSlot: MealSlot): void => {
    const row = rows[dayIndex];
    if (!row) {
      return;
    }
    const allowed = getAllowedMealSlots(activeMeal, row, dayIndex, specialMealDestinationRules);
    if (!allowed.includes(mealSlot)) {
      return;
    }
    setDraftSelections((prev) => {
      const kept = prev[activeMeal].filter((p) => p.dayIndex !== dayIndex);
      return {
        ...prev,
        [activeMeal]: [...kept, { dayIndex, mealSlot }],
      };
    });
  };

  const handleClearActiveMeal = (): void => {
    setDraftSelections((prev) => ({
      ...prev,
      [activeMeal]: [],
    }));
    setSelectedDayIndices([]);
  };

  const removePlacement = (meal: SpecialMealKind, index: number): void => {
    setDraftSelections((prev) => ({
      ...prev,
      [meal]: prev[meal].filter((_, i) => i !== index),
    }));
  };

  const handleSave = (): void => {
    const applied = applySpecialMealSelections({
      rows,
      selections: draftSelections,
      originalSlotValues,
    });
    setOriginalSlotValues(applied.originalSlotValues);
    onSave(applied.rows);
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-4xl">
          <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">특식 4종 배치</h2>
                <p className="mt-1 text-sm text-slate-600">
                  특식 선택 → 일차 선택(일차 아래 끼니 지정) 후 요약을 확인하세요.
                </p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center text-sm text-slate-500">
                먼저 일차를 채운 뒤 특식 배치를 설정해 주세요.
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500">1. 특식 선택</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(SPECIAL_MEAL_KINDS as readonly SpecialMealKind[]).map((specialMeal) => {
                      const list = draftSelections[specialMeal];
                      const isActive = specialMeal === activeMeal;
                      return (
                        <button
                          key={specialMeal}
                          type="button"
                          onClick={() => handleActivateMeal(specialMeal)}
                          className={`max-w-[220px] rounded-xl border px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-medium">{specialMeal}</div>
                          <div
                            className={`mt-1 whitespace-pre-wrap break-words text-xs ${
                              isActive ? 'text-slate-200' : 'text-slate-500'
                            }`}
                          >
                            {formatMealPlacementsSummary(list)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {activeMeal === '삼겹살파티' ? '삼겹살파티는 추천 목적지를 우선 표시합니다.' : null}
                    {activeMeal === '샤슬릭' ? '샤슬릭은 설정한 키워드·지역별 추천 순서를 반영합니다.' : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-500">2. {activeMeal} 일차 선택</div>
                    <Button variant="outline" onClick={handleClearActiveMeal}>
                      현재 특식 해제
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    일차를 선택하면 카드 바로 아래에 <span className="font-medium text-slate-600">아침·점심·저녁</span>이
                    펼쳐집니다. 끼니를 누르면 그 일차만 배치됩니다.
                  </p>
                  <div className="mt-3 flex flex-col gap-3">
                    {dayOptions.map((option) => {
                      const isSelected = selectedDayIndices.includes(option.dayIndex);
                      const placementForDay = draftSelections[activeMeal].find((p) => p.dayIndex === option.dayIndex);
                      return (
                        <div key={`${activeMeal}-day-block-${option.dayIndex}`} className="min-w-0">
                          <button
                            type="button"
                            disabled={!option.isSelectable}
                            aria-pressed={isSelected}
                            aria-expanded={isSelected}
                            onClick={() => toggleDay(option.dayIndex)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : option.isRecommended
                                  ? 'border-emerald-300 bg-emerald-50 text-slate-900 hover:bg-emerald-100'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            } ${!option.isSelectable ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <div className="text-sm font-medium">{option.dayIndex + 1}일차</div>
                            <div className={`mt-1 text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                              {option.destinationLabel}
                            </div>
                            {option.recommendationRank !== null ? (
                              <div className={`mt-2 text-[11px] ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                                추천 {option.recommendationRank}순위
                              </div>
                            ) : option.isRecommended ? (
                              <div className={`mt-2 text-[11px] ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                                추천 목적지
                              </div>
                            ) : null}
                          </button>
                          {isSelected ? (
                            <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                              <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {option.dayIndex + 1}일차 선택
                              </div>
                              <div className="flex flex-wrap items-center gap-x-0 gap-y-2">
                                {(MEAL_SLOTS as readonly MealSlot[]).map((mealSlot, slotIdx) => {
                                  const allowed = option.allowedSlots.includes(mealSlot);
                                  const picked = placementForDay?.mealSlot === mealSlot;
                                  return (
                                    <Fragment key={`${activeMeal}-d${option.dayIndex}-${mealSlot}`}>
                                      {slotIdx > 0 ? (
                                        <span className="mx-2 select-none text-slate-300" aria-hidden="true">
                                          |
                                        </span>
                                      ) : null}
                                      <button
                                        type="button"
                                        disabled={!allowed}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectMealForDay(option.dayIndex, mealSlot);
                                        }}
                                        className={`min-w-[3.25rem] rounded-lg border px-3 py-2 text-center text-sm transition ${
                                          picked
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                                        } ${!allowed ? 'cursor-not-allowed opacity-40' : ''}`}
                                      >
                                        {mealSlotToLabel(mealSlot)}
                                      </button>
                                    </Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500">3. 배치 요약</div>
                  <p className="mt-1 text-xs text-slate-500">
                    저장 전 현재까지 설정한 특식 배치입니다. 항목 옆 삭제로 한 건만 제거할 수 있습니다.
                  </p>
                  <ul className="mt-3 grid gap-3 text-sm">
                    {(SPECIAL_MEAL_KINDS as readonly SpecialMealKind[]).map((specialMeal) => (
                      <li key={`summary-${specialMeal}`} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="font-medium text-slate-800">{specialMeal}</div>
                        {draftSelections[specialMeal].length === 0 ? (
                          <p className="mt-1 text-xs text-slate-500">미배치</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {draftSelections[specialMeal].map((p, idx) => (
                              <li
                                key={`${specialMeal}-${p.dayIndex}-${p.mealSlot}-${idx}`}
                                className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700"
                              >
                                <span>
                                  {p.dayIndex + 1}일차 {mealSlotToLabel(p.mealSlot)} ·{' '}
                                  {getDestinationLabel(rows[p.dayIndex]?.destinationCellText)}
                                </span>
                                <button
                                  type="button"
                                  className="shrink-0 rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                                  onClick={() => removePlacement(specialMeal, idx)}
                                >
                                  삭제
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={onClose}>
                    취소
                  </Button>
                  <Button onClick={handleSave}>
                    저장
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
