import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDaysInMonth } from '../../../components/date-picker/date-picker-utils';
import { getColorByDestination } from '../../guide/trip-color';
import type { DriverWithTrips, DriverTripSlim } from '../hooks';

interface Props {
  drivers: DriverWithTrips[];
  year: number;
  month: number; // 1-indexed
  onChangeMonth: (year: number, month: number) => void;
}

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  STAREX: '스타렉스',
  HIACE_SHORT: '하이에이스(숏)',
  HIACE_LONG: '하이에이스(롱)',
  PURGON: '푸르공',
  LAND_CRUISER: '랜드크루저',
  ALPHARD: '알파드',
  OTHER: '기타',
};

const LEVEL_COLOR: Record<string, string> = {
  MAIN: 'bg-indigo-100 text-indigo-700',
  JUNIOR: 'bg-sky-100 text-sky-700',
  ROOKIE: 'bg-emerald-100 text-emerald-700',
  OTHER: 'bg-slate-100 text-slate-500',
};

function isoToLocal(iso: string): Date {
  const part = iso.split('T')[0] ?? iso;
  const [y = 0, m = 1, d = 1] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getTripStart(trip: DriverTripSlim): Date | null {
  const str = trip.planVersion?.meta?.travelStartDate ?? trip.travelStart;
  return str ? isoToLocal(str) : null;
}

function getTripEnd(trip: DriverTripSlim): Date | null {
  const str = trip.planVersion?.meta?.travelEndDate ?? trip.travelEnd;
  return str ? isoToLocal(str) : null;
}

function getTripDest(trip: DriverTripSlim): string {
  return trip.destination ?? '목적지 미정';
}

function formatPeriod(start: Date, end: Date): string {
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

interface TripBlock {
  trip: DriverTripSlim;
  leftPct: number;
  widthPct: number;
}

function buildBlocks(trips: DriverTripSlim[], year: number, month: number): TripBlock[] {
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  const result: TripBlock[] = [];

  for (const trip of trips) {
    if (trip.status === 'CANCELLED') continue;
    const s = getTripStart(trip);
    const e = getTripEnd(trip);
    if (!s || !e) continue;
    if (s > monthEnd || e < monthStart) continue;

    const clampedStart = s < monthStart ? monthStart : s;
    const clampedEnd = e > monthEnd ? monthEnd : e;

    const startOffset = Math.round(
      (clampedStart.getTime() - monthStart.getTime()) / 86400000,
    );
    const endOffset = Math.round(
      (clampedEnd.getTime() - monthStart.getTime()) / 86400000,
    );
    const spanDays = endOffset - startOffset + 1;

    const leftPct = (startOffset / daysInMonth) * 100;
    const widthPct = (spanDays / daysInMonth) * 100;

    result.push({ trip, leftPct, widthPct });
  }

  return result;
}

function todayOffset(year: number, month: number): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, getDaysInMonth(year, month));
  if (today < monthStart || today > monthEnd) return null;
  return Math.round((today.getTime() - monthStart.getTime()) / 86400000);
}

export function DriverAllocationCalendar({ drivers, year, month, onChangeMonth }: Props) {
  const navigate = useNavigate();
  const [tooltip, setTooltip] = useState<{ trip: DriverTripSlim; driverId: string } | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const todayOff = todayOffset(year, month);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function prevMonth() {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  }
  function nextMonth() {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* 헤더 행 */}
      <div className="flex border-b border-slate-200">
        <div className="flex w-44 shrink-0 items-center justify-between border-r border-slate-200 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">
            {year}년 {month}월
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="이전 달"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="다음 달"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* 날짜 헤더 */}
        <div className="relative flex-1 overflow-x-auto">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
          >
            {dayNumbers.map((d) => {
              const dow = new Date(year, month - 1, d).getDay();
              return (
                <div
                  key={d}
                  className={`py-2 text-center text-xs font-medium ${
                    dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-500'
                  }`}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 기사 행들 */}
      <div className="divide-y divide-slate-100">
        {drivers.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            표시할 기사가 없습니다.
          </div>
        )}
        {drivers.map((driver) => {
          const blocks = buildBlocks(driver.confirmedTrips, year, month);
          const hasTrips = blocks.length > 0;

          return (
            <div key={driver.id} className="flex min-h-[3.5rem]">
              {/* 좌측: 기사 정보 */}
              <button
                type="button"
                onClick={() => navigate(`/drivers/${driver.id}`)}
                className="flex w-44 shrink-0 cursor-pointer items-center gap-2.5 border-r border-slate-200 px-3 py-2 transition hover:bg-slate-50 text-left"
              >
                {driver.profileImageUrl ? (
                  <img
                    src={driver.profileImageUrl}
                    alt={driver.nameMn}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                    {driver.nameMn.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{driver.nameMn}</p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium ${
                      LEVEL_COLOR[driver.level] ?? LEVEL_COLOR.OTHER
                    }`}
                  >
                    {VEHICLE_TYPE_LABEL[driver.vehicleType] ?? driver.vehicleType}
                  </span>
                </div>
              </button>

              {/* 우측: 날짜 그리드 + 여행 블록 */}
              <div className="relative flex-1 overflow-x-auto">
                {/* 날짜 셀 구분선 */}
                <div
                  className="absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                >
                  {dayNumbers.map((d) => {
                    const dow = new Date(year, month - 1, d).getDay();
                    return (
                      <div
                        key={d}
                        className={`border-r border-slate-100 last:border-r-0 ${
                          dow === 0 ? 'bg-red-50/40' : dow === 6 ? 'bg-blue-50/30' : ''
                        }`}
                      />
                    );
                  })}
                </div>

                {/* 오늘 기준선 */}
                {todayOff !== null && (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-px bg-rose-400 z-20"
                    style={{ left: `calc(${((todayOff + 0.5) / daysInMonth) * 100}%)` }}
                  />
                )}

                {/* 여행 블록 */}
                <div className="relative h-full px-0.5 py-2">
                  {!hasTrips && (
                    <div className="flex h-full items-center px-3">
                      <span className="text-xs text-slate-300">배정 없음</span>
                    </div>
                  )}
                  {blocks.map(({ trip, leftPct, widthPct }) => {
                    const color = getColorByDestination(getTripDest(trip));
                    const s = getTripStart(trip);
                    const e = getTripEnd(trip);
                    const isHovered = tooltip?.trip.id === trip.id && tooltip?.driverId === driver.id;

                    return (
                      <div
                        key={trip.id}
                        className="absolute top-2 bottom-2 z-10"
                        style={{
                          left: `calc(${leftPct}% + 1px)`,
                          width: `calc(${widthPct}% - 2px)`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/confirmed-trips/${trip.id}`)}
                          onMouseEnter={() => setTooltip({ trip, driverId: driver.id })}
                          onMouseLeave={() => setTooltip(null)}
                          className={`h-full w-full rounded-full flex items-center px-2.5 text-[11px] font-medium text-white truncate transition-opacity hover:opacity-85 ${color.bg}`}
                        >
                          <span className="truncate">{getTripDest(trip)}</span>
                        </button>

                        {/* 툴팁 */}
                        {isHovered && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-44 rounded-xl bg-slate-800 px-3 py-2 text-xs text-white shadow-xl pointer-events-none">
                            <p className="font-semibold truncate">{getTripDest(trip)}</p>
                            <p className="text-slate-300 truncate mt-0.5">{trip.user.name}</p>
                            {s && e && (
                              <p className="text-slate-400 mt-0.5">{formatPeriod(s, e)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
