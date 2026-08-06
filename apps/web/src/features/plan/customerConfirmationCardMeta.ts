import { getLatestPlanWithCurrentVersion } from './customerTravelSummary';
import type { UserRow } from './hooks';

export type CustomerConfirmationCardMeta = {
  hasConfirmationDocument: boolean;
  ddayLabel: string | null;
  travelStart: string | null;
};

function startOfLocalDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return startOfLocalDay(date);
}

/** 여행 출발일 기준 D-day 표기. 당일 D-Day, 이전 D-N, 이후 D+N */
export function formatTravelStartDday(
  travelStart: string | null | undefined,
  today = new Date(),
): string | null {
  const start = parseLocalDate(travelStart);
  if (!start) {
    return null;
  }

  const todayStart = startOfLocalDay(today);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((start.getTime() - todayStart.getTime()) / dayMs);

  if (diffDays === 0) {
    return 'D-Day';
  }
  if (diffDays > 0) {
    return `D-${diffDays}`;
  }
  return `D+${Math.abs(diffDays)}`;
}

export function getCustomerConfirmationCardMeta(
  user: Pick<UserRow, 'confirmedTrips' | 'plans'>,
  today = new Date(),
): CustomerConfirmationCardMeta {
  const activeTrips = (user.confirmedTrips ?? []).filter((trip) => trip.status === 'ACTIVE');
  const hasConfirmationDocument = activeTrips.some(
    (trip) => trip.latestPublishedConfirmationDocument != null,
  );
  const travelStart =
    getLatestPlanWithCurrentVersion(user)?.currentVersion?.meta?.travelStartDate ?? null;

  return {
    hasConfirmationDocument,
    ddayLabel: formatTravelStartDday(travelStart, today),
    travelStart,
  };
}
