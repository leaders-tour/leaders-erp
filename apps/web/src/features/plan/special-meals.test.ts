import { describe, expect, it } from 'vitest';
import { applySpecialMealSelections, parseMealCellText } from './special-meals';

describe('applySpecialMealSelections', () => {
  it('같은 특식을 서로 다른 일차·끼니에 둘 다 남긴다', () => {
    const rows = [
      { mealCellText: '점심 캠프식\n저녁 캠프식', destinationCellText: 'A' },
      { mealCellText: '점심 캠프식\n저녁 캠프식', destinationCellText: 'B' },
    ];
    const applied = applySpecialMealSelections({
      rows,
      selections: {
        샤브샤브: [
          { dayIndex: 0, mealSlot: 'lunch' },
          { dayIndex: 1, mealSlot: 'dinner' },
        ],
        삼겹살파티: [],
        허르헉: [],
        샤슬릭: [],
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
});
