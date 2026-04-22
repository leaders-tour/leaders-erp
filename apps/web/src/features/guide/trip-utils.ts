import { getTripEndDate, getTripStartDate, type ConfirmedTripRow } from '../confirmed-trip/hooks';

export interface SplitGuideTrips {
  upcoming: ConfirmedTripRow[];
  ongoing: ConfirmedTripRow[];
  past: ConfirmedTripRow[];
}

export function splitGuideTrips(trips: ConfirmedTripRow[]): SplitGuideTrips {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming: ConfirmedTripRow[] = [];
  const ongoing: ConfirmedTripRow[] = [];
  const past: ConfirmedTripRow[] = [];

  for (const t of trips) {
    const s = getTripStartDate(t);
    const e = getTripEndDate(t);
    if (!s || !e) continue;
    const start = new Date(s);
    const end = new Date(e);
    end.setHours(23, 59, 59, 999);

    if (end < today) {
      past.push(t);
    } else if (start > today) {
      upcoming.push(t);
    } else {
      ongoing.push(t);
    }
  }

  past.sort((a, b) => +new Date(getTripEndDate(b)!) - +new Date(getTripEndDate(a)!));
  upcoming.sort((a, b) => +new Date(getTripStartDate(a)!) - +new Date(getTripStartDate(b)!));

  return { upcoming, ongoing, past };
}

/** D-Day 계산 (시작일 기준) */
export function calcDDay(startDateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

/** 기간 표시: yy.MM.dd ~ MM.dd */
export function formatTripPeriod(startStr: string, endStr: string): string {
  const s = new Date(startStr);
  const e = new Date(endStr);
  const yy = String(s.getFullYear()).slice(2);
  const sm = String(s.getMonth() + 1).padStart(2, '0');
  const sd = String(s.getDate()).padStart(2, '0');
  const em = String(e.getMonth() + 1).padStart(2, '0');
  const ed = String(e.getDate()).padStart(2, '0');
  return `${yy}.${sm}.${sd} ~ ${em}.${ed}`;
}
