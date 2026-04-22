import { useMemo, useState } from 'react';
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

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
type MonthCount = (typeof MONTH_OPTIONS)[number];

/** 향후 1~6개월 가로 타임라인 */
export function GuideTripTimeline({ upcoming, ongoing }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [monthCount, setMonthCount] = useState<MonthCount>(1);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const endWindow = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + monthCount);
    return d;
  }, [today, monthCount]);

  const totalMs = endWindow.getTime() - today.getTime();

  const allTrips = [...ongoing, ...upcoming];
  const visibleTrips = useMemo(
    () =>
      allTrips.filter((trip) => {
        const s = getTripStartDate(trip);
        const e = getTripEndDate(trip);
        if (!s || !e) return false;
        const start = new Date(s).getTime();
        const end = new Date(e).getTime();
        return end >= today.getTime() && start <= endWindow.getTime();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ongoing, upcoming, today, endWindow],
  );

  function toPercent(date: Date): number {
    const clamped = Math.max(today.getTime(), Math.min(endWindow.getTime(), date.getTime()));
    return ((clamped - today.getTime()) / totalMs) * 100;
  }

  /**
   * 눈금 라벨 계산
   * - 1개월: 일자 단위(주마다 1개씩, 일/15/말일 강조)
   * - 2~6개월: 월 단위
   */
  const tickLabels = useMemo(() => {
    const labels: { key: string; label: string; pct: number; emphasized?: boolean }[] = [];

    if (monthCount === 1) {
      const cursor = new Date(today);
      while (cursor <= endWindow) {
        const day = cursor.getDate();
        labels.push({
          key: `${cursor.getFullYear()}-${cursor.getMonth()}-${day}`,
          label:
            day === 1
              ? `${cursor.getMonth() + 1}/${day}`
              : `${day}`,
          pct: toPercent(new Date(cursor)),
          emphasized: day === 1,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return labels;
    }

    const cursor = new Date(today);
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= endWindow) {
      labels.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: `${cursor.getMonth() + 1}월`,
        pct: toPercent(new Date(cursor)),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return labels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCount, today, endWindow]);

  return (
    <div className="relative select-none">
      {/* 상단: 기간 선택 */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          오늘부터 {monthCount}개월
        </span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {MONTH_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonthCount(m)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                monthCount === m
                  ? 'bg-white shadow text-slate-800 font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m}개월
            </button>
          ))}
        </div>
      </div>

      {visibleTrips.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          향후 {monthCount}개월 내 예정된 배정이 없습니다.
        </p>
      ) : (
        <>
          {/* 눈금 라벨 */}
          <div className="relative h-5 mb-1">
            {tickLabels.map((m) => (
              <span
                key={m.key}
                className={`absolute text-[11px] -translate-x-1/2 ${
                  m.emphasized ? 'text-slate-600 font-medium' : 'text-slate-400'
                }`}
                style={{ left: `${m.pct}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* 트랙 */}
          <div className="relative h-2 bg-slate-100 rounded-full mb-3">
            {/* 오늘 기준선 */}
            <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-rose-400 rounded-full" style={{ left: '0%' }} />
            {/* 눈금 구분선 */}
            {tickLabels.map((m) => (
              <div
                key={m.key}
                className={`absolute top-0 bottom-0 w-px ${
                  m.emphasized ? 'bg-slate-300' : 'bg-slate-200'
                }`}
                style={{ left: `${m.pct}%` }}
              />
            ))}
            {/* 여행 막대 */}
            {visibleTrips.map((trip) => {
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
            {visibleTrips.map((trip) => {
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
        </>
      )}

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
