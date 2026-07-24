import type { UserRow } from './hooks';

export type CustomerTravelSummary = {
  destination: string;
  travelPeriod: string;
};

type UserPlanRow = NonNullable<UserRow['plans']>[number];

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCompactDate(date: Date): string {
  return `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
}

/** 고객 카드용 여행 기간 표기: 2026.8.15~8.20 (5박6일) */
export function formatCustomerTravelPeriod(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) {
    return '-';
  }

  const diffMs = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);

  if (diffDays < 0) {
    return '-';
  }

  const nights = diffDays;
  const days = diffDays + 1;
  const startText = formatCompactDate(start);
  const endText =
    start.getUTCFullYear() === end.getUTCFullYear()
      ? `${end.getUTCMonth() + 1}.${end.getUTCDate()}`
      : formatCompactDate(end);

  return `${startText}~${endText} (${nights}박${days}일)`;
}

/** 고객의 가장 최근 생성 플랜(서버 createdAt desc)을 반환한다. */
export function getLatestPlanWithCurrentVersion(user: Pick<UserRow, 'plans'>): UserPlanRow | null {
  const plans = user.plans ?? [];
  return plans[0] ?? null;
}

/** 최신 플랜의 currentVersion 기준 여행지·기간 요약을 반환한다. */
export function getCustomerTravelSummary(user: Pick<UserRow, 'plans'>): CustomerTravelSummary | null {
  const latestPlan = getLatestPlanWithCurrentVersion(user);
  const currentVersion = latestPlan?.currentVersion;
  if (!currentVersion) {
    return null;
  }

  const destination = currentVersion.regionSetName?.trim() || '-';
  const travelPeriod = formatCustomerTravelPeriod(
    currentVersion.meta?.travelStartDate,
    currentVersion.meta?.travelEndDate,
  );

  return {
    destination,
    travelPeriod,
  };
}
