import { describe, expect, it } from 'vitest';
import { fromVersion } from '../adapters';
import type { PlanVersionDetail } from '../../plan/hooks';

describe('usePreviousVersionEstimatePreview helpers', () => {
  it('fromVersion produces read-only estimate document from saved version', () => {
    const data = fromVersion({
      id: 'version-1',
      planId: 'plan-1',
      regionSetId: 'region-set-1',
      parentVersionId: null,
      versionNumber: 2,
      variantType: 'BASIC',
      totalDays: 5,
      changeNote: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      plan: { title: '테스트 플랜', regionSet: { name: '북부' } },
      regionSet: { name: '북부' },
      meta: {
        leaderName: '홍길동',
        headcountTotal: 6,
        headcountMale: 3,
        headcountFemale: 3,
        transportGroups: [],
        externalTransfers: [],
        events: [],
      },
      planStops: [
        {
          rowType: 'MAIN',
          dateCellText: '1일차',
          destinationCellText: '울란바토르',
          timeCellText: '',
          scheduleCellText: '',
          lodgingCellText: '',
          mealCellText: '',
        },
      ],
      movementIntensity: null,
      pricing: null,
    } as unknown as PlanVersionDetail);

    expect(data.mode).toBe('version');
    expect(data.isDraft).toBe(false);
    expect(data.planTitle).toBe('테스트 플랜');
    expect(data.planStops).toHaveLength(1);
  });
});
