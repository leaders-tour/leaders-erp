import type { RentalItemAvailabilityRow, TourListRentalItem } from './hooks';

export const RENTAL_ITEM_LABELS: Record<TourListRentalItem, string> = {
  DRONE: '드론',
  STARLINK: '스타링크',
  POWERBANK: '파워뱅크',
};

const RENTAL_ITEM_TOTALS: Record<TourListRentalItem, number> = {
  DRONE: 10,
  STARLINK: 5,
  POWERBANK: 1,
};

export function RentalItemAvailabilityBadges({
  availability,
  loading,
  compact = false,
}: {
  availability: RentalItemAvailabilityRow[];
  loading?: boolean;
  compact?: boolean;
}): JSX.Element {
  const rows = availability.length > 0
    ? availability
    : (Object.entries(RENTAL_ITEM_LABELS) as Array<[TourListRentalItem, string]>).map(([item, label]) => ({
        item,
        label,
        total: RENTAL_ITEM_TOTALS[item],
        used: 0,
        available: RENTAL_ITEM_TOTALS[item],
        conflicts: [],
      }));

  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => {
        const shortage = row.available < 0 ? Math.abs(row.available) : 0;
        const isDepleted = row.available <= 0;
        const badgeClass = isDepleted
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800';
        const visibleConflictCount = row.conflicts.filter((conflict) => !conflict.excluded).length;
        const hasConflicts = row.conflicts.length > 0;
        return (
          <span
            key={row.item}
            className={`group relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}
          >
            <span>{row.label}</span>
            {loading ? (
              <span className="text-slate-500">계산중</span>
            ) : shortage > 0 ? (
              <span>초과 {shortage} / {row.total}</span>
            ) : (
              <span>{Math.max(0, row.available)} / {row.total}</span>
            )}
            {!compact && visibleConflictCount > 0 ? (
              <span className={isDepleted ? 'text-rose-600' : 'text-emerald-600'}>
                겹침 {visibleConflictCount}팀
              </span>
            ) : null}
            {hasConflicts ? (
              <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden min-w-52 max-w-72 rounded-lg border border-slate-200 bg-white p-2 text-left text-xs font-medium text-slate-700 shadow-lg group-hover:block">
                {row.conflicts.map((conflict) => (
                  <span
                    key={conflict.confirmedTripId}
                    className={`block whitespace-nowrap ${conflict.excluded ? 'text-slate-400 line-through' : ''}`}
                  >
                    {conflict.leaderName} {conflict.travelStartDate.slice(0, 10)}~{conflict.travelEndDate.slice(0, 10)}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
