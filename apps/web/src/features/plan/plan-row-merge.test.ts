import { describe, expect, it } from 'vitest';
import {
  buildRouteChangeConfirmMessage,
  getDirtyPlanRowFieldKey,
  getPlanRowSourceKey,
  getRouteChangeResetSummary,
  mergeAutoRowsWithDirtyValues,
} from './plan-row-merge';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    rowType: 'MAIN' as const,
    locationId: 'loc-1',
    locationVersionId: 'ver-1',
    dateCellText: '1일차',
    destinationCellText: '울란바토르',
    timeCellText: '09:00',
    scheduleCellText: '도착',
    lodgingCellText: '호텔',
    mealCellText: '아침 조식',
    lodgingSelectionLevel: 'LV3',
    customLodgingId: undefined,
    customLodgingNameSnapshot: null,
    movementIntensityColorOverride: null,
    ...overrides,
  };
}

describe('plan-row-merge', () => {
  it('preserves dirty fields by route source key even when row order changes', () => {
    const current = [
      makeRow({ locationId: 'loc-a', locationVersionId: 'ver-a', timeCellText: '수정 A' }),
      makeRow({ locationId: 'loc-b', locationVersionId: 'ver-b', timeCellText: '09:00' }),
    ];
    const autoRows = [
      makeRow({ locationId: 'loc-b', locationVersionId: 'ver-b', timeCellText: '10:00' }),
      makeRow({ locationId: 'loc-a', locationVersionId: 'ver-a', timeCellText: '08:00' }),
    ];
    const dirtyKeys = new Set([
      getDirtyPlanRowFieldKey(getPlanRowSourceKey(current[0]!), 'timeCellText'),
    ]);

    const merged = mergeAutoRowsWithDirtyValues(current, autoRows, dirtyKeys);

    expect(merged[0]?.timeCellText).toBe('10:00');
    expect(merged[1]?.timeCellText).toBe('수정 A');
  });

  it('resets dirty fields when route source disappears after destination change', () => {
    const current = [makeRow({ timeCellText: '수정된 시간' })];
    const autoRows = [
      makeRow({
        locationId: 'loc-2',
        locationVersionId: 'ver-2',
        timeCellText: '11:00',
      }),
    ];
    const dirtyKeys = new Set([
      getDirtyPlanRowFieldKey(getPlanRowSourceKey(current[0]!), 'timeCellText'),
    ]);

    const summary = getRouteChangeResetSummary(current, autoRows, dirtyKeys);

    expect(summary.affectedDayLabels).toEqual(['1일차']);
    expect(buildRouteChangeConfirmMessage(summary.affectedDayLabels)).toContain('1일차');

    const merged = mergeAutoRowsWithDirtyValues(current, autoRows, dirtyKeys);
    expect(merged[0]?.timeCellText).toBe('11:00');
  });

  it('does not warn when route reorder keeps all dirty sources', () => {
    const current = [
      makeRow({ locationId: 'loc-a', locationVersionId: 'ver-a', scheduleCellText: '수정 일정' }),
      makeRow({ locationId: 'loc-b', locationVersionId: 'ver-b' }),
    ];
    const autoRows = [
      makeRow({ locationId: 'loc-b', locationVersionId: 'ver-b' }),
      makeRow({ locationId: 'loc-a', locationVersionId: 'ver-a', scheduleCellText: '자동 일정' }),
    ];
    const dirtyKeys = new Set([
      getDirtyPlanRowFieldKey(getPlanRowSourceKey(current[0]!), 'scheduleCellText'),
    ]);

    const summary = getRouteChangeResetSummary(current, autoRows, dirtyKeys);

    expect(summary.affectedDayLabels).toEqual([]);
  });

  it('clears removed destination data when auto rows become placeholders', () => {
    const current = [
      makeRow({
        locationId: 'loc-old',
        locationVersionId: 'ver-old',
        scheduleCellText: '이전 일정',
        destinationCellText: '고비',
      }),
    ];
    const autoRows = [
      makeRow({
        locationId: null,
        locationVersionId: null,
        segmentId: null,
        scheduleCellText: '',
        destinationCellText: '',
        timeCellText: '',
        lodgingCellText: '',
        mealCellText: '',
      }),
    ];

    const merged = mergeAutoRowsWithDirtyValues(current, autoRows, new Set());

    expect(merged[0]?.scheduleCellText).toBe('');
    expect(merged[0]?.destinationCellText).toBe('');
  });
});
