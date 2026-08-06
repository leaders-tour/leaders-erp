import { describe, expect, it } from 'vitest';
import {
  formatTravelStartDday,
  getCustomerConfirmationCardMeta,
} from './customerConfirmationCardMeta';
import type { UserRow } from './hooks';

function buildUser(
  confirmedTrips: UserRow['confirmedTrips'],
  plans: UserRow['plans'] = [],
): Pick<UserRow, 'confirmedTrips' | 'plans'> {
  return { confirmedTrips, plans };
}

function buildPlan(travelStartDate: string | null): NonNullable<UserRow['plans']>[number] {
  return {
    id: 'plan-1',
    currentVersion: {
      id: 'ver-1',
      regionSetName: '고비',
      meta: {
        travelStartDate: travelStartDate ?? undefined,
        travelEndDate: travelStartDate ?? undefined,
      },
    },
  };
}

describe('formatTravelStartDday', () => {
  const today = new Date('2026-08-10T12:00:00');

  it('출발 당일은 D-Day', () => {
    expect(formatTravelStartDday('2026-08-10', today)).toBe('D-Day');
  });

  it('출발 전이면 D-N', () => {
    expect(formatTravelStartDday('2026-08-15', today)).toBe('D-5');
  });

  it('출발 후면 D+N', () => {
    expect(formatTravelStartDday('2026-08-08', today)).toBe('D+2');
  });

  it('날짜가 없으면 null', () => {
    expect(formatTravelStartDday(null, today)).toBeNull();
  });
});

describe('getCustomerConfirmationCardMeta', () => {
  const today = new Date('2026-08-10T09:00:00');

  it('발행 확정서가 있으면 있음으로 표시한다', () => {
    const user = buildUser(
      [
        {
          id: 'trip-1',
          status: 'ACTIVE',
          travelStart: null,
          travelEnd: null,
          destination: '고비',
          pickupDate: null,
          dropDate: null,
          latestPublishedConfirmationDocument: {
            id: 'doc-1',
            versionNumber: 1,
            status: 'PUBLISHED',
            publishedAt: '2026-08-01T00:00:00.000Z',
          },
          guideAssignments: [],
          driverAssignments: [],
          lodgings: [],
        },
      ],
      [buildPlan('2026-08-15')],
    );

    expect(getCustomerConfirmationCardMeta(user, today)).toEqual({
      hasConfirmationDocument: true,
      ddayLabel: 'D-5',
      travelStart: '2026-08-15',
    });
  });

  it('발행 확정서가 없으면 없음으로 표시한다', () => {
    const user = buildUser(
      [
        {
          id: 'trip-1',
          status: 'ACTIVE',
          travelStart: null,
          travelEnd: null,
          destination: '중부',
          pickupDate: null,
          dropDate: null,
          latestPublishedConfirmationDocument: null,
          guideAssignments: [],
          driverAssignments: [],
          lodgings: [],
        },
      ],
      [buildPlan('2026-08-12')],
    );

    expect(getCustomerConfirmationCardMeta(user, today).hasConfirmationDocument).toBe(false);
  });

  it('투어 travelStart가 있어도 플랜 출발일만으로 D-day를 계산한다', () => {
    const user = buildUser(
      [
        {
          id: 'trip-1',
          status: 'ACTIVE',
          travelStart: '2026-08-12',
          travelEnd: '2026-08-16',
          destination: '고비',
          pickupDate: null,
          dropDate: null,
          latestPublishedConfirmationDocument: null,
          guideAssignments: [],
          driverAssignments: [],
          lodgings: [],
        },
      ],
      [buildPlan('2026-09-09T00:00:00.000Z')],
    );

    expect(getCustomerConfirmationCardMeta(user, today)).toEqual({
      hasConfirmationDocument: false,
      ddayLabel: 'D-30',
      travelStart: '2026-09-09T00:00:00.000Z',
    });
  });

  it('플랜 출발일이 없으면 D-day는 null이다', () => {
    const user = buildUser(
      [
        {
          id: 'trip-1',
          status: 'ACTIVE',
          travelStart: '2026-08-12',
          travelEnd: '2026-08-16',
          destination: '고비',
          pickupDate: null,
          dropDate: null,
          latestPublishedConfirmationDocument: null,
          guideAssignments: [],
          driverAssignments: [],
          lodgings: [],
        },
      ],
      [buildPlan(null)],
    );

    expect(getCustomerConfirmationCardMeta(user, today)).toEqual({
      hasConfirmationDocument: false,
      ddayLabel: null,
      travelStart: null,
    });
  });
});
