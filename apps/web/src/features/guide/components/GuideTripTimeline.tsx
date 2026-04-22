import { useState } from 'react';
import type { ConfirmedTripRow } from '../../confirmed-trip/hooks';
import { getTripEndDate, getTripStartDate } from '../../confirmed-trip/hooks';
import { formatTripPeriod } from '../trip-utils';

interface Props {
  upcoming: ConfirmedTripRow[];
  ongoing: ConfirmedTripRow[];
}

interface TooltipState {
  trip: ConfirmedTripRow;
  x: number;
  y: number;
}

/** 향후 6개월 가로 타임라인 */
export function GuideTripTimeline({ upcoming, ongoing }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endWindow = new Date(today);
  endWindow.setMonth(endWindow.getMonth() + 6);

  const totalMs = endWindow.getTime() - today.getTime();

  const allTrips = [...ongoing, ...upcoming];

  if (allTrips.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">향후 6개월 내 예정된 배정이 없습니다.</p>
    );
  }

  function toPercent(date: Date): number {
    const clamped = Math.max(today.getTime(), Math.min(endWindow.getTime(), date.getTime()));
    return ((clamped - today.getTime()) / totalMs) * 100;
  }

  // 월 구분선 레이블
  const monthLabels: { label: string; pct: number }[] = [];
  const cursor = new Date(today);
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + 1);
  while (cursor <= endWindow) {
    const pct = toPercent(new Date(cursor));
    monthLabels.push({
      label: `${cursor.getMonth() + 1}월`,
      pct,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="relative select-none">
      {/* 월 레이블 */}
      <div className="relative h-5 mb-1">
        {monthLabels.map((m) => (
          <span
            key={m.label}
            className="absolute text-xs text-slate-400 -translate-x-1/2"
            style={{ left: `${m.pct}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* 트랙 */}
      <div className="relative h-2 bg-slate-100 rounded-full mb-3">
        {/* 오늘 기준선 */}
        <div className="absolute top-0 bottom-0 w-px bg-rose-400" style={{ left: '0%' }} />
        {/* 월 구분선 */}
        {monthLabels.map((m) => (
          <div
            key={m.label}
            className="absolute top-0 bottom-0 w-px bg-slate-200"
            style={{ left: `${m.pct}%` }}
          />
        ))}
        {/* 여행 막대 */}
        {allTrips.map((trip) => {
          const s = getTripStartDate(trip);
          const e = getTripEndDate(trip);
          if (!s || !e) return null;
          const left = toPercent(new Date(s));
          const right = toPercent(new Date(e));
          const width = Math.max(right - left, 1);
          const isOngoing = ongoing.includes(trip);
          return (
            <div
              key={trip.id}
              className={`absolute top-0 bottom-0 rounded-full cursor-pointer transition-opacity hover:opacity-80 ${
                isOngoing ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onMouseEnter={(ev) =>
                setTooltip({ trip, x: ev.currentTarget.getBoundingClientRect().left, y: 0 })
              }
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </div>

      {/* 여행 행(막대 라벨) */}
      <div className="space-y-1.5">
        {allTrips.map((trip) => {
          const s = getTripStartDate(trip);
          const e = getTripEndDate(trip);
          if (!s || !e) return null;
          const left = toPercent(new Date(s));
          const right = toPercent(new Date(e));
          const width = Math.max(right - left, 0.5);
          const isOngoing = ongoing.includes(trip);
          const dest = trip.planVersion?.meta?.travelStartDate
            ? (trip.plan?.title ?? trip.destination)
            : trip.destination;
          return (
            <div key={trip.id} className="relative h-7">
              <div
                className={`absolute h-full rounded-md flex items-center px-2 cursor-pointer transition-opacity hover:opacity-80 ${
                  isOngoing
                    ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-700'
                    : 'bg-slate-100 border border-slate-300 text-slate-600'
                }`}
                style={{ left: `${left}%`, width: `${width}%`, minWidth: '2rem' }}
                onMouseEnter={(ev) =>
                  setTooltip({ trip, x: ev.currentTarget.getBoundingClientRect().left, y: 0 })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                <span className="text-xs font-medium truncate">
                  {dest ?? '목적지 미정'} · {formatTripPeriod(s, e)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 툴팁 */}
      {tooltip && (() => {
        const s = getTripStartDate(tooltip.trip);
        const e = getTripEndDate(tooltip.trip);
        return (
          <div className="fixed z-50 pointer-events-none bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
            style={{ top: '50%', left: `${tooltip.x}px`, transform: 'translateY(-120%)' }}
          >
            <p className="font-semibold">{tooltip.trip.user.name}</p>
            <p>{tooltip.trip.destination ?? tooltip.trip.plan?.title ?? '목적지 미정'}</p>
            {s && e && <p>{formatTripPeriod(s, e)}</p>}
            {tooltip.trip.paxCount != null && <p>{tooltip.trip.paxCount}명</p>}
          </div>
        );
      })()}

      {/* 범례 */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> 진행중
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-slate-400" /> 예정
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1 bg-rose-400 h-3" /> 오늘
        </span>
      </div>
    </div>
  );
}
