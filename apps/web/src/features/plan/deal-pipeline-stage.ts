import type { ContractDocumentStatusRow, ContractPaymentStatusRow } from '../contract/hooks';
import type { DealStageValue, UserRow } from './hooks';

export type UserConfirmedTripForStage = NonNullable<UserRow['confirmedTrips']>[number];
export type TourOperationStageKey = 'TOUR_START' | 'TOUR_IN_PROGRESS' | 'TOUR_END';
export type VisibleDealStageKey = 'CONTRACTING' | 'CONTRACT_CONFIRMED' | 'MONGOL_ASSIGNING' | 'MONGOL_ASSIGNED';
export type PipelineStageKey = VisibleDealStageKey | TourOperationStageKey;

export function getActiveConfirmedTrip(user: UserRow): UserConfirmedTripForStage | null {
  return user.confirmedTrips?.find((trip) => trip.status === 'ACTIVE') ?? null;
}

export function hasActiveConfirmedTrip(user: UserRow): boolean {
  return getActiveConfirmedTrip(user) != null;
}

export function dateKey(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function diffCalendarDays(startKey: string, endKey: string): number | null {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) {
    return null;
  }
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function compareDateKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

function countInclusiveCalendarDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / 86400000) + 1;
}

export function computeRequiredLodgingDayIndices(input: {
  travelStartDate: string | null | undefined;
  travelEndDate: string | null | undefined;
  totalDays: number | null | undefined;
}): number[] | null {
  const { travelStartDate, travelEndDate, totalDays } = input;
  if (typeof totalDays === 'number' && totalDays > 1) {
    return Array.from({ length: totalDays - 1 }, (_, index) => index + 1);
  }
  if (!travelStartDate || !travelEndDate) {
    return null;
  }
  const start = new Date(travelStartDate);
  const end = new Date(travelEndDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  const tripDays = countInclusiveCalendarDays(start, end);
  if (tripDays <= 1) {
    return [];
  }
  return Array.from({ length: tripDays - 1 }, (_, index) => index + 1);
}

export function coveredLodgingDayIndices(
  lodgings: Array<{ dayIndex: number; nights: number }>,
): Set<number> {
  const covered = new Set<number>();
  for (const lodging of lodgings) {
    const nights = Math.max(1, lodging.nights);
    for (let offset = 0; offset < nights; offset += 1) {
      covered.add(lodging.dayIndex + offset);
    }
  }
  return covered;
}

function getCurrentPlanContext(user: UserRow): {
  travelStartDate: string | null | undefined;
  travelEndDate: string | null | undefined;
  totalDays: number | null | undefined;
} {
  const currentVersion = user.plans?.find((plan) => plan.currentVersion)?.currentVersion;
  return {
    travelStartDate: currentVersion?.meta?.travelStartDate,
    travelEndDate: currentVersion?.meta?.travelEndDate,
    totalDays: currentVersion?.totalDays,
  };
}

export function isLodgingAssignmentComplete(user: UserRow, trip: UserConfirmedTripForStage): boolean {
  const planContext = getCurrentPlanContext(user);
  const required = computeRequiredLodgingDayIndices({
    travelStartDate: planContext.travelStartDate ?? trip.travelStart,
    travelEndDate: planContext.travelEndDate ?? trip.travelEnd,
    totalDays: planContext.totalDays,
  });
  if (required === null) {
    return false;
  }
  if (required.length === 0) {
    return true;
  }
  const covered = coveredLodgingDayIndices(trip.lodgings ?? []);
  return required.every((dayIndex) => covered.has(dayIndex));
}

export function isMongolAssignmentComplete(user: UserRow, trip: UserConfirmedTripForStage): boolean {
  const hasGuide = (trip.guideAssignments?.length ?? 0) > 0;
  const hasDriver = (trip.driverAssignments?.length ?? 0) > 0;
  return hasGuide && hasDriver && isLodgingAssignmentComplete(user, trip);
}

export function resolveMongolAssignmentStage(user: UserRow): DealStageValue | null {
  const activeTrip = getActiveConfirmedTrip(user);
  if (!activeTrip) {
    return null;
  }
  return isMongolAssignmentComplete(user, activeTrip) ? 'MONGOL_ASSIGNED' : 'MONGOL_ASSIGNING';
}

export function getTourDateContext(
  user: UserRow,
  trip: UserConfirmedTripForStage,
): { startKey: string | null; endKey: string | null } {
  const planContext = getCurrentPlanContext(user);
  return {
    startKey: dateKey(planContext.travelStartDate ?? trip.travelStart),
    endKey: dateKey(planContext.travelEndDate ?? trip.travelEnd),
  };
}

export function calculateTourDayNumber(
  user: UserRow,
  trip: UserConfirmedTripForStage,
  today: Date = new Date(),
): number | null {
  const { startKey, endKey } = getTourDateContext(user, trip);
  const todayKey = dateKey(today);
  if (!startKey || !endKey || !todayKey) {
    return null;
  }
  if (compareDateKeys(todayKey, startKey) < 0 || compareDateKeys(todayKey, endKey) > 0) {
    return null;
  }
  const dayOffset = diffCalendarDays(startKey, todayKey);
  return dayOffset == null ? null : dayOffset + 1;
}

export function resolveTourOperationStages(
  user: UserRow,
  today: Date = new Date(),
): TourOperationStageKey[] {
  const activeTrip = getActiveConfirmedTrip(user);
  if (!activeTrip) {
    return [];
  }
  const { startKey, endKey } = getTourDateContext(user, activeTrip);
  const todayKey = dateKey(today);
  if (!startKey || !endKey || !todayKey) {
    return [];
  }
  if (compareDateKeys(todayKey, startKey) < 0 || compareDateKeys(todayKey, endKey) > 0) {
    return [];
  }

  const stages: TourOperationStageKey[] = [];
  if (todayKey === startKey) {
    stages.push('TOUR_START');
  }
  stages.push('TOUR_IN_PROGRESS');
  if (todayKey === endKey) {
    stages.push('TOUR_END');
  }
  return stages;
}

function isPaymentComplete(status: ContractPaymentStatusRow | null): boolean {
  return status?.status === 'COMPLETED' || status?.status === 'OVERPAID';
}

function isContractStarted(status: ContractDocumentStatusRow | null): boolean {
  return (status?.submittedCount ?? 0) > 0;
}

function isContractComplete(status: ContractDocumentStatusRow | null): boolean {
  return status?.status === 'COMPLETED';
}

export function resolveVisibleStage(
  user: UserRow,
  contractStatus: ContractDocumentStatusRow | null,
  paymentStatus: ContractPaymentStatusRow | null,
  stages: DealStageValue[],
  today: Date = new Date(),
): DealStageValue | null {
  if (resolveTourOperationStages(user, today).length > 0) {
    return null;
  }

  const mongolStage = resolveMongolAssignmentStage(user);
  if (mongolStage) {
    return mongolStage;
  }

  const isConfirmationCandidate =
    isContractComplete(contractStatus) && isPaymentComplete(paymentStatus) && !hasActiveConfirmedTrip(user);

  if (isConfirmationCandidate) {
    return 'CONTRACT_CONFIRMED';
  }

  if (isContractStarted(contractStatus)) {
    const contractAndPaymentDone =
      isContractComplete(contractStatus) && isPaymentComplete(paymentStatus);
    if (!contractAndPaymentDone) {
      return 'CONTRACTING';
    }
  }

  if (user.dealStage === 'CONTRACTING' && !isContractStarted(contractStatus)) {
    return null;
  }

  if (user.dealStage === 'CONTRACT_CONFIRMED' || user.dealStage === 'CONTRACTING') {
    return null;
  }

  if (stages.includes(user.dealStage)) {
    return user.dealStage;
  }

  return null;
}
