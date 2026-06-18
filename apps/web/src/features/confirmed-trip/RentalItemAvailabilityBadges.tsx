import { useRef, useState } from 'react';
import {
  DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK,
  TOUR_LIST_RENTAL_ITEM_LABELS,
  tourListRentalItemTypes,
} from '@tour/validation';
import type { RentalItemAvailabilityRow, TourListRentalItem } from './hooks';
import { RentalItemOccupancyCalendar } from './RentalItemOccupancyCalendar';

export const RENTAL_ITEM_LABELS: Record<TourListRentalItem, string> = TOUR_LIST_RENTAL_ITEM_LABELS;

const POPOVER_WIDTH = 600;
const VIEWPORT_PADDING = 16;

function CalendarIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3 w-3 opacity-60"
      aria-hidden
    >
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6h12M5 1v3M11 1v3" strokeLinecap="round" />
    </svg>
  );
}

function RentalItemBadgeWithCalendar({
  row,
  loading,
  compact,
  travelStartDate,
  travelEndDate,
}: {
  row: RentalItemAvailabilityRow;
  loading?: boolean;
  compact?: boolean;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
}): JSX.Element {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [popoverLeft, setPopoverLeft] = useState(0);

  const shortage = row.available < 0 ? Math.abs(row.available) : 0;
  const isDepleted = row.available <= 0;
  const badgeClass = isDepleted
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  const visibleConflictCount = row.conflicts.filter((conflict) => !conflict.excluded).length;
  const hasConflicts = row.conflicts.length > 0;

  function handleMouseEnter() {
    if (!hasConflicts) return;
    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
      const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
      const left = Math.min(Math.max(rect.left, VIEWPORT_PADDING), maxLeft);
      setPopoverLeft(left);
    }
    setOpen(true);
  }

  return (
    <div
      className="relative inline-flex pt-2 -mt-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        ref={badgeRef}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass} ${
          hasConflicts ? 'cursor-default' : ''
        }`}
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
            충돌 {visibleConflictCount}팀
          </span>
        ) : null}
        {hasConflicts ? <CalendarIcon /> : null}
      </span>

      {open && hasConflicts ? (
        <div
          className="fixed z-50 pt-2"
          style={{
            left: popoverLeft,
            top: badgeRef.current?.getBoundingClientRect().bottom ?? 0,
            width: Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2),
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setOpen(false)}
        >
          <RentalItemOccupancyCalendar
            label={row.label}
            total={row.total}
            available={row.available}
            conflicts={row.conflicts}
            highlightStart={travelStartDate}
            highlightEnd={travelEndDate}
          />
        </div>
      ) : null}
    </div>
  );
}

export function RentalItemAvailabilityBadges({
  availability,
  loading,
  compact = false,
  travelStartDate,
  travelEndDate,
}: {
  availability: RentalItemAvailabilityRow[];
  loading?: boolean;
  compact?: boolean;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
}): JSX.Element {
  const rows = availability.length > 0
    ? availability
    : tourListRentalItemTypes.map((item) => ({
        item,
        label: TOUR_LIST_RENTAL_ITEM_LABELS[item],
        total: DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK[item],
        used: 0,
        available: DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK[item],
        conflicts: [],
      }));

  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <RentalItemBadgeWithCalendar
          key={row.item}
          row={row}
          loading={loading}
          compact={compact}
          travelStartDate={travelStartDate}
          travelEndDate={travelEndDate}
        />
      ))}
    </div>
  );
}
