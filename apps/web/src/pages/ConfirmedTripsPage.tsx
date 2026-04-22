import { Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarNoteModal } from '../features/confirmed-trip/CalendarNoteModal';
import { ConfirmedTripCalendar } from '../features/confirmed-trip/ConfirmedTripCalendar';
import { CreateConfirmedTripModal } from '../features/confirmed-trip/CreateConfirmedTripModal';
import {
  useCalendarNotes,
  useConfirmedTrips,
  useCreateCalendarNote,
  useCreateConfirmedTripDirect,
  useUpdateCalendarNote,
  useDeleteCalendarNote,
  getTripStartDate,
  getTripEndDate,
  getTripLeaderName,
  getTripHeadcount,
  getTripDestination,
  getTripPickupDate,
  getTripDropDate,
  type CalendarNoteRow,
  type ConfirmedTripRow,
} from '../features/confirmed-trip/hooks';

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

const RENTAL_ITEM_FILTER_OPTIONS: Array<{ value: RentalItemFilter; label: string }> = [
  { value: 'drone', label: '드론' },
  { value: 'starlink', label: '스타링크' },
  { value: 'powerbank', label: '파워뱅크' },
  { value: 'camelDoll', label: '낙타인형 구매' },
  { value: 'pickup', label: '픽업 있음' },
  { value: 'drop', label: '드랍 있음' },
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

function applyRentalItemFilter(
  trips: ConfirmedTripRow[],
  filter: RentalItemFilter | null,
): ConfirmedTripRow[] {
  if (!filter) return trips;
  return trips.filter((trip) => {
    if (filter === 'drone') return trip.rentalDrone;
    if (filter === 'starlink') return trip.rentalStarlink;
    if (filter === 'powerbank') return trip.rentalPowerbank;
    if (filter === 'camelDoll') return trip.camelDollPurchased;
    if (filter === 'pickup') return getTripPickupDate(trip) !== null;
    if (filter === 'drop') return getTripDropDate(trip) !== null;
    return false;
  });
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

// D-day 뱃지 (여행 출발까지 남은 일수)
function DepartureBadge({ startDate }: { startDate: string }) {
  const days = getDaysFromToday(startDate);
  if (days < 0) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">출발완료</span>;
  }
  if (days === 0) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">D-Day</span>;
  }
  if (days <= 3) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">D-{days}</span>;
  }
  if (days <= 10) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">D-{days}</span>
    );
  }
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">D-{days}</span>;
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

// 모집 뱃지
function RecruitmentBadge({ open }: { open: boolean }) {
  if (open) {
    return <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">모집중</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">마감</span>;
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
        <span key={item} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function getLodgingSummary(trip: ConfirmedTripRow): string {
  if (trip.accommodationNote) return trip.accommodationNote;
  const selections = trip.planVersion?.meta?.lodgingSelections ?? [];
  const names = [
    ...new Set(
      selections
        .map((s) => s.customLodgingNameSnapshot)
        .filter((n): n is string => !!n),
    ),
  ];
  return names.length > 0 ? names.join(', ') : '-';
}

function WarningBadges({ trip }: { trip: ConfirmedTripRow }) {
  const badges: JSX.Element[] = [];
  if (!trip.guideName) {
    badges.push(
      <span key="guide" className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
        가이드 미배정
      </span>,
    );
  }
  if (!trip.driverName) {
    badges.push(
      <span key="driver" className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
        기사 미배정
      </span>,
    );
  }
  return badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : null;
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
      {label}<SortIcon col={col} />
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
        {filter === 'ongoing' && th('#일차')}
        {filter === 'completed' && th('D+day')}
        {th('인원')}
        {(filter === 'reserved' || filter === 'upcoming') && th('모집유무')}
        {th('여행지')}
        {th('가이드')}
        {th('기사')}
        {(filter !== 'completed') && th('차량')}
        {(filter !== 'completed') && th('숙소')}
        {(filter !== 'reserved') && th('이벤트')}
      </tr>
    </thead>
  );
}

// 필터별 테이블 행 정의
function TripTableRow({
  trip,
  filter,
  onClick,
}: {
  trip: ConfirmedTripRow;
  filter: DateFilter;
  onClick: () => void;
}) {
  const startStr = getTripStartDate(trip);
  const endStr = getTripEndDate(trip);
  const headcount = getTripHeadcount(trip);

  return (
    <tr
      className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
      onClick={onClick}
    >
      {/* 예약일 (예약표 전용) */}
      {filter === 'reserved' && (
        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
          {new Date(trip.confirmedAt).toLocaleDateString('ko-KR')}
        </td>
      )}
      {/* 대표자명 */}
      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
        {getTripLeaderName(trip)}
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
      {/* #일차 진행중 */}
      {filter === 'ongoing' && (
        <td className="whitespace-nowrap px-4 py-3">
          {startStr ? <TripDayBadge startDate={startStr} /> : '-'}
        </td>
      )}
      {/* D+day */}
      {filter === 'completed' && (
        <td className="whitespace-nowrap px-4 py-3">
          {endStr ? <DPlusBadge endDate={endStr} /> : '-'}
        </td>
      )}
      {/* 인원 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {headcount ?? '-'}
      </td>
      {/* 모집유무 */}
      {(filter === 'reserved' || filter === 'upcoming') && (
        <td className="whitespace-nowrap px-4 py-3">
          <RecruitmentBadge open={trip.isRecruitingOpen} />
        </td>
      )}
      {/* 여행지 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {getTripDestination(trip)}
      </td>
      {/* 가이드 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {trip.guideName ?? '-'}
      </td>
      {/* 기사 */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {trip.driverName ?? '-'}
      </td>
      {/* 차량 (여행 완료 제외) */}
      {filter !== 'completed' && (
        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
          {trip.assignedVehicle ?? trip.planVersion?.meta?.vehicleType ?? '-'}
        </td>
      )}
      {/* 숙소 (여행 완료 제외) */}
      {filter !== 'completed' && (
        <td className="max-w-[200px] px-4 py-3 text-slate-700">
          <span className="line-clamp-2 text-xs leading-snug">
            {getLodgingSummary(trip)}
          </span>
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
  const navigate = useNavigate();

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

  const dateFilter: DateFilter =
    (searchParams.get('filter') as DateFilter | null) ?? 'upcoming';
  const rentalItemFilter =
    (searchParams.get('rentalItem') as RentalItemFilter | null) ?? null;
  const sortKey: SortKey = (searchParams.get('sortKey') as SortKey | null) ?? 'travelStart';
  const sortDir: SortDir = (searchParams.get('sortDir') as SortDir | null) ?? 'asc';

  const trips = applySort(
    applyRentalItemFilter(applyDateFilter(allTrips, dateFilter), rentalItemFilter),
    sortKey,
    sortDir,
  );
  const calendarTrips = applyRentalItemFilter(allTrips, rentalItemFilter);

  function toggleSort(key: SortKey) {
    setSearchParams((prev) => {
      const currentKey = prev.get('sortKey') ?? 'travelStart';
      const currentDir = prev.get('sortDir') ?? 'asc';
      if (currentKey === key) {
        prev.set('sortDir', currentDir === 'asc' ? 'desc' : 'asc');
      } else {
        prev.set('sortKey', key);
        prev.set('sortDir', 'asc');
      }
      return prev;
    }, { replace: true });
  }

  const viewMode: ViewMode = searchParams.get('view') === 'calendar' ? 'calendar' : 'list';

  function setViewMode(mode: ViewMode) {
    setSearchParams((prev) => { prev.set('view', mode); return prev; }, { replace: true });
  }

  function setCalendarMonth(year: number, month: number) {
    setSearchParams(
      (prev) => { prev.set('cy', String(year)); prev.set('cm', String(month)); return prev; },
      { replace: true },
    );
  }

  function setRentalItemFilter(nextFilter: RentalItemFilter | null) {
    setSearchParams(
      (prev) => {
        if (nextFilter) prev.set('rentalItem', nextFilter);
        else prev.delete('rentalItem');
        return prev;
      },
      { replace: true },
    );
  }

  const emptyMessage = {
    reserved: '확정된 여행이 없습니다.',
    upcoming: '예정된 투어가 없습니다.',
    ongoing: '현재 여행중인 투어가 없습니다.',
    completed: '완료된 투어가 없습니다.',
  }[dateFilter];

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">투어 리스트</h1>
          <p className="mt-1 text-sm text-slate-600">
            확정된 여행 건의 운영 현황을 확인합니다.
          </p>
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
                  (prev) => { prev.set('filter', value); return prev; },
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
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
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
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <path d="M5 2v2M11 2v2M2 7h12" strokeLinecap="round" />
            </svg>
            캘린더
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-500">장비 필터</span>
        {RENTAL_ITEM_FILTER_OPTIONS.map(({ value, label }) => {
          const active = rentalItemFilter === value;
          const dimmed = rentalItemFilter !== null && !active;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRentalItemFilter(active ? null : value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${dimmed ? 'opacity-40' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : viewMode === 'calendar' ? (
        <ConfirmedTripCalendar
          trips={calendarTrips}
          notes={notes}
          year={calYear}
          month={calMonth}
          onChangeMonth={setCalendarMonth}
          onRequestAddNote={openAddNote}
          onRequestEditNote={openEditNote}
        />
      ) : trips.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {emptyMessage}
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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

    </section>
  );
}
