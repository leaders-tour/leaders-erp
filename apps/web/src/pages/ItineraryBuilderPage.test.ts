import { describe, expect, it } from 'vitest';
import { applyLastDayAutoRowAdjustments } from './ItineraryBuilderPage';

describe('applyLastDayAutoRowAdjustments', () => {
  it('keeps the final-day correction above auto-filled segment overrides when no flight-specific override applies', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00',
          scheduleCellText: '출발 준비',
          lodgingCellText: '기본 숙소',
          mealCellText: '캠프식\n현지식당\n캠프식',
        },
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '09:30',
        flightOutTime: '17:30',
      },
    );

    expect(rows[0]).toMatchObject({
      timeCellText: '08:00',
      scheduleCellText: '출발 준비',
      lodgingCellText: '기본 숙소',
      mealCellText: '캠프식\n현지식당\n캠프식',
    });
    expect(rows[1]).toMatchObject({
      timeCellText: '09:00\n12:00',
      scheduleCellText: '사막 투어\n울란바토르 복귀',
      lodgingCellText: '숙소미포함',
      mealCellText: '아침 X\n점심 X\n저녁 X',
    });
  });

  it('replaces the last time with drop time for 18:00-21:00 flights', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00\n12:00\n18:00',
          scheduleCellText: '출발 준비\n중간 일정\n마지막 일정',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '16:30',
        flightOutTime: '18:30',
      },
    );

    expect(rows[0]).toMatchObject({
      timeCellText: '08:00\n12:00\n16:30',
      scheduleCellText: '출발 준비\n중간 일정\n마지막 일정',
      lodgingCellText: '숙소미포함',
      mealCellText: '아침 캠프식\n점심 현지식당\n저녁 X',
    });
  });

  it('replaces a trailing dash with drop time for 18:00-21:00 flights', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00\n12:00\n18:00\n-',
          scheduleCellText: '출발 준비\n중간 일정\n마지막 일정\n추가 일정',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '17:00',
        flightOutTime: '19:00',
      },
    );

    expect(rows[0]).toMatchObject({
      timeCellText: '08:00\n12:00\n18:00\n17:00',
      scheduleCellText: '출발 준비\n중간 일정\n마지막 일정\n추가 일정',
      lodgingCellText: '숙소미포함',
      mealCellText: '아침 캠프식\n점심 현지식당\n저녁 X',
    });
  });

  it('replaces the final-day row with airport departure copy for 08:00-11:30 flights', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '09:30',
        flightOutTime: '11:30',
      },
    );

    expect(rows[0]).toMatchObject({
      timeCellText: '08:30\n09:30',
      scheduleCellText: '공항출발\n공항 드랍 후 투어 종료',
      lodgingCellText: '숙소미포함',
      mealCellText: '아침 X\n점심 X\n저녁 X',
    });
  });

  it('replaces the final-day row with breakfast departure copy and camp breakfast for traveler camp stays', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00',
          scheduleCellText: '전일 일정',
          lodgingCellText: '여행자캠프\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n캠프식',
        },
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
      },
    );

    expect(rows[0]).toMatchObject({
      lodgingCellText: '여행자캠프\n전기 O\n샤워 제한\n인터넷 X',
      mealCellText: '캠프식\n현지식당\n캠프식',
    });
    expect(rows[1]).toMatchObject({
      timeCellText: '09:30\n10:30',
      scheduleCellText: '아침 식사 후 공항출발\n공항 드랍 후 투어 종료',
      lodgingCellText: '숙소미포함',
      mealCellText: '아침 캠프식\n점심 X\n저녁 X',
    });
  });

  it('uses camp breakfast for 13:00-14:00 flights when the previous lodging is LV4', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00',
          scheduleCellText: '전일 일정',
          lodgingCellText: 'LV4.디럭스 숙소',
          mealCellText: '캠프식\n현지식당\n캠프식',
        },
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
      },
    );

    expect(rows[1]).toMatchObject({
      mealCellText: '아침 캠프식\n점심 X\n저녁 X',
    });
  });

  it('uses hotel breakfast for 13:00-14:00 flights when the previous lodging is a city hotel', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00',
          scheduleCellText: '전일 일정',
          lodgingCellText: '도시호텔',
          mealCellText: '호텔조식\n현지식당\n현지식당',
        },
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
      },
    );

    expect(rows[1]).toMatchObject({
      mealCellText: '아침 호텔조식\n점심 X\n저녁 X',
    });
  });

  it('uses hotel breakfast for 13:00-14:00 flights when the previous lodging contains 호텔', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00',
          scheduleCellText: '전일 일정',
          lodgingCellText: '프리미엄 호텔',
          mealCellText: '호텔조식\n현지식당\n현지식당',
        },
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
      },
    );

    expect(rows[1]).toMatchObject({
      mealCellText: '아침 호텔조식\n점심 X\n저녁 X',
    });
  });

  it('keeps breakfast as X for 13:00-14:00 flights when there is no previous day lodging', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
      },
    );

    expect(rows[0]).toMatchObject({
      mealCellText: '아침 X\n점심 X\n저녁 X',
    });
  });

  it('keeps breakfast as X for 13:00-14:00 flights when the previous lodging does not match', () => {
    const rows = applyLastDayAutoRowAdjustments(
      [
        {
          timeCellText: '08:00',
          scheduleCellText: '전일 일정',
          lodgingCellText: '전통게르',
          mealCellText: '캠프식\n현지식당\n캠프식',
        },
        {
          timeCellText: '09:00\n12:00',
          scheduleCellText: '사막 투어\n울란바토르 복귀',
          lodgingCellText: '야간 도착 게르\n전기 O\n샤워 제한\n인터넷 X',
          mealCellText: '캠프식\n현지식당\n허르헉',
        },
      ],
      {
        travelEndDate: '2026-04-02',
        dropDate: '2026-04-02',
        dropTime: '10:30',
        flightOutTime: '13:00',
      },
    );

    expect(rows[1]).toMatchObject({
      mealCellText: '아침 X\n점심 X\n저녁 X',
    });
  });
});
