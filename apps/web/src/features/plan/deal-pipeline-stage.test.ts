import { describe, expect, it } from 'vitest';
import type { ContractDocumentStatusRow, ContractPaymentStatusRow } from '../contract/hooks';
import {
  calculateTourDayNumber,
  computeRequiredLodgingDayIndices,
  coveredLodgingDayIndices,
  isMongolAssignmentComplete,
  resolveMongolAssignmentStage,
  resolveTourOperationStages,
  resolveVisibleStage,
} from './deal-pipeline-stage';
import type { UserRow } from './hooks';

const PIPELINE_STAGES = [
  'CONTRACTING',
  'CONTRACT_CONFIRMED',
  'MONGOL_ASSIGNING',
  'MONGOL_ASSIGNED',
] as const;

function baseUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    name: '테스트',
    email: null,
    ownerEmployeeId: null,
    ownerEmployee: null,
    dealStage: 'CONTRACTING',
    dealStageOrder: 0,
    attachments: [],
    plans: [
      {
        currentVersion: {
          totalDays: 4,
          meta: {
            travelStartDate: '2026-06-01',
            travelEndDate: '2026-06-04',
            headcountTotal: 5,
          },
          planStops: [
            { dateCellText: '1일차', destinationCellText: '울란바토르' },
            { dateCellText: '2일차', destinationCellText: '테를지' },
            { dateCellText: '3일차', destinationCellText: '홍고르' },
            { dateCellText: '4일차', destinationCellText: '공항' },
          ],
        },
      },
    ],
    confirmedTrips: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function activeTrip(overrides: Partial<NonNullable<UserRow['confirmedTrips']>[number]> = {}) {
  return {
    id: 'trip-1',
    status: 'ACTIVE' as const,
    travelStart: '2026-06-01',
    travelEnd: '2026-06-04',
    destination: '고비',
    pickupDate: '2026-06-01',
    dropDate: '2026-06-04',
    guideAssignments: [{ id: 'guide-1', nameSnapshot: null, guide: { id: 'guide-1', nameKo: '가이드', nameMn: null } }],
    driverAssignments: [{ id: 'driver-1', nameSnapshot: null, driver: { id: 'driver-1', nameMn: '기사' } }],
    lodgings: [
      { dayIndex: 1, nights: 1, checkInDate: '2026-06-01', checkOutDate: '2026-06-02' },
      { dayIndex: 2, nights: 1, checkInDate: '2026-06-02', checkOutDate: '2026-06-03' },
      { dayIndex: 3, nights: 1, checkInDate: '2026-06-03', checkOutDate: '2026-06-04' },
    ],
    ...overrides,
  };
}

describe('computeRequiredLodgingDayIndices', () => {
  it('totalDays 기준으로 필요한 숙박일을 계산한다', () => {
    expect(
      computeRequiredLodgingDayIndices({
        travelStartDate: null,
        travelEndDate: null,
        totalDays: 4,
      }),
    ).toEqual([1, 2, 3]);
  });

  it('여행 시작/종료일 기준으로 필요한 숙박일을 계산한다', () => {
    expect(
      computeRequiredLodgingDayIndices({
        travelStartDate: '2026-06-01',
        travelEndDate: '2026-06-04',
        totalDays: null,
      }),
    ).toEqual([1, 2, 3]);
  });
});

describe('resolveMongolAssignmentStage', () => {
  it('ACTIVE 확정여행 + 배정 미완료면 MONGOL_ASSIGNING', () => {
    const user = baseUser({
      dealStage: 'CONTRACT_CONFIRMED',
      confirmedTrips: [activeTrip({ guideAssignments: [] })],
    });
    expect(resolveMongolAssignmentStage(user)).toBe('MONGOL_ASSIGNING');
  });

  it('ACTIVE 확정여행 + 배정 완료면 MONGOL_ASSIGNED', () => {
    const user = baseUser({
      dealStage: 'CONTRACT_CONFIRMED',
      confirmedTrips: [activeTrip()],
    });
    expect(resolveMongolAssignmentStage(user)).toBe('MONGOL_ASSIGNED');
  });

  it('후속 단계 값과 무관하게 배정 상태를 계산한다', () => {
    const user = baseUser({
      dealStage: 'BEFORE_DEPARTURE_10D',
      confirmedTrips: [activeTrip({ guideAssignments: [] })],
    });
    expect(resolveMongolAssignmentStage(user)).toBe('MONGOL_ASSIGNING');
  });
});

describe('resolveTourOperationStages', () => {
  it('투어 시작일이면 시작과 투어 중 컬럼에 함께 노출한다', () => {
    const user = baseUser({ confirmedTrips: [activeTrip()] });
    expect(resolveTourOperationStages(user, new Date('2026-06-01T12:00:00+09:00'))).toEqual([
      'TOUR_START',
      'TOUR_IN_PROGRESS',
    ]);
  });

  it('투어 종료일이면 투어 중과 종료 컬럼에 함께 노출한다', () => {
    const user = baseUser({ confirmedTrips: [activeTrip()] });
    expect(resolveTourOperationStages(user, new Date('2026-06-04T12:00:00+09:00'))).toEqual([
      'TOUR_IN_PROGRESS',
      'TOUR_END',
    ]);
  });

  it('투어 기간 중 일차를 계산한다', () => {
    const user = baseUser({ confirmedTrips: [activeTrip()] });
    expect(calculateTourDayNumber(user, activeTrip(), new Date('2026-06-03T12:00:00+09:00'))).toBe(3);
  });
});

describe('resolveVisibleStage', () => {
  it('ACTIVE trip 없이 계약/입금 완료면 CONTRACT_CONFIRMED', () => {
    const user = baseUser({ dealStage: 'CONTRACTING' });
    const contractStatus = { status: 'COMPLETED' } as ContractDocumentStatusRow;
    const paymentStatus = { status: 'COMPLETED' } as ContractPaymentStatusRow;
    expect(resolveVisibleStage(user, contractStatus, paymentStatus, [...PIPELINE_STAGES])).toBe('CONTRACT_CONFIRMED');
  });

  it('ACTIVE trip + 가이드 없음이면 MONGOL_ASSIGNING', () => {
    const user = baseUser({
      dealStage: 'CONTRACT_CONFIRMED',
      confirmedTrips: [activeTrip({ guideAssignments: [] })],
    });
    expect(resolveVisibleStage(user, null, null, [...PIPELINE_STAGES], new Date('2026-05-31T12:00:00+09:00'))).toBe('MONGOL_ASSIGNING');
  });

  it('ACTIVE trip + 기사 없음이면 MONGOL_ASSIGNING', () => {
    const user = baseUser({
      dealStage: 'CONTRACT_CONFIRMED',
      confirmedTrips: [activeTrip({ driverAssignments: [] })],
    });
    expect(resolveVisibleStage(user, null, null, [...PIPELINE_STAGES], new Date('2026-05-31T12:00:00+09:00'))).toBe('MONGOL_ASSIGNING');
  });

  it('ACTIVE trip + 숙박일 누락이면 MONGOL_ASSIGNING', () => {
    const user = baseUser({
      dealStage: 'CONTRACT_CONFIRMED',
      confirmedTrips: [activeTrip({ lodgings: [{ dayIndex: 1, nights: 1, checkInDate: '2026-06-01', checkOutDate: '2026-06-02' }] })],
    });
    expect(resolveVisibleStage(user, null, null, [...PIPELINE_STAGES], new Date('2026-05-31T12:00:00+09:00'))).toBe('MONGOL_ASSIGNING');
  });

  it('ACTIVE trip + 숙소/가이드/기사 완료면 MONGOL_ASSIGNED', () => {
    const user = baseUser({
      dealStage: 'CONTRACT_CONFIRMED',
      confirmedTrips: [activeTrip()],
    });
    expect(resolveVisibleStage(user, null, null, [...PIPELINE_STAGES], new Date('2026-05-31T12:00:00+09:00'))).toBe('MONGOL_ASSIGNED');
    expect(isMongolAssignmentComplete(user, activeTrip())).toBe(true);
  });

  it('투어 기간이면 수동/몽골 컬럼 대신 투어 컬럼 계산에 맡긴다', () => {
    const user = baseUser({
      dealStage: 'MONGOL_ASSIGNED',
      confirmedTrips: [activeTrip()],
    });
    expect(resolveVisibleStage(user, null, null, [...PIPELINE_STAGES], new Date('2026-06-02T12:00:00+09:00'))).toBeNull();
  });
});

describe('coveredLodgingDayIndices', () => {
  it('nights가 2 이상이면 연속 dayIndex를 커버한다', () => {
    expect(
      Array.from(
        coveredLodgingDayIndices([
          { dayIndex: 1, nights: 2 },
        ]),
      ),
    ).toEqual([1, 2]);
  });
});
