import { describe, expect, it } from 'vitest';
import {
  applySpecialMealSelections,
  createEmptySpecialMealSelectionMap,
  getAssignmentsFromPlanRows,
  parseMealCellText,
  usesSamgyeopsalDestinationRules,
} from './special-meals';

describe('applySpecialMealSelections', () => {
  it('같은 특식을 서로 다른 일차·끼니에 둘 다 남긴다', () => {
    const rows = [
      { mealCellText: '점심 캠프식\n저녁 캠프식', destinationCellText: 'A' },
      { mealCellText: '점심 캠프식\n저녁 캠프식', destinationCellText: 'B' },
    ];
    const applied = applySpecialMealSelections({
      rows,
      selections: {
        ...createEmptySpecialMealSelectionMap(),
        샤브샤브: [
          { dayIndex: 0, mealSlot: 'lunch' },
          { dayIndex: 1, mealSlot: 'dinner' },
        ],
      },
      originalSlotValues: {},
    });
    const r0 = applied.rows[0];
    const r1 = applied.rows[1];
    expect(r0).toBeDefined();
    expect(r1).toBeDefined();
    const d0 = parseMealCellText(r0!.mealCellText);
    const d1 = parseMealCellText(r1!.mealCellText);
    expect(d0.lunch).toContain('샤브샤브');
    expect(d1.dinner).toContain('샤브샤브');
  });

  it('삼겹살 뷔페를 mealCellText에 반영한다', () => {
    const rows = [{ mealCellText: '저녁 캠프식', destinationCellText: 'A' }];
    const applied = applySpecialMealSelections({
      rows,
      selections: {
        ...createEmptySpecialMealSelectionMap(),
        '삼겹살 뷔페': [{ dayIndex: 0, mealSlot: 'dinner' }],
      },
      originalSlotValues: {},
    });
    expect(parseMealCellText(applied.rows[0]!.mealCellText).dinner).toBe('삼겹살 뷔페');
  });
});

describe('getAssignmentsFromPlanRows', () => {
  it('삼겹살 뷔페와 삼겹살파티를 구분해 역산한다', () => {
    const rows = [
      { mealCellText: '저녁 삼겹살 뷔페' },
      { mealCellText: '저녁 삼겹살파티' },
    ];
    const assignments = getAssignmentsFromPlanRows(rows);
    expect(assignments).toEqual([
      { specialMeal: '삼겹살 뷔페', dayIndex: 0, mealSlot: 'dinner' },
      { specialMeal: '삼겹살파티', dayIndex: 1, mealSlot: 'dinner' },
    ]);
  });
});

describe('usesSamgyeopsalDestinationRules', () => {
  it('삼겹살파티·삼겹살 뷔페만 true를 반환한다', () => {
    expect(usesSamgyeopsalDestinationRules('삼겹살파티')).toBe(true);
    expect(usesSamgyeopsalDestinationRules('삼겹살 뷔페')).toBe(true);
    expect(usesSamgyeopsalDestinationRules('샤브샤브')).toBe(false);
  });
});
