import { describe, expect, it } from 'vitest';
import {
  formatCustomerTravelPeriod,
  getCustomerTravelSummary,
  getLatestPlanWithCurrentVersion,
} from './customerTravelSummary';
import type { UserRow } from './hooks';

function buildUser(plans: UserRow['plans']): Pick<UserRow, 'plans'> {
  return { plans };
}

describe('customerTravelSummary', () => {
  it('formatCustomerTravelPeriod는 고객 카드용 날짜 형식을 사용한다', () => {
    expect(formatCustomerTravelPeriod('2026-08-15', '2026-08-20')).toBe('2026.8.15~8.20 (5박6일)');
  });

  it('가장 최근 생성 플랜의 currentVersion을 사용한다', () => {
    const user = buildUser([
      {
        id: 'plan-new',
        currentVersion: {
          regionSetName: '고비',
          meta: {
            travelStartDate: '2026-08-01',
            travelEndDate: '2026-08-05',
          },
        },
      },
      {
        id: 'plan-old',
        currentVersion: {
          regionSetName: '울란바토르',
          meta: {
            travelStartDate: '2025-01-01',
            travelEndDate: '2025-01-03',
          },
        },
      },
    ]);

    expect(getLatestPlanWithCurrentVersion(user)?.id).toBe('plan-new');
    expect(getCustomerTravelSummary(user)).toEqual({
      destination: '고비',
      travelPeriod: '2026.8.1~8.5 (4박5일)',
    });
  });

  it('최신 플랜에 currentVersion이 없으면 요약을 반환하지 않는다', () => {
    const user = buildUser([
      {
        id: 'plan-empty',
        currentVersion: null,
      },
      {
        id: 'plan-old',
        currentVersion: {
          regionSetName: '울란바토르',
          meta: {
            travelStartDate: '2025-01-01',
            travelEndDate: '2025-01-03',
          },
        },
      },
    ]);

    expect(getLatestPlanWithCurrentVersion(user)?.id).toBe('plan-empty');
    expect(getCustomerTravelSummary(user)).toBeNull();
  });

  it('여행지나 날짜가 없으면 fallback을 사용한다', () => {
    const user = buildUser([
      {
        id: 'plan-partial',
        currentVersion: {
          regionSetName: null,
          meta: {
            travelStartDate: '2026-08-01',
            travelEndDate: '2026-08-05',
          },
        },
      },
    ]);

    expect(getCustomerTravelSummary(user)).toEqual({
      destination: '-',
      travelPeriod: '2026.8.1~8.5 (4박5일)',
    });
  });
});
