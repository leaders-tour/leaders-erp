import { describe, expect, it } from 'vitest';
import { applyLastDayAutoRowAdjustments } from './ItineraryBuilderPage';

describe('applyLastDayAutoRowAdjustments', () => {
  it('keeps the final-day correction above auto-filled segment overrides', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          lodgingCellText: '기본 숙소',
          mealCellText: '캠프식\n현지식당\n캠프식',
        },
        {
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '09:30',
      },
    );

    expect(rows[0]).toMatchObject({
      lodgingCellText: '기본 숙소',
      mealCellText: '캠프식\n현지식당\n캠프식',
    });
    expect(rows[1]).toMatchObject({
      lodgingCellText: '숙소미포함',
      mealCellText: '아침 X\n점심 X\n저녁 X',
    });
  });
});
