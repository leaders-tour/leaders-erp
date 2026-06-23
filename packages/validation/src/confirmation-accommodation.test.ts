import { describe, expect, it } from 'vitest';
import {
  consolidateConfirmationAccommodationEntries,
  consolidateFormattedConfirmationAccommodationLines,
  formatConfirmationAccommodationLine,
  lodgingSelectionLevelByDay,
  normalizeConfirmationAccommodationLine,
  resolveConfirmationAccommodationLevelTag,
  resolveConfirmationAccommodationName,
  splitConfirmationAccommodationDisplay,
} from './confirmation-accommodation';

describe('resolveConfirmationAccommodationLevelTag', () => {
  it('returns LV4 only when one of the sources is LV4', () => {
    expect(
      resolveConfirmationAccommodationLevelTag({
        lodgingType: 'ACCOMMODATION',
        optionLevel: 'LV3',
        planLodgingSelectionLevel: 'LV4',
      }),
    ).toBe('LV4');
    expect(
      resolveConfirmationAccommodationLevelTag({
        lodgingType: 'LV4',
      }),
    ).toBe('LV4');
    expect(
      resolveConfirmationAccommodationLevelTag({
        lodgingType: 'LV2',
        planLodgingSelectionLevel: 'LV3',
        optionLevel: 'LV3',
      }),
    ).toBeNull();
  });
});

describe('lodgingSelectionLevelByDay', () => {
  it('indexes plan lodging selections by day', () => {
    expect(
      lodgingSelectionLevelByDay([
        { dayIndex: 4, level: 'LV4' },
        { dayIndex: 6, level: 'LV4' },
      ]),
    ).toEqual(
      new Map([
        [4, 'LV4'],
        [6, 'LV4'],
      ]),
    );
  });
});

describe('resolveConfirmationAccommodationName', () => {
  it('prefers linked accommodation name over snapshot text', () => {
    expect(
      resolveConfirmationAccommodationName('khangai Resort - 창문 있는 게르×1', 'Khangai Resort'),
    ).toBe('Khangai Resort');
  });

  it('strips option summary suffix from snapshot text', () => {
    expect(
      resolveConfirmationAccommodationName('Toyoko Inn Ulaanbaatar - 호텔×3'),
    ).toBe('Toyoko Inn Ulaanbaatar');
  });
});

describe('normalizeConfirmationAccommodationLine', () => {
  it('cleans legacy snapshot suffix before capacity label', () => {
    expect(
      normalizeConfirmationAccommodationLine(
        'khangai Resort - 창문 있는 게르×1, 창문 있는 게르×1 3인실 1개',
      ),
    ).toBe('khangai Resort 3인실 1개');
  });
});

describe('splitConfirmationAccommodationDisplay', () => {
  it('splits name and room spec for stacked display', () => {
    expect(splitConfirmationAccommodationDisplay('CHIN CHANDMANI GER CAMP 4인실 1개')).toEqual({
      name: 'CHIN CHANDMANI GER CAMP',
      spec: '4인실 1개',
    });
    expect(splitConfirmationAccommodationDisplay('Govi urguu camp tsomtsog 4인실 2개 LV4')).toEqual({
      name: 'Govi urguu camp tsomtsog',
      spec: '4인실 2개 LV4',
    });
  });

  it('splits combined room specs for the same lodging', () => {
    expect(splitConfirmationAccommodationDisplay('고비 카라반세라이 롯지 4인실 1개 / 3인실 1개')).toEqual({
      name: '고비 카라반세라이 롯지',
      spec: '4인실 1개 / 3인실 1개',
    });
  });
});

describe('consolidateConfirmationAccommodationEntries', () => {
  it('groups room specs by lodging name within the same day', () => {
    expect(
      consolidateConfirmationAccommodationEntries([
        { name: '고비 카라반세라이 롯지', roomCount: 1, capacity: 4, dayIndex: 1 },
        { name: '고비 카라반세라이 롯지', roomCount: 1, capacity: 3, dayIndex: 1 },
        { name: '만달 미라클', roomCount: 2, capacity: 4, dayIndex: 2 },
        { name: '브라이', roomCount: 1, capacity: 4, dayIndex: 3 },
        { name: '브라이', roomCount: 1, capacity: 3, dayIndex: 3 },
      ]),
    ).toEqual([
      '고비 카라반세라이 롯지 4인실 1개 / 3인실 1개',
      '만달 미라클 4인실 2개',
      '브라이 4인실 1개 / 3인실 1개',
    ]);
  });

  it('keeps the same lodging on different days as separate lines', () => {
    expect(
      consolidateConfirmationAccommodationEntries([
        { name: 'CHIN CHANDMANI GER CAMP', roomCount: 1, capacity: 4, dayIndex: 3 },
        { name: 'CHIN CHANDMANI GER CAMP', roomCount: 1, capacity: 4, dayIndex: 4 },
        { name: 'khangai Resort', roomCount: 1, capacity: 3, dayIndex: 1 },
        { name: 'Hoyor Zagal Lodge', roomCount: 1, capacity: 4, dayIndex: 2 },
      ]),
    ).toEqual([
      'khangai Resort 3인실 1개',
      'Hoyor Zagal Lodge 4인실 1개',
      'CHIN CHANDMANI GER CAMP 4인실 1개',
      'CHIN CHANDMANI GER CAMP 4인실 1개',
    ]);
  });

  it('sums duplicate room specs before grouping by lodging name', () => {
    expect(
      consolidateConfirmationAccommodationEntries([
        { name: '만달 미라클', roomCount: 1, capacity: 4, dayIndex: 1 },
        { name: '만달 미라클', roomCount: 1, capacity: 4, dayIndex: 1 },
      ]),
    ).toEqual(['만달 미라클 4인실 2개']);
  });

  it('groups room specs by lodging name when dayIndex is omitted (legacy)', () => {
    expect(
      consolidateConfirmationAccommodationEntries([
        { name: '고비 카라반세라이 롯지', roomCount: 1, capacity: 4 },
        { name: '고비 카라반세라이 롯지', roomCount: 1, capacity: 3 },
        { name: '만달 미라클', roomCount: 2, capacity: 4 },
        { name: '브라이', roomCount: 1, capacity: 4 },
        { name: '브라이', roomCount: 1, capacity: 3 },
      ]),
    ).toEqual([
      '고비 카라반세라이 롯지 4인실 1개 / 3인실 1개',
      '만달 미라클 4인실 2개',
      '브라이 4인실 1개 / 3인실 1개',
    ]);
  });
});

describe('consolidateFormattedConfirmationAccommodationLines', () => {
  it('normalizes each line independently without merging across lines', () => {
    expect(
      consolidateFormattedConfirmationAccommodationLines([
        '고비 카라반세라이 롯지 4인실 1개',
        '고비 카라반세라이 롯지 3인실 1개',
        '만달 미라클 4인실 2개',
      ]),
    ).toEqual([
      '고비 카라반세라이 롯지 4인실 1개',
      '고비 카라반세라이 롯지 3인실 1개',
      '만달 미라클 4인실 2개',
    ]);
  });

  it('merges multiple room specs within a single line', () => {
    expect(
      consolidateFormattedConfirmationAccommodationLines([
        '고비 카라반세라이 롯지 4인실 1개 / 3인실 1개',
        'CHIN CHANDMANI GER CAMP 4인실 1개',
        'CHIN CHANDMANI GER CAMP 4인실 1개',
      ]),
    ).toEqual([
      '고비 카라반세라이 롯지 4인실 1개 / 3인실 1개',
      'CHIN CHANDMANI GER CAMP 4인실 1개',
      'CHIN CHANDMANI GER CAMP 4인실 1개',
    ]);
  });
});

describe('formatConfirmationAccommodationLine', () => {
  it('formats accommodation as name, capacity room, and room count', () => {
    expect(
      formatConfirmationAccommodationLine({
        name: 'Govi urguu camp',
        roomCount: 2,
        capacity: 3,
      }),
    ).toBe('Govi urguu camp 3인실 2개');
  });

  it('derives capacity label from room type when capacity is missing', () => {
    expect(
      formatConfirmationAccommodationLine({
        name: 'Bright govi',
        roomCount: 2,
        roomType: '3인실',
      }),
    ).toBe('Bright govi 3인실 2개');
  });

  it('falls back to room count only when capacity is unknown', () => {
    expect(
      formatConfirmationAccommodationLine({
        name: 'Guest house',
        roomCount: 1,
        roomType: 'Standard',
      }),
    ).toBe('Guest house 1개');
  });

  it('appends LV4 tag when provided', () => {
    expect(
      formatConfirmationAccommodationLine({
        name: 'Govi urguu camp tsomtsog',
        roomCount: 2,
        capacity: 4,
        levelTag: 'LV4',
      }),
    ).toBe('Govi urguu camp tsomtsog 4인실 2개 LV4');
  });
});
