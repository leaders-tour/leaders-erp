import { describe, expect, it } from 'vitest';
import { MealOption } from '../../generated/graphql';
import {
  parseMultiDayBlockLodgingMealsDraft,
  serializeMultiDayBlockLodgingCellText,
  serializeMultiDayBlockMealCellText,
} from './lodging-meal-form';

describe('multi-day-block lodging/meal form helpers', () => {
  it('parses existing multiline lodging and meal text into structured draft values', () => {
    const draft = parseMultiDayBlockLodgingMealsDraft({
      lodgingCellText: '사막 캠프\n전기 제한\n샤워 X\n인터넷 O',
      mealCellText: '호텔조식\n현지식\n허르헉',
    });

    expect(draft).toMatchObject({
      lodging: {
        isUnspecified: false,
        name: '사막 캠프',
        hasElectricity: 'LIMITED',
        hasShower: 'NO',
        hasInternet: 'YES',
      },
      meals: {
        breakfast: MealOption.HotelBreakfast,
        lunch: MealOption.LocalMeal,
        dinner: MealOption.Horhog,
      },
    });
  });

  it('serializes structured selections back to legacy cell text format', () => {
    expect(
      serializeMultiDayBlockLodgingCellText({
        isUnspecified: false,
        name: '테를지 게르',
        hasElectricity: 'YES',
        hasShower: 'LIMITED',
        hasInternet: 'NO',
      }),
    ).toBe('테를지 게르\n전기 O\n샤워 제한\n인터넷 X');

    expect(
      serializeMultiDayBlockMealCellText({
        breakfast: MealOption.HotelBreakfast,
        lunch: null,
        dinner: MealOption.Shashlik,
      }),
    ).toBe('호텔조식\nX\n샤슬릭');
  });

  it('keeps lodging and meals empty when the user leaves all fields blank', () => {
    expect(
      serializeMultiDayBlockLodgingCellText({
        isUnspecified: false,
        name: '',
        hasElectricity: 'YES',
        hasShower: 'YES',
        hasInternet: 'YES',
      }),
    ).toBe('');

    expect(
      serializeMultiDayBlockMealCellText({
        breakfast: null,
        lunch: null,
        dinner: null,
      }),
    ).toBe('');
  });
});
