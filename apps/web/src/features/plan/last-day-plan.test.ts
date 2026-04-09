import { describe, expect, it } from 'vitest';
import { adjustLastDayMealCellText, getRequiredXMealsForLastDay } from './last-day-plan';

describe('getRequiredXMealsForLastDay', () => {
  it('excludes breakfast from required X meals for 13:00-14:00 flights when the previous lodging is traveler camp', () => {
    expect(
      getRequiredXMealsForLastDay({
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
        previousLodgingCellText: '여행자캠프\n전기 O\n샤워 제한\n인터넷 X',
      }),
    ).toEqual(['lunch', 'dinner']);
  });

  it('excludes breakfast from required X meals for 13:00-14:00 flights when the previous lodging is hotel based', () => {
    expect(
      getRequiredXMealsForLastDay({
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
        previousLodgingCellText: '도시호텔',
      }),
    ).toEqual(['lunch', 'dinner']);
  });

  it('keeps breakfast in required X meals when there is no matching previous lodging', () => {
    expect(
      getRequiredXMealsForLastDay({
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
        previousLodgingCellText: '전통게르',
      }),
    ).toEqual(['breakfast', 'lunch', 'dinner']);
  });
});

describe('adjustLastDayMealCellText', () => {
  it('applies camp breakfast override while keeping lunch and dinner as X', () => {
    expect(
      adjustLastDayMealCellText('캠프식\n현지식당\n허르헉', {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
        previousLodgingCellText: 'LV4.디럭스 숙소',
      }),
    ).toBe('아침 캠프식\n점심 X\n저녁 X');
  });

  it('applies hotel breakfast override while keeping lunch and dinner as X', () => {
    expect(
      adjustLastDayMealCellText('캠프식\n현지식당\n허르헉', {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
        previousLodgingCellText: '프리미엄 호텔',
      }),
    ).toBe('아침 호텔조식\n점심 X\n저녁 X');
  });

  it('keeps breakfast as X when the previous lodging does not match', () => {
    expect(
      adjustLastDayMealCellText('캠프식\n현지식당\n허르헉', {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
        previousLodgingCellText: '전통게르',
      }),
    ).toBe('아침 X\n점심 X\n저녁 X');
  });
});
