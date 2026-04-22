import type { UserRow } from './hooks';

export type CustomerTripStatus = 'pre' | 'confirmed' | 'ongoing' | 'done';

export const CUSTOMER_TRIP_STATUS_LABELS: Record<CustomerTripStatus | 'all', string> = {
  all: '전체',
  pre: '확정 전',
  confirmed: '확정',
  ongoing: '진행중',
  done: '완료',
};

/** 카드가 선택되지 않았을 때의 칩 색상 */
export const CUSTOMER_TRIP_STATUS_CHIP_CLASS: Record<CustomerTripStatus, string> = {
  pre: 'bg-slate-100 text-slate-500',
  confirmed: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-emerald-100 text-emerald-700',
  done: 'bg-slate-100 text-slate-400',
};

/** 카드가 선택(어두운 배경)됐을 때의 칩 색상 */
export const CUSTOMER_TRIP_STATUS_CHIP_SELECTED_CLASS: Record<CustomerTripStatus, string> = {
  pre: 'bg-white/10 text-slate-300',
  confirmed: 'bg-blue-400/30 text-blue-100',
  ongoing: 'bg-emerald-400/30 text-emerald-100',
  done: 'bg-white/10 text-slate-400',
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getCustomerTripStatus(user: UserRow, today = new Date()): CustomerTripStatus {
  const active = (user.confirmedTrips ?? []).filter((t) => t.status === 'ACTIVE');
  if (active.length === 0) return 'pre';

  const todayMs = startOfDay(today).getTime();
  let hasFuture = false;
  let hasPast = false;

  for (const trip of active) {
    const start = trip.travelStart ? startOfDay(new Date(trip.travelStart)).getTime() : null;
    const end = trip.travelEnd ? startOfDay(new Date(trip.travelEnd)).getTime() : null;

    if (start !== null && end !== null && start <= todayMs && todayMs <= end) {
      return 'ongoing';
    }
    if (start === null || start > todayMs) {
      hasFuture = true;
    } else if (end !== null && end < todayMs) {
      hasPast = true;
    }
  }

  if (hasFuture) return 'confirmed';
  if (hasPast) return 'done';
  return 'confirmed';
}

export function calcGroupCounts(
  users: UserRow[],
  today = new Date(),
): Record<CustomerTripStatus | 'all', number> {
  const counts: Record<CustomerTripStatus | 'all', number> = {
    all: users.length,
    pre: 0,
    confirmed: 0,
    ongoing: 0,
    done: 0,
  };
  for (const user of users) {
    counts[getCustomerTripStatus(user, today)] += 1;
  }
  return counts;
}
