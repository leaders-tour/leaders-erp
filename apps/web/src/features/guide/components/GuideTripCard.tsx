import { useNavigate } from 'react-router-dom';
import type { ConfirmedTripRow } from '../../confirmed-trip/hooks';
import { getTripEndDate, getTripStartDate } from '../../confirmed-trip/hooks';
import { calcDDay, formatTripPeriod } from '../trip-utils';

interface Props {
  trip: ConfirmedTripRow;
  variant?: 'upcoming' | 'ongoing' | 'past';
}

export function GuideTripCard({ trip, variant = 'upcoming' }: Props) {
  const navigate = useNavigate();
  const s = getTripStartDate(trip);
  const e = getTripEndDate(trip);

  const destination = trip.destination ?? trip.plan?.title ?? '목적지 미정';
  const pax = trip.paxCount ?? trip.planVersion?.meta?.headcountTotal ?? null;
  const leaderName = trip.planVersion?.meta?.leaderName ?? null;
  const clientName = leaderName ? `${trip.user.name} (${leaderName})` : trip.user.name;

  const variantStyles = {
    ongoing: 'border-emerald-300 bg-emerald-50',
    upcoming: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
    past: 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50',
  };

  const dDayBadgeStyles = {
    ongoing: 'bg-emerald-100 text-emerald-700',
    upcoming: 'bg-sky-100 text-sky-700',
    past: 'bg-slate-100 text-slate-500',
  };

  return (
    <button
      type="button"
      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer ${variantStyles[variant]}`}
      onClick={() => navigate(`/confirmed-trips/${trip.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 truncate">{destination}</span>
            {variant === 'ongoing' && (
              <span className="text-xs bg-emerald-500 text-white rounded-full px-2 py-0.5 font-medium">진행중</span>
            )}
            {trip.status === 'CANCELLED' && (
              <span className="text-xs bg-rose-100 text-rose-600 rounded-full px-2 py-0.5">취소</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {s && e ? formatTripPeriod(s, e) : '날짜 미정'}
            {pax != null && ` · ${pax}명`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{clientName}</p>
        </div>

        {/* D-Day 배지 */}
        {s && variant !== 'past' && (
          <span className={`shrink-0 text-xs font-bold rounded-lg px-2.5 py-1 ${dDayBadgeStyles[variant]}`}>
            {calcDDay(s)}
          </span>
        )}
        {variant === 'past' && e && (
          <span className={`shrink-0 text-xs font-medium rounded-lg px-2.5 py-1 ${dDayBadgeStyles.past}`}>
            {calcDDay(e)}
          </span>
        )}
      </div>
    </button>
  );
}
