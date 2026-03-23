/**
 * 특식 4종 규칙 기반 배치 모달.
 * 흐름: 특식 선택 -> 일차 선택 -> 식사 선택
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@tour/ui';
import {
  applySpecialMealSelections,
  buildSpecialMealOriginalSlotValues,
  getSamgyeopsalRecommendationRank,
  isShashlikRecommended,
  type MealSlot,
  type PlanRowForSpecialMeals,
  type SpecialMealOriginalSlotValues,
  type SpecialMealKind,
  type SpecialMealRowContext,
  MEAL_SLOTS,
  SPECIAL_MEAL_KINDS,
  getAssignmentsFromPlanRows,
  isShabushabuAllowed,
  mealSlotToLabel,
} from '../special-meals';

export interface SpecialMealsModalProps {
  open: boolean;
  rows: PlanRowForSpecialMeals[];
  onClose: () => void;
  onSave: (updatedRows: PlanRowForSpecialMeals[]) => void;
}

type SelectionValue = {
  dayIndex: number;
  mealSlot: MealSlot;
};

type SelectionMap = Record<SpecialMealKind, SelectionValue | null>;

const EMPTY_SELECTIONS: SelectionMap = {
  샤브샤브: null,
  삼겹살파티: null,
  허르헉: null,
  샤슬릭: null,
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

function buildInitialSelections(rows: PlanRowForSpecialMeals[]): SelectionMap {
  const next: SelectionMap = { ...EMPTY_SELECTIONS };
  const assignments = getAssignmentsFromPlanRows(rows);
  assignments.forEach((assignment) => {
    next[assignment.specialMeal] = {
      dayIndex: assignment.dayIndex,
      mealSlot: assignment.mealSlot,
    };
  });
  return next;
}

function getAllowedMealSlots(
  specialMeal: SpecialMealKind,
  row: PlanRowForSpecialMeals | undefined,
  dayIndex: number,
): MealSlot[] {
  if (!row) {
    return [];
  }

  if (specialMeal === '샤브샤브') {
    return (MEAL_SLOTS as readonly MealSlot[]).filter((slot) => isShabushabuAllowed(toRowContext(row, dayIndex, slot)));
  }

  return [...MEAL_SLOTS];
}

function getDefaultMealSlotForSpecialMeal(
  specialMeal: SpecialMealKind,
  allowedSlots: MealSlot[],
): MealSlot {
  if ((specialMeal === '삼겹살파티' || specialMeal === '허르헉') && allowedSlots.includes('dinner')) {
    return 'dinner';
  }
  if (specialMeal === '샤브샤브' && allowedSlots.includes('dinner')) {
    return 'dinner';
  }
  if (specialMeal === '샤슬릭' && allowedSlots.includes('lunch')) {
    return 'lunch';
  }
  return allowedSlots[0] ?? 'breakfast';
}

export function SpecialMealsModal({
  open,
  rows,
  onClose,
  onSave,
}: SpecialMealsModalProps): JSX.Element | null {
  const [draftSelections, setDraftSelections] = useState<SelectionMap>(EMPTY_SELECTIONS);
  const [activeMeal, setActiveMeal] = useState<SpecialMealKind>('샤브샤브');
  const [originalSlotValues, setOriginalSlotValues] = useState<SpecialMealOriginalSlotValues>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraftSelections(buildInitialSelections(rows));
    setOriginalSlotValues((prev) => ({
      ...buildSpecialMealOriginalSlotValues(rows),
      ...prev,
    }));
    setActiveMeal('샤브샤브');
  }, [open, rows]);

  const activeSelection = draftSelections[activeMeal];
  const selectedDayIndex = activeSelection?.dayIndex ?? null;
  const selectedDayRow = selectedDayIndex !== null ? rows[selectedDayIndex] : undefined;
  const allowedSlotsForSelectedDay =
    selectedDayIndex !== null ? getAllowedMealSlots(activeMeal, selectedDayRow, selectedDayIndex) : [];

  const dayOptions = useMemo(
    () =>
      rows.map((row, dayIndex) => {
        const allowedSlots = getAllowedMealSlots(activeMeal, row, dayIndex);
        const rowContext = toRowContext(row, dayIndex, 'dinner');
        const recommendationRank =
          activeMeal === '삼겹살파티' ? getSamgyeopsalRecommendationRank(rowContext) : null;
        const isRecommended =
          activeMeal === '삼겹살파티'
            ? recommendationRank !== null
            : activeMeal === '샤슬릭'
              ? isShashlikRecommended(rowContext)
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
    [activeMeal, rows],
  );

  const isCurrentSelectionInvalid =
    activeSelection !== null &&
    !getAllowedMealSlots(activeMeal, rows[activeSelection.dayIndex], activeSelection.dayIndex).includes(activeSelection.mealSlot);

  const handleSelectDay = (dayIndex: number): void => {
    const allowedSlots = getAllowedMealSlots(activeMeal, rows[dayIndex], dayIndex);
    if (allowedSlots.length === 0) {
      return;
    }
    setDraftSelections((prev) => ({
      ...prev,
      [activeMeal]: {
        dayIndex,
        mealSlot:
          prev[activeMeal]?.dayIndex === dayIndex && prev[activeMeal] && allowedSlots.includes(prev[activeMeal].mealSlot)
            ? prev[activeMeal].mealSlot
            : getDefaultMealSlotForSpecialMeal(activeMeal, allowedSlots),
      },
    }));
  };

  const handleSelectMealSlot = (mealSlot: MealSlot): void => {
    if (selectedDayIndex === null) {
      return;
    }
    const allowedSlots = getAllowedMealSlots(activeMeal, rows[selectedDayIndex], selectedDayIndex);
    if (!allowedSlots.includes(mealSlot)) {
      return;
    }
    setDraftSelections((prev) => ({
      ...prev,
      [activeMeal]: {
        dayIndex: selectedDayIndex,
        mealSlot,
      },
    }));
  };

  const handleClearActiveMeal = (): void => {
    setDraftSelections((prev) => ({
      ...prev,
      [activeMeal]: null,
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
                <p className="mt-1 text-sm text-slate-600">특식 선택, 일차 선택, 식사 선택 순서로 배치합니다.</p>
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
                      const selection = draftSelections[specialMeal];
                      const isActive = specialMeal === activeMeal;
                      return (
                        <button
                          key={specialMeal}
                          type="button"
                          onClick={() => setActiveMeal(specialMeal)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-medium">{specialMeal}</div>
                          <div className={`mt-1 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                            {selection
                              ? `${selection.dayIndex + 1}일차 ${mealSlotToLabel(selection.mealSlot)}`
                              : '미배치'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {activeMeal === '샤브샤브'
                      ? '샤브샤브는 울란바토르 지정이 있는 일차에서 아침·점심·저녁 중 선택할 수 있습니다.'
                      : null}
                    {activeMeal === '삼겹살파티' ? '삼겹살파티는 추천 목적지를 우선 표시합니다.' : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-500">2. {activeMeal} 일차 선택</div>
                    <Button variant="outline" onClick={handleClearActiveMeal}>
                      현재 특식 해제
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {dayOptions.map((option) => {
                      const isSelected = activeSelection?.dayIndex === option.dayIndex;
                      return (
                        <button
                          key={`${activeMeal}-day-${option.dayIndex}`}
                          type="button"
                          disabled={!option.isSelectable}
                          onClick={() => handleSelectDay(option.dayIndex)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
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
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500">3. 식사 선택</div>
                  {selectedDayIndex === null ? (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                      먼저 일차를 선택해 주세요.
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        {selectedDayIndex + 1}일차 · {getDestinationLabel(selectedDayRow?.destinationCellText)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(MEAL_SLOTS as readonly MealSlot[]).map((mealSlot) => {
                          const enabled = allowedSlotsForSelectedDay.includes(mealSlot);
                          const isSelected = activeSelection?.mealSlot === mealSlot;
                          return (
                            <button
                              key={`${activeMeal}-${mealSlot}`}
                              type="button"
                              disabled={!enabled}
                              onClick={() => handleSelectMealSlot(mealSlot)}
                              className={`rounded-xl border px-3 py-2 text-sm transition ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              } ${!enabled ? 'cursor-not-allowed opacity-40' : ''}`}
                            >
                              {mealSlotToLabel(mealSlot)}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {isCurrentSelectionInvalid ? (
                  <p className="text-xs text-rose-600">현재 선택은 규칙에 맞지 않습니다. 일차 또는 식사를 다시 선택해 주세요.</p>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={onClose}>
                    취소
                  </Button>
                  <Button onClick={handleSave} disabled={isCurrentSelectionInvalid}>
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
