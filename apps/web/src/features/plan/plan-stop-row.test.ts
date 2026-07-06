import { describe, expect, it } from 'vitest';
import {
  buildMainPlanRowPhysicalIndexes,
  resolveMainPlanRowPhysicalIndex,
} from './plan-stop-row';

describe('buildMainPlanRowPhysicalIndexes', () => {
  it('returns consecutive indexes when plan rows are all MAIN', () => {
    const rows = [{ rowType: 'MAIN' as const }, { rowType: 'MAIN' as const }];
    expect(buildMainPlanRowPhysicalIndexes(rows)).toEqual([0, 1]);
  });

  it('skips EXTERNAL_TRANSFER rows when mapping main row ordinals', () => {
    const rows = [
      { rowType: 'EXTERNAL_TRANSFER' as const },
      { rowType: 'MAIN' as const },
      { rowType: 'MAIN' as const },
      { rowType: 'MAIN' as const },
      { rowType: 'MAIN' as const },
      { rowType: 'MAIN' as const },
      { rowType: 'EXTERNAL_TRANSFER' as const },
    ];

    expect(buildMainPlanRowPhysicalIndexes(rows)).toEqual([1, 2, 3, 4, 5]);
    expect(resolveMainPlanRowPhysicalIndex(rows, 3)).toBe(4);
  });
});
