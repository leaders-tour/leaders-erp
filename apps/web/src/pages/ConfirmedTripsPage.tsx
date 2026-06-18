import { Card } from '@tour/ui';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarNoteModal } from '../features/confirmed-trip/CalendarNoteModal';
import { ConfirmedTripCalendar } from '../features/confirmed-trip/ConfirmedTripCalendar';
import { CreateConfirmedTripModal } from '../features/confirmed-trip/CreateConfirmedTripModal';
import {
  buildEquipmentRentalConflicts,
  getEquipmentStockTotal,
  getSingleEquipmentRentalFilter,
} from '../features/confirmed-trip/equipment-rental-occupancy';
import { countDailyOccupancy } from '../features/confirmed-trip/rental-occupancy-calendar';
import { useTourListRentalItemStock } from '../features/app-settings/hooks';
import { KoreaTeamStageMultiSelect } from '../features/confirmed-trip/KoreaTeamStageMultiSelect';
import { PostTripTaskMultiSelect } from '../features/confirmed-trip/PostTripTaskMultiSelect';
import { RecruitmentStatusToggle } from '../features/confirmed-trip/RecruitmentStatusToggle';
import {
  useCalendarNotes,
  useConfirmedTrips,
  useCreateCalendarNote,
  useCreateConfirmedTripDirect,
  useUpdateCalendarNote,
  useDeleteCalendarNote,
  useUpdateConfirmedTrip,
  getTripStartDate,
  getTripEndDate,
  getTripLeaderName,
  getTripHeadcount,
  getTripDestination,
  getTripExternalTransfers,
  sortTripAssignments,
  type CalendarNoteRow,
  type ConfirmedTripRow,
} from '../features/confirmed-trip/hooks';
import { externalTransferTravelDateIso } from '../features/plan/external-transfer';
import { isConfirmedTripRecentReturn } from '../features/confirmed-trip/recent-return';
import {
  tripMatchesAggRegions,
  parseAggRegionsParam,
  TRIP_REGION_FILTER_OPTIONS,
  type TripRegionBucket,
} from '../features/confirmed-trip/trip-region-bucket';
import { DateRangePickerModal } from '../components/date-picker/DateRangePickerModal';
import { parseIsoDate } from '../components/date-picker/date-picker-utils';

function formatAggRangeButtonLabel(from: string, to: string): string {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (!a || !b) return '기간 선택';
  if (a.year === b.year) return `${a.month}.${a.day} – ${b.month}.${b.day}`;
  return `${a.year}.${a.month}.${a.day} – ${b.year}.${b.month}.${b.day}`;
}

function getLocalDateFromIsoOrYmd(value: string | null): Date | null {
  if (!value) return null;
  const ymd = value.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo, d);
}

/** 출발일만: filterStart ≤ tripStart ≤ filterEnd (일 단위, 로컬). */
function isDepartureInRange(tripStartIso: string | null, fromYmd: string, toYmd: string): boolean {
  const day = getLocalDateFromIsoOrYmd(tripStartIso);
  const from = getLocalDateFromIsoOrYmd(fromYmd);
  const to = getLocalDateFromIsoOrYmd(toYmd);
  if (!day || !from || !to) return false;
  return day >= from && day <= to;
}

/** 출발일은 구간 밖이어도 실투어 외 이송 일정(travelDate)이 구간에 들어오면 true — 캘린더 집계 전용. */
function tripExternalTransfersIntersectAggRange(
  trip: ConfirmedTripRow,
  aggFrom: string,
  aggTo: string,
): boolean {
  for (const transfer of getTripExternalTransfers(trip)) {
    const iso = externalTransferTravelDateIso(transfer.travelDate);
    if (iso && isDepartureInRange(iso, aggFrom, aggTo)) return true;
  }
  return false;
}

/** 집계·리스트·캘린더 공통: 지역(다중 OR) + (from·to 둘 다 있을 때만) 출발일 구간. */
function filterTripsByAggScope(
  trips: ConfirmedTripRow[],
  aggFrom: string,
  aggTo: string,
  aggRegions: TripRegionBucket[],
  options?: { calendarIncludeExternalTransferDates?: boolean },
): ConfirmedTripRow[] {
  const hasDateRange = Boolean(aggFrom && aggTo);
  let out = trips;
  if (aggRegions.length > 0) {
    out = out.filter((t) => tripMatchesAggRegions(t, aggRegions));
  }
  if (hasDateRange) {
    const inclExt = options?.calendarIncludeExternalTransferDates === true;
    out = out.filter((t) => {
      if (isDepartureInRange(getTripStartDate(t), aggFrom, aggTo)) return true;
      if (inclExt && tripExternalTransfersIntersectAggRange(t, aggFrom, aggTo)) return true;
      return false;
    });
  }
  return out;
}

type DateFilter = 'reserved' | 'upcoming' | 'ongoing' | 'completed';
type ViewMode = 'list' | 'calendar';
type RentalItemFilter = 'drone' | 'starlink' | 'powerbank' | 'camelDoll' | 'pickup' | 'drop';
type SortKey = 'travelStart' | 'confirmedAt';
type SortDir = 'asc' | 'desc';

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'reserved', label: '예약표' },
  { value: 'upcoming', label: '여행 예정' },
  { value: 'ongoing', label: '여행중' },
  { value: 'completed', label: '여행 완료' },
];

/** 필터 행: 타이틀 열 우측 세로 구분선 — 그리드 첫 열(5rem)과 맞춤 */
const FILTER_TITLE_COL_CLASS =
  'border-r border-slate-200 py-0.5 pr-3 text-sm font-medium text-slate-500';

const RENTAL_ITEM_FILTER_OPTIONS: Array<{ value: RentalItemFilter; label: string }> = [
  { value: 'drone', label: '드론' },
  { value: 'starlink', label: '스타링크' },
  { value: 'powerbank', label: '파워뱅크' },
  { value: 'camelDoll', label: '낙타인형 구매' },
  { value: 'pickup', label: '실투어 외 픽업' },
  { value: 'drop', label: '실투어 외 드랍' },
];

function getTodayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function applyDateFilter(trips: ConfirmedTripRow[], filter: DateFilter): ConfirmedTripRow[] {
  if (filter === 'reserved') return trips;
  const today = getTodayMidnight();
  return trips.filter((trip) => {
    const startStr = getTripStartDate(trip);
    const endStr = getTripEndDate(trip);
    if (!startStr || !endStr) return false;
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(0, 0, 0, 0);
    if (filter === 'upcoming') return start > today;
    if (filter === 'ongoing') return start <= today && end >= today;
    return end < today;
  });
}

function applySort(trips: ConfirmedTripRow[], key: SortKey, dir: SortDir): ConfirmedTripRow[] {
  return [...trips].sort((a, b) => {
    let aVal: number, bVal: number;
    if (key === 'confirmedAt') {
      aVal = new Date(a.confirmedAt).getTime();
      bVal = new Date(b.confirmedAt).getTime();
    } else {
      const aStr = getTripStartDate(a);
      const bStr = getTripStartDate(b);
      if (!aStr) return 1;
      if (!bStr) return -1;
      aVal = new Date(aStr).getTime();
      bVal = new Date(bStr).getTime();
    }
    return dir === 'asc' ? aVal - bVal : bVal - aVal;
  });
}

const RENTAL_ITEM_FILTER_VALUES = new Set<RentalItemFilter>([
  'drone',
  'starlink',
  'powerbank',
  'camelDoll',
  'pickup',
  'drop',
]);

function matchesRentalItem(
  trip: ConfirmedTripRow,
  filter: RentalItemFilter,
  calendarNotes: CalendarNoteRow[],
): boolean {
  if (filter === 'drone') return Boolean(trip.rentalDrone);
  if (filter === 'starlink') return Boolean(trip.rentalStarlink);
  if (filter === 'powerbank') return Boolean(trip.rentalPowerbank);
  if (filter === 'camelDoll') {
    if (trip.camelDollPurchased) return true;
    return calendarNotes.some((n) => n.kind === 'CAMEL_DOLL' && n.confirmedTripId === trip.id);
  }
  if (filter === 'pickup') return getTripExternalTransfers(trip).some((transfer) => transfer.direction === 'PICKUP');
  if (filter === 'drop') return getTripExternalTransfers(trip).some((transfer) => transfer.direction === 'DROP');
  return false;
}

function applyRentalItemFilter(
  trips: ConfirmedTripRow[],
  filters: RentalItemFilter[],
  calendarNotes: CalendarNoteRow[],
): ConfirmedTripRow[] {
  if (filters.length === 0) return trips;
  return trips.filter((trip) => filters.every((filter) => matchesRentalItem(trip, filter, calendarNotes)));
}

function normalizeTripSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('ko-KR');
}

/** 확정여행 목록·검색: 배정 기사 차종 라벨 (마스터 `vehicleType` enum 기준) */
const DRIVER_VEHICLE_TYPE_LABELS: Record<string, string> = {
  STAREX: '스타렉스',
  HIACE_SHORT: '하이에이스(숏)',
  HIACE_LONG: '하이에이스(롱)',
  PURGON: '부르곤',
  PREMIUM_VAN: '프리미엄 밴',
  SUV: 'SUV',
  LAND_CRUISER: '랜드크루저',
  ALPHARD: '알파드',
  OTHER: '기타',
};

function driverVehicleLabel(vehicleType: string): string {
  return DRIVER_VEHICLE_TYPE_LABELS[vehicleType] ?? vehicleType;
}

function getTripSearchText(trip: ConfirmedTripRow): string {
  const startStr = getTripStartDate(trip);
  const endStr = getTripEndDate(trip);
  const headcount = getTripHeadcount(trip);
  const rentalItems = [
    trip.rentalDrone ? '드론' : null,
    trip.rentalStarlink ? '스타링크' : null,
    trip.rentalPowerbank ? '파워뱅크' : null,
    trip.camelDollPurchased ? '낙타인형' : null,
  ];

  return [
    getTripLeaderName(trip),
    trip.user.name,
    trip.user.email,
    startStr,
    endStr,
    startStr && endStr ? formatDateRange(startStr, endStr) : null,
    headcount == null ? null : String(headcount),
    trip.isRecruitingOpen ? '모집중' : '마감',
    getTripDestination(trip),
    trip.plan?.title,
    trip.plan?.regionSet.name,
    trip.planVersion?.meta?.documentNumber,
    ...sortTripAssignments(trip.guideAssignments).flatMap((a) => [
      a.guide.nameKo,
      a.guide.nameMn,
      a.nameSnapshot,
    ]),
    ...sortTripAssignments(trip.driverAssignments).flatMap((a) => [
      a.driver.nameMn,
      a.nameSnapshot,
      driverVehicleLabel(a.driver.vehicleType),
      a.driver.vehicleType,
    ]),
    trip.assignedVehicle,
    trip.planVersion?.meta?.vehicleType,
    getLodgingSummary(trip),
    trip.accommodationNote,
    trip.operationNote,
    ...trip.postTripTasks.map((task) => task.label),
    ...rentalItems,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

function applyTripSearch(trips: ConfirmedTripRow[], query: string): ConfirmedTripRow[] {
  const tokens = normalizeTripSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return trips;

  return trips.filter((trip) => {
    const haystack = normalizeTripSearchText(getTripSearchText(trip));
    return tokens.every((token) => haystack.includes(token));
  });
}

function parseRentalItemFilters(raw: string | null): RentalItemFilter[] {
  if (!raw) return [];
  const seen = new Set<RentalItemFilter>();
  const result: RentalItemFilter[] = [];
  for (const token of raw.split(',')) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    if (!RENTAL_ITEM_FILTER_VALUES.has(trimmed as RentalItemFilter)) continue;
    const value = trimmed as RentalItemFilter;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function getNow() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(s)} → ${fmt(e)}`;
}

function getDaysFromToday(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** `dateCellText`에서 n일차 숫자 추출 (예: "3일차", "#3일차") */
function parseDayIndexFromDateCellText(dateCellText: string): number | null {
  const t = dateCellText.trim();
  const labeled = t.match(/#?\s*(\d+)\s*일차/);
  if (labeled) {
    const n = Number(labeled[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * 여행중 오늘 일차의 MAIN 목적지 라벨. plan 미연결·스탑 없음·매칭 실패 시 null.
 * 일차는 `TripDayBadge`와 동일(출발일 대비 달력 일수). MAIN만 세고, 숫자 매칭 실패 시 n번째 MAIN 행을 n일차로 본다.
 */
function getOngoingTripCurrentDestinationText(trip: ConfirmedTripRow, startDateStr: string): string | null {
  if (!trip.planId) return null;
  const stops = trip.planVersion?.planStops;
  if (!stops?.length) return null;
  const mainStops = stops.filter((s) => s.rowType === 'MAIN');
  if (!mainStops.length) return null;

  const elapsed = -getDaysFromToday(startDateStr);
  const day = elapsed + 1;
  if (day < 1) return null;

  for (const row of mainStops) {
    const parsed = parseDayIndexFromDateCellText(row.dateCellText ?? '');
    if (parsed === day) {
      const dest = row.destinationCellText?.trim();
      return dest && dest.length > 0 ? dest : null;
    }
  }

  const idx = day - 1;
  if (idx >= 0 && idx < mainStops.length) {
    const rowAt = mainStops[idx];
    if (rowAt === undefined) return null;
    const dest = rowAt.destinationCellText?.trim();
    return dest && dest.length > 0 ? dest : null;
  }
  return null;
}

// D-day 뱃지 (여행 출발까지 남은 일수)
function DepartureBadge({ startDate }: { startDate: string }) {
  const days = getDaysFromToday(startDate);
  if (days < 0) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        출발완료
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        D-Day
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        D-{days}
      </span>
    );
  }
  if (days <= 10) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        D-{days}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      D-{days}
    </span>
  );
}

// #N일차 진행중 뱃지
function TripDayBadge({ startDate }: { startDate: string }) {
  const elapsed = -getDaysFromToday(startDate);
  const day = elapsed + 1;
  return (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      #{day}일차 진행중
    </span>
  );
}

// D+N 뱃지 (여행 종료 후 경과일)
function DPlusBadge({ endDate }: { endDate: string }) {
  const elapsed = -getDaysFromToday(endDate);
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      D+{elapsed}
    </span>
  );
}

// 이벤트 뱃지 (드론/스타링크/파워뱅크)
function EventBadges({ trip }: { trip: ConfirmedTripRow }) {
  const items: string[] = [];
  if (trip.rentalDrone) items.push('드론');
  if (trip.rentalStarlink) items.push('스타링크');
  if (trip.rentalPowerbank) items.push('파워뱅크');
  if (items.length === 0) return <span className="text-slate-300">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function getLodgingImageUrl(lodging: ConfirmedTripRow['lodgings'][number]): string | null {
  const fromCover = lodging.accommodation?.coverImageUrl?.trim();
  if (fromCover) return fromCover;
  const urls = lodging.accommodation?.options?.flatMap((option) => option.imageUrls) ?? [];
  return urls[0] ?? null;
}

interface LodgingSummaryGroup {
  name: string;
  nights: number;
  dayIndices: number[];
  firstLodging: ConfirmedTripRow['lodgings'][number];
}

function getLodgingSummaryGroups(trip: ConfirmedTripRow): LodgingSummaryGroup[] {
  const groupByName = new Map<string, LodgingSummaryGroup>();
  const sortedLodgings = [...trip.lodgings].sort((a, b) => a.dayIndex - b.dayIndex);

  for (const lodging of sortedLodgings) {
    const name = lodging.lodgingNameSnapshot.trim();
    if (!name) {
      continue;
    }

    const existing = groupByName.get(name);
    if (existing) {
      existing.nights += 1;
      existing.dayIndices.push(lodging.dayIndex);
      continue;
    }

    groupByName.set(name, {
      name,
      nights: 1,
      dayIndices: [lodging.dayIndex],
      firstLodging: lodging,
    });
  }

  return Array.from(groupByName.values());
}

function formatLodgingGroupLabel(group: LodgingSummaryGroup): string {
  return group.nights > 1 ? `${group.name} · ${group.nights}박` : group.name;
}

function getLodgingSummary(trip: ConfirmedTripRow): string {
  const summary = getLodgingSummaryGroups(trip).map((group) => group.name);
  return summary.length > 0 ? summary.join(', ') : '-';
}

function guideAssignmentDisplayName(a: ConfirmedTripRow['guideAssignments'][number]): string {
  return a.guide.nameKo || a.guide.nameMn || a.nameSnapshot || '';
}

function driverAssignmentDisplayName(a: ConfirmedTripRow['driverAssignments'][number]): string {
  return a.driver.nameMn || a.nameSnapshot || '';
}

function DriverCell({ trip }: { trip: ConfirmedTripRow }): JSX.Element {
  const sorted = sortTripAssignments(trip.driverAssignments);
  if (sorted.length === 0) {
    return <span className="text-slate-300">-</span>;
  }

  const first = sorted[0];
  if (!first) {
    return <span className="text-slate-300">-</span>;
  }

  const primary = driverAssignmentDisplayName(first) || '-';
  const extra = sorted.length - 1;
  const tooltipLines = sorted.map((a) => driverAssignmentDisplayName(a) || '(이름 없음)');

  return (
    <div className="group relative flex min-w-0 items-center gap-2">
      <div className="flex shrink-0 -space-x-2">
        {sorted.slice(0, 3).map((a) => {
          const d = a.driver;
          const label = driverAssignmentDisplayName(a) || '?';
          return (
            <div
              key={a.id}
              title={label}
              className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 ring-1 ring-slate-100"
            >
              {d.profileImageUrl ? (
                <img src={d.profileImageUrl} alt={label} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500">
                  {label.slice(0, 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate">{primary}</span>
          {extra > 0 && (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              +{extra}
            </span>
          )}
        </div>
      </div>
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden min-w-[180px] max-w-xs rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-lg group-hover:block">
        <p className="mb-2 text-xs font-semibold text-slate-500">전체 기사</p>
        <ul className="space-y-1 text-xs text-slate-700">
          {tooltipLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 차량 컬럼: 배정 기사 프로필의 차종(다중 시 고유 종류 요약 + 호버로 기사별 상세) */
function DriverVehiclesCell({ trip }: { trip: ConfirmedTripRow }): JSX.Element {
  const sorted = sortTripAssignments(trip.driverAssignments);
  if (sorted.length === 0) {
    return <span className="text-slate-300">-</span>;
  }

  const labelsOrdered = sorted.map((a) => driverVehicleLabel(a.driver.vehicleType));
  const uniqueLabels = [...new Set(labelsOrdered)];
  const primary = uniqueLabels[0];
  if (!primary) {
    return <span className="text-slate-300">-</span>;
  }
  const extraTypes = uniqueLabels.length - 1;
  const tooltipLines = sorted.map((a) => {
    const name = driverAssignmentDisplayName(a) || '(이름 없음)';
    return `${name} · ${driverVehicleLabel(a.driver.vehicleType)}`;
  });

  return (
    <div className="group relative flex min-w-0 items-center">
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate">{primary}</span>
        {extraTypes > 0 && (
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            +{extraTypes}
          </span>
        )}
      </div>
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden min-w-[200px] max-w-xs rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-lg group-hover:block">
        <p className="mb-2 text-xs font-semibold text-slate-500">기사별 차량</p>
        <ul className="space-y-1 text-xs text-slate-700">
          {tooltipLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GuideCell({ trip }: { trip: ConfirmedTripRow }): JSX.Element {
  const sorted = sortTripAssignments(trip.guideAssignments);
  if (sorted.length === 0) {
    return <span className="text-slate-300">-</span>;
  }

  const first = sorted[0];
  if (!first) {
    return <span className="text-slate-300">-</span>;
  }

  const primary = guideAssignmentDisplayName(first) || '-';
  const extra = sorted.length - 1;
  const tooltipLines = sorted.map((a) => guideAssignmentDisplayName(a) || '(이름 없음)');

  return (
    <div className="group relative flex min-w-0 items-center gap-2">
      <div className="flex shrink-0 -space-x-2">
        {sorted.slice(0, 3).map((a) => {
          const g = a.guide;
          const label = guideAssignmentDisplayName(a) || '?';
          return (
            <div
              key={a.id}
              title={label}
              className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 ring-1 ring-slate-100"
            >
              {g.profileImageUrl ? (
                <img src={g.profileImageUrl} alt={label} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500">
                  {label.slice(0, 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate">{primary}</span>
          {extra > 0 && (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              +{extra}
            </span>
          )}
        </div>
      </div>
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden min-w-[180px] max-w-xs rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-lg group-hover:block">
        <p className="mb-2 text-xs font-semibold text-slate-500">전체 가이드</p>
        <ul className="space-y-1 text-xs text-slate-700">
          {tooltipLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LodgingSummaryCell({ trip }: { trip: ConfirmedTripRow }): JSX.Element {
  const groups = getLodgingSummaryGroups(trip);
  const firstGroup = groups[0];
  if (!firstGroup) {
    return <span className="text-xs text-slate-300">-</span>;
  }

  const imageUrl = getLodgingImageUrl(firstGroup.firstLodging);
  const remainingCount = groups.length - 1;

  return (
    <div className="group relative flex items-center gap-2">
      {imageUrl ? (
        <img src={imageUrl} alt={firstGroup.name} className="h-8 w-10 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-8 w-10 shrink-0 rounded bg-slate-100" />
      )}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium leading-snug text-slate-700">
            {formatLodgingGroupLabel(firstGroup)}
          </span>
          {remainingCount > 0 && (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              +{remainingCount}곳
            </span>
          )}
        </div>
        {groups.length > 1 && (
          <p className="mt-0.5 truncate text-[10px] text-slate-400">
            {groups.slice(1).map(formatLodgingGroupLabel).join(', ')}
          </p>
        )}
      </div>
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-72 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-lg group-hover:block">
        <p className="mb-2 text-xs font-semibold text-slate-500">전체 숙소</p>
        <div className="grid gap-1.5">
          {groups.map((group) => (
            <div key={group.name} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {group.dayIndices.join(', ')}일차
              </span>
              <span className="min-w-0 break-words font-medium text-slate-700">
                {formatLodgingGroupLabel(group)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WarningBadges({ trip }: { trip: ConfirmedTripRow }) {
  const badges: JSX.Element[] = [];
  if (trip.guideAssignments.length === 0) {
    badges.push(
      <span
        key="guide"
        className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
      >
        가이드 미배정
      </span>,
    );
  }
  if (trip.driverAssignments.length === 0) {
    badges.push(
      <span
        key="driver"
        className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
      >
        기사 미배정
      </span>,
    );
  }
  return badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : null;
}

function TripTableListSummaryBar({
  teams,
  paxSum,
  missingPax,
  title = '현재 목록 합계',
}: {
  teams: number;
  paxSum: number;
  missingPax: number;
  title?: string;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
      <span className="text-slate-500">{title}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums text-slate-800">
        <span>
          팀 <strong className="text-base font-semibold text-slate-900">{teams}</strong>
        </span>
        <span className="text-slate-300">·</span>
        <span>
          인원 합 <strong className="text-base font-semibold text-slate-900">{paxSum}</strong>명
        </span>
        {missingPax > 0 ? (
          <span className="text-xs font-normal text-amber-800">
            미입력 {missingPax}건은 합계에서 제외
          </span>
        ) : null}
      </div>
    </div>
  );
}

// 필터별 테이블 헤더 정의
function TripTableHead({
  filter,
  sortKey,
  sortDir,
  onSort,
}: {
  filter: DateFilter;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-slate-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const th = (label: string) => (
    <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">{label}</th>
  );
  const thSort = (label: string, col: SortKey) => (
    <th
      className="cursor-pointer whitespace-nowrap px-4 py-3 font-medium text-slate-600 hover:text-slate-900 select-none"
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} />
    </th>
  );

  return (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50">
        {filter === 'reserved' && thSort('예약일', 'confirmedAt')}
        {th('대표자명')}
        {thSort('여행기간', 'travelStart')}
        {/* 상태 컬럼: D-day / #일차 / D+day */}
        {(filter === 'reserved' || filter === 'upcoming') && th('D-Day')}
        {filter === 'upcoming' && th('한국팀 진행단계')}
        {filter === 'ongoing' && th('#일차')}
        {filter === 'completed' && th('D+day')}
        {filter === 'completed' && th('종료 후 안내')}
        {th('인원')}
        {(filter === 'reserved' || filter === 'upcoming') && th('모집유무')}
        {th('여행지')}
        {th('가이드')}
        {th('기사')}
        {filter !== 'completed' && th('차량')}
        {filter !== 'completed' && th('숙소')}
        {filter !== 'reserved' && th('이벤트')}
      </tr>
    </thead>
  );
}

// 필터별 테이블 행 정의
function TripTableRow({
  trip,
  filter,
  onClick,
  onSaveReservationDate,
  onSaveKoreaTeamStages,
  onSavePostTripTasks,
  onToggleRecruitment,
}: {
  trip: ConfirmedTripRow;
  filter: DateFilter;
  onClick: () => void;
  onSaveReservationDate?: (tripId: string, dateYmd: string) => Promise<void>;
  onSaveKoreaTeamStages?: (tripId: string, optionIds: string[]) => Promise<void>;
  onSavePostTripTasks?: (tripId: string, optionIds: string[]) => Promise<void>;
  onToggleRecruitment?: (tripId: string, nextOpen: boolean) => Promise<void>;
}) {
  const [reservationEditing, setReservationEditing] = useState(false);
  const [reservationDraft, setReservationDraft] = useState('');
  const [reservationSaving, setReservationSaving] = useState(false);
  const [recruitmentSaving, setRecruitmentSaving] = useState(false);

  const startStr = getTripStartDate(trip);
  const endStr = getTripEndDate(trip);
  const headcount = getTripHeadcount(trip);
  const ongoingDestinationLabel =
    filter === 'ongoing' && startStr ? getOngoingTripCurrentDestinationText(trip, startStr) : null;

  function confirmedAtToInput(iso: string): string {
    return iso.split('T')[0] ?? '';
  }

  async function commitReservationDate(): Promise<void> {
    if (!onSaveReservationDate || !reservationDraft) {
      setReservationEditing(false);
      return;
    }
    const prev = confirmedAtToInput(trip.confirmedAt);
    if (reservationDraft === prev) {
      setReservationEditing(false);
      return;
    }
    setReservationSaving(true);
    try {
      await onSaveReservationDate(trip.id, reservationDraft);
      setReservationEditing(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setReservationSaving(false);
    }
  }

  return (
    <tr
      className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
      onClick={onClick}
    >
      {/* 예약일 (예약표 전용) */}
      {filter === 'reserved' && (
        <td
          className="whitespace-nowrap px-4 py-3 text-xs text-slate-500"
          onClick={(e) => e.stopPropagation()}
        >
          {reservationEditing ? (
            <input
              type="date"
              className="max-w-[11rem] rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
              value={reservationDraft}
              disabled={reservationSaving}
              onChange={(e) => setReservationDraft(e.target.value)}
              onBlur={() => {
                void commitReservationDate();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === 'Escape') {
                  setReservationEditing(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="rounded-lg px-1.5 py-0.5 text-left text-slate-500 underline-offset-2 hover:bg-slate-100 hover:text-slate-800 hover:underline"
              onClick={() => {
                setReservationDraft(confirmedAtToInput(trip.confirmedAt));
                setReservationEditing(true);
              }}
            >
              {new Date(trip.confirmedAt).toLocaleDateString('ko-KR')}
            </button>
          )}
        </td>
      )}
      {/* 대표자명 */}
      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
        <span className="inline-flex items-center gap-1.5">
          <span>{getTripLeaderName(trip)}</span>
          {isConfirmedTripRecentReturn(trip.id) ? (
            <span className="text-xs font-medium text-blue-600">방금</span>
          ) : null}
        </span>
      </td>
      {/* 여행기간 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {startStr && endStr ? formatDateRange(startStr, endStr) : '-'}
      </td>
      {/* D-Day */}
      {(filter === 'reserved' || filter === 'upcoming') && (
        <td className="whitespace-nowrap px-4 py-3">
          {startStr ? <DepartureBadge startDate={startStr} /> : '-'}
        </td>
      )}
      {filter === 'upcoming' && (
        <td className="min-w-[13rem] px-4 py-3 text-slate-700" onClick={(e) => e.stopPropagation()}>
          <KoreaTeamStageMultiSelect
            selected={trip.koreaTeamStages}
            compact
            onChange={async (optionIds) => {
              if (onSaveKoreaTeamStages) {
                await onSaveKoreaTeamStages(trip.id, optionIds);
              }
            }}
          />
        </td>
      )}
      {/* #일차 진행중 */}
      {filter === 'ongoing' && (
        <td className="px-4 py-3 align-top">
          {startStr ? (
            <div className="flex max-w-[14rem] flex-col gap-0.5">
              <TripDayBadge startDate={startStr} />
              {ongoingDestinationLabel ? (
                <span className="text-xs leading-snug text-slate-500">현재: {ongoingDestinationLabel}</span>
              ) : null}
            </div>
          ) : (
            '-'
          )}
        </td>
      )}
      {/* D+day */}
      {filter === 'completed' && (
        <td className="whitespace-nowrap px-4 py-3">
          {endStr ? <DPlusBadge endDate={endStr} /> : '-'}
        </td>
      )}
      {filter === 'completed' && (
        <td className="min-w-[13rem] px-4 py-3 text-slate-700" onClick={(e) => e.stopPropagation()}>
          <PostTripTaskMultiSelect
            selected={trip.postTripTasks}
            compact
            onChange={async (optionIds) => {
              if (onSavePostTripTasks) {
                await onSavePostTripTasks(trip.id, optionIds);
              }
            }}
          />
        </td>
      )}
      {/* 인원 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{headcount ?? '-'}</td>
      {/* 모집유무 */}
      {(filter === 'reserved' || filter === 'upcoming') && (
        <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <RecruitmentStatusToggle
            open={trip.isRecruitingOpen}
            saving={recruitmentSaving}
            disabled={!onToggleRecruitment}
            onToggle={async (nextOpen) => {
              if (!onToggleRecruitment) return;
              setRecruitmentSaving(true);
              try {
                await onToggleRecruitment(trip.id, nextOpen);
              } catch (error) {
                window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
              } finally {
                setRecruitmentSaving(false);
              }
            }}
          />
        </td>
      )}
      {/* 여행지 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{getTripDestination(trip)}</td>
      {/* 가이드 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        <GuideCell trip={trip} />
      </td>
      {/* 기사 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        <DriverCell trip={trip} />
      </td>
      {/* 차량 (여행 완료 제외) — 배정 기사 마스터 차종 */}
      {filter !== 'completed' && (
        <td className="max-w-[12rem] px-4 py-3 text-slate-700">
          <DriverVehiclesCell trip={trip} />
        </td>
      )}
      {/* 숙소 (여행 완료 제외) */}
      {filter !== 'completed' && (
        <td className="max-w-[200px] px-4 py-3 text-slate-700">
          <LodgingSummaryCell trip={trip} />
        </td>
      )}
      {/* 이벤트 (예약표 제외) */}
      {filter !== 'reserved' && (
        <td className="whitespace-nowrap px-4 py-3">
          <EventBadges trip={trip} />
        </td>
      )}
    </tr>
  );
}

export function ConfirmedTripsPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { trips: allTrips, loading } = useConfirmedTrips('ACTIVE');
  const { updateConfirmedTrip } = useUpdateConfirmedTrip();
  const navigate = useNavigate();
  const [, bumpRecentReturnUi] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = window.setInterval(() => bumpRecentReturnUi(), 15_000);
    return () => window.clearInterval(id);
  }, []);

  // ── 직접 추가 모달 상태 ───────────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { createConfirmedTripDirect, loading: creatingDirect } = useCreateConfirmedTripDirect();

  async function handleCreateDirect(payload: {
    userId: string;
    travelStart?: string | null;
    travelEnd?: string | null;
    destination?: string | null;
    paxCount?: number | null;
    totalAmountKrw?: number | null;
    depositAmountKrw?: number | null;
    balanceAmountKrw?: number | null;
    securityDepositAmountKrw?: number | null;
  }) {
    await createConfirmedTripDirect(payload);
    setCreateModalOpen(false);
    navigate(`/confirmed-trips`);
  }

  // ── CalendarNote 상태 ──────────────────────────────────────────────────────
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalDate, setNoteModalDate] = useState('');
  const [editingNote, setEditingNote] = useState<CalendarNoteRow | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);

  const { year: nowYear, month: nowMonth } = getNow();
  const calYear = Number(searchParams.get('cy')) || nowYear;
  const calMonth = Number(searchParams.get('cm')) || nowMonth;

  const { notes, refetch: refetchNotes } = useCalendarNotes(calYear, calMonth);
  const { createCalendarNote, loading: creating } = useCreateCalendarNote();
  const { updateCalendarNote, loading: updating } = useUpdateCalendarNote();
  const { deleteCalendarNote } = useDeleteCalendarNote();

  function openAddNote(date: string) {
    setEditingNote(null);
    setNoteModalDate(date);
    setNoteModalOpen(true);
  }

  function openEditNote(note: CalendarNoteRow) {
    setEditingNote(note);
    setNoteModalDate('');
    setNoteModalOpen(true);
  }

  async function handleNoteSave(payload: Parameters<typeof createCalendarNote>[0]) {
    if (editingNote) {
      await updateCalendarNote(editingNote.id, payload);
    } else {
      await createCalendarNote(payload);
    }
    await refetchNotes();
    setNoteModalOpen(false);
  }

  async function handleNoteDelete() {
    if (!editingNote) return;
    await deleteCalendarNote(editingNote.id);
    await refetchNotes();
    setNoteModalOpen(false);
  }

  const dateFilter: DateFilter = (searchParams.get('filter') as DateFilter | null) ?? 'upcoming';
  const rentalItemFilters = parseRentalItemFilters(searchParams.get('rentalItem'));
  const sortKey: SortKey = (searchParams.get('sortKey') as SortKey | null) ?? 'travelStart';
  const sortDir: SortDir = (searchParams.get('sortDir') as SortDir | null) ?? 'asc';
  const listSearchQuery = searchParams.get('q') ?? '';
  const normalizedListSearchQuery = normalizeTripSearchText(listSearchQuery);

  const aggFrom = searchParams.get('aggFrom') ?? '';
  const aggTo = searchParams.get('aggTo') ?? '';
  const aggRegionParam = searchParams.get('aggRegion');
  const aggRegions = useMemo(() => parseAggRegionsParam(aggRegionParam), [aggRegionParam]);

  const departureRangeHint = useMemo(() => {
    if (!aggFrom || !aggTo) return null;
    const regionFiltered =
      aggRegions.length === 0
        ? allTrips
        : allTrips.filter((t) => tripMatchesAggRegions(t, aggRegions));
    const noStart = regionFiltered.filter((t) => !getTripStartDate(t)).length;
    if (noStart <= 0) return null;
    return `출발일 미입력 ${noStart}건은 구간 조건에서 제외됩니다. (현재 지역 기준)`;
  }, [allTrips, aggFrom, aggTo, aggRegions]);

  const tripsFilteredBase = useMemo(
    () =>
      filterTripsByAggScope(
        applyRentalItemFilter(applyDateFilter(allTrips, dateFilter), rentalItemFilters, notes),
        aggFrom,
        aggTo,
        aggRegions,
      ),
    [allTrips, dateFilter, rentalItemFilters, notes, aggFrom, aggTo, aggRegions],
  );

  const searchedTrips = useMemo(
    () => applyTripSearch(tripsFilteredBase, listSearchQuery),
    [tripsFilteredBase, listSearchQuery],
  );

  const listViewStats = useMemo(() => {
    let paxSum = 0;
    let missingPax = 0;
    for (const t of searchedTrips) {
      const h = getTripHeadcount(t);
      if (h == null) missingPax += 1;
      else paxSum += h;
    }
    return { teams: searchedTrips.length, paxSum, missingPax };
  }, [searchedTrips]);

  const trips = useMemo(
    () => applySort(searchedTrips, sortKey, sortDir),
    [searchedTrips, sortKey, sortDir],
  );

  const calendarTrips = useMemo(
    () =>
      filterTripsByAggScope(
        applyRentalItemFilter(allTrips, rentalItemFilters, notes),
        aggFrom,
        aggTo,
        aggRegions,
        { calendarIncludeExternalTransferDates: true },
      ),
    [allTrips, rentalItemFilters, notes, aggFrom, aggTo, aggRegions],
  );

  const calendarViewStats = useMemo(() => {
    let paxSum = 0;
    let missingPax = 0;
    for (const t of calendarTrips) {
      const h = getTripHeadcount(t);
      if (h == null) missingPax += 1;
      else paxSum += h;
    }
    return { teams: calendarTrips.length, paxSum, missingPax };
  }, [calendarTrips]);

  const equipmentRentalFilter = getSingleEquipmentRentalFilter(rentalItemFilters);
  const { stock: tourListRentalStock } = useTourListRentalItemStock();
  const dailyRentalOccupancy = useMemo(() => {
    if (!equipmentRentalFilter) return null;
    const conflicts = buildEquipmentRentalConflicts(allTrips, equipmentRentalFilter);
    return {
      total: getEquipmentStockTotal(tourListRentalStock, equipmentRentalFilter),
      countsByDate: countDailyOccupancy(conflicts, calYear, calMonth),
    };
  }, [allTrips, calMonth, calYear, equipmentRentalFilter, tourListRentalStock]);

  function toggleSort(key: SortKey) {
    setSearchParams(
      (prev) => {
        const currentKey = prev.get('sortKey') ?? 'travelStart';
        const currentDir = prev.get('sortDir') ?? 'asc';
        if (currentKey === key) {
          prev.set('sortDir', currentDir === 'asc' ? 'desc' : 'asc');
        } else {
          prev.set('sortKey', key);
          prev.set('sortDir', 'asc');
        }
        return prev;
      },
      { replace: true },
    );
  }

  const viewMode: ViewMode = searchParams.get('view') === 'calendar' ? 'calendar' : 'list';

  function setViewMode(mode: ViewMode) {
    setSearchParams(
      (prev) => {
        prev.set('view', mode);
        return prev;
      },
      { replace: true },
    );
  }

  function setCalendarMonth(year: number, month: number) {
    setSearchParams(
      (prev) => {
        prev.set('cy', String(year));
        prev.set('cm', String(month));
        return prev;
      },
      { replace: true },
    );
  }

  function toggleRentalItemFilter(value: RentalItemFilter) {
    setSearchParams(
      (prev) => {
        const current = parseRentalItemFilters(prev.get('rentalItem'));
        const exists = current.includes(value);
        const next = exists ? current.filter((item) => item !== value) : [...current, value];
        if (next.length === 0) prev.delete('rentalItem');
        else prev.set('rentalItem', next.join(','));
        return prev;
      },
      { replace: true },
    );
  }

  function clearRentalItemFilters() {
    setSearchParams(
      (prev) => {
        prev.delete('rentalItem');
        return prev;
      },
      { replace: true },
    );
  }

  function toggleAggRegion(value: TripRegionBucket) {
    setSearchParams(
      (prev) => {
        const current = parseAggRegionsParam(prev.get('aggRegion'));
        const exists = current.includes(value);
        const next = exists ? current.filter((item) => item !== value) : [...current, value];
        if (next.length === 0) prev.delete('aggRegion');
        else prev.set('aggRegion', next.join(','));
        return prev;
      },
      { replace: true },
    );
  }

  function clearAggDateRange() {
    setSearchParams(
      (prev) => {
        prev.delete('aggFrom');
        prev.delete('aggTo');
        return prev;
      },
      { replace: true },
    );
  }

  function clearAggRegionOnly() {
    setSearchParams(
      (prev) => {
        prev.delete('aggRegion');
        return prev;
      },
      { replace: true },
    );
  }

  const aggFilterActive = Boolean(aggFrom || aggTo || aggRegions.length > 0);

  const baseEmptyByDate: Record<DateFilter, string> = {
    reserved: '확정된 여행이 없습니다.',
    upcoming: '예정된 투어가 없습니다.',
    ongoing: '현재 여행중인 투어가 없습니다.',
    completed: '완료된 투어가 없습니다.',
  };
  const emptyMessage =
    trips.length === 0 &&
    (aggFilterActive || rentalItemFilters.length > 0 || normalizedListSearchQuery) &&
    allTrips.length > 0
      ? '선택한 필터 조건에 맞는 투어가 없습니다.'
      : baseEmptyByDate[dateFilter];

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">투어 리스트</h1>
          <p className="mt-1 text-sm text-slate-600">확정된 여행 건의 운영 현황을 확인합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + 직접 추가
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 날짜 기준 필터 */}
        <div className="flex gap-2">
          {DATE_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                dateFilter === value
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() =>
                setSearchParams(
                  (prev) => {
                    prev.set('filter', value);
                    return prev;
                  },
                  { replace: true },
                )
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* 뷰 전환 토글 */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
            리스트
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <path d="M5 2v2M11 2v2M2 7h12" strokeLinecap="round" />
            </svg>
            캘린더
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[5rem_1fr] items-start gap-x-3 gap-y-2">
          <div className={`${FILTER_TITLE_COL_CLASS} pt-1.5`}>출발 구간</div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRangePickerOpen(true)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                aggFrom && aggTo
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {formatAggRangeButtonLabel(aggFrom, aggTo)}
            </button>
            {aggFrom || aggTo ? (
              <button
                type="button"
                onClick={clearAggDateRange}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                구간 초기화
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-[5rem_1fr] items-start gap-x-3 gap-y-2">
          <div className={`${FILTER_TITLE_COL_CLASS} pt-1.5`}>지역</div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {TRIP_REGION_FILTER_OPTIONS.map(({ value, label }) => {
              if (value === 'ALL') {
                const active = aggRegions.length === 0;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => clearAggRegionOnly()}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              }
              const active = aggRegions.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleAggRegion(value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {aggRegions.length > 0 ? (
              <button
                type="button"
                onClick={clearAggRegionOnly}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                지역 초기화
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-[5rem_1fr] items-start gap-x-3 gap-y-2">
          <div className={`${FILTER_TITLE_COL_CLASS} pt-1.5`}>장비 필터</div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {RENTAL_ITEM_FILTER_OPTIONS.map(({ value, label }) => {
              const active = rentalItemFilters.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleRentalItemFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {rentalItemFilters.length > 0 ? (
              <button
                type="button"
                onClick={clearRentalItemFilters}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                장비 초기화
              </button>
            ) : null}
          </div>
        </div>

        {departureRangeHint ? (
          <div className="grid grid-cols-[5rem_1fr] gap-x-3">
            <div aria-hidden className="min-h-0" />
            <p className="text-xs text-slate-500">{departureRangeHint}</p>
          </div>
        ) : null}
      </div>

      {loading && allTrips.length === 0 ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <>
          {loading && allTrips.length > 0 ? (
            <p className="px-1 text-xs text-slate-500">목록을 최신 데이터와 동기화하는 중...</p>
          ) : null}
          {viewMode === 'calendar' ? (
        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TripTableListSummaryBar
            title="캘린더 합계 (예정·완료 탭 미적용)"
            teams={calendarViewStats.teams}
            paxSum={calendarViewStats.paxSum}
            missingPax={calendarViewStats.missingPax}
          />
          <ConfirmedTripCalendar
            trips={calendarTrips}
            notes={notes}
            year={calYear}
            month={calMonth}
            onChangeMonth={setCalendarMonth}
            onRequestAddNote={openAddNote}
            onRequestEditNote={openEditNote}
            dailyRentalOccupancy={dailyRentalOccupancy}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-start gap-2 border-b border-slate-100 bg-white px-4 py-3">
            <label className="w-full min-w-[16rem] md:w-[28rem]">
              <span className="sr-only">투어 리스트 검색</span>
              <input
                type="search"
                value={listSearchQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchParams(
                    (prev) => {
                      if (value.trim()) prev.set('q', value);
                      else prev.delete('q');
                      return prev;
                    },
                    { replace: true },
                  );
                }}
                placeholder="대표자, 여행지, 가이드, 기사, 차량, 숙소 검색"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </label>
            {normalizedListSearchQuery ? (
              <button
                type="button"
                onClick={() =>
                  setSearchParams(
                    (prev) => {
                      prev.delete('q');
                      return prev;
                    },
                    { replace: true },
                  )
                }
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                검색 초기화
              </button>
            ) : null}
          </div>
          <TripTableListSummaryBar
            teams={listViewStats.teams}
            paxSum={listViewStats.paxSum}
            missingPax={listViewStats.missingPax}
          />
          {trips.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">{emptyMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <TripTableHead
                  filter={dateFilter}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <tbody>
                  {trips.map((trip) => (
                    <TripTableRow
                      key={trip.id}
                      trip={trip}
                      filter={dateFilter}
                      onClick={() => navigate(`/confirmed-trips/${trip.id}`)}
                      onSaveReservationDate={
                        dateFilter === 'reserved'
                          ? async (tripId, dateYmd) => {
                              await updateConfirmedTrip(tripId, {
                                confirmedAt: `${dateYmd}T00:00:00.000Z`,
                              });
                            }
                          : undefined
                      }
                      onSaveKoreaTeamStages={async (tripId, optionIds) => {
                        await updateConfirmedTrip(tripId, {
                          koreaTeamStageOptionIds: optionIds,
                        });
                      }}
                      onSavePostTripTasks={async (tripId, optionIds) => {
                        await updateConfirmedTrip(tripId, {
                          postTripTaskOptionIds: optionIds,
                        });
                      }}
                      onToggleRecruitment={async (tripId, nextOpen) => {
                        await updateConfirmedTrip(tripId, {
                          isRecruitingOpen: nextOpen,
                        });
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
          )}
        </>
      )}
      <CalendarNoteModal
        open={noteModalOpen}
        initialDate={noteModalDate}
        note={editingNote}
        confirmedTrips={allTrips}
        saving={creating || updating}
        onSave={handleNoteSave}
        onDelete={editingNote ? handleNoteDelete : undefined}
        onClose={() => setNoteModalOpen(false)}
      />

      <CreateConfirmedTripModal
        open={createModalOpen}
        saving={creatingDirect}
        onSave={handleCreateDirect}
        onClose={() => setCreateModalOpen(false)}
      />

      <DateRangePickerModal
        open={rangePickerOpen}
        from={aggFrom}
        to={aggTo}
        onClose={() => setRangePickerOpen(false)}
        onConfirm={(f, t) => {
          setSearchParams(
            (prev) => {
              if (f) prev.set('aggFrom', f);
              else prev.delete('aggFrom');
              if (t) prev.set('aggTo', t);
              else prev.delete('aggTo');
              return prev;
            },
            { replace: true },
          );
        }}
      />
    </section>
  );
}
