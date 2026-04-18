import { Card } from '@tour/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmedTripCalendar } from '../features/confirmed-trip/ConfirmedTripCalendar';
import {
  useConfirmedTrips,
  getTripStartDate,
  getTripEndDate,
  getTripLeaderName,
  getTripHeadcount,
  getTripDestination,
  type ConfirmedTripRow,
} from '../features/confirmed-trip/hooks';

type DateFilter = 'upcoming' | 'ongoing' | 'completed';
type ViewMode = 'list' | 'calendar';
type RentalItemFilter = 'drone' | 'starlink' | 'powerbank' | 'camelDoll';

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'upcoming', label: '여행 예정' },
  { value: 'ongoing', label: '여행중' },
  { value: 'completed', label: '여행 완료' },
];

const RENTAL_ITEM_FILTER_OPTIONS: Array<{ value: RentalItemFilter; label: string }> = [
  { value: 'drone', label: '드론' },
  { value: 'starlink', label: '스타링크' },
  { value: 'powerbank', label: '파워뱅크' },
  { value: 'camelDoll', label: '낙타인형 구매' },
];

function getTodayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function applyDateFilter(trips: ConfirmedTripRow[], filter: DateFilter): ConfirmedTripRow[] {
  const today = getTodayMidnight();
  const filtered = trips.filter((trip) => {
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

  // 출발일 오름차순 정렬 (곧 출발하는 순서)
  return filtered.sort((a, b) => {
    const aStr = getTripStartDate(a);
    const bStr = getTripStartDate(b);
    if (!aStr) return 1;
    if (!bStr) return -1;
    return new Date(aStr).getTime() - new Date(bStr).getTime();
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
    return trip.camelDollPurchased;
  });
}

function getNow() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

const currencyFormatter = new Intl.NumberFormat('ko-KR');
function formatKrw(value: number): string {
  return `${currencyFormatter.format(value)}원`;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(s)} → ${fmt(e)}`;
}

function getDaysUntilDeparture(startDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DepartureBadge({ startDate }: { startDate: string }) {
  const days = getDaysUntilDeparture(startDate);
  if (days < 0) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">출발완료</span>;
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

function StatusBadge({ status }: { status: 'ACTIVE' | 'CANCELLED' }) {
  if (status === 'CANCELLED') {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">취소</span>;
  }
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">확정</span>;
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

export function ConfirmedTripsPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { trips: allTrips, loading } = useConfirmedTrips('ACTIVE');
  const navigate = useNavigate();

  const dateFilter: DateFilter =
    (searchParams.get('filter') as DateFilter | null) ?? 'upcoming';
  const rentalItemFilter =
    (searchParams.get('rentalItem') as RentalItemFilter | null) ?? null;
  const trips = applyRentalItemFilter(applyDateFilter(allTrips, dateFilter), rentalItemFilter);
  const calendarTrips = applyRentalItemFilter(allTrips, rentalItemFilter);

  const viewMode: ViewMode = searchParams.get('view') === 'calendar' ? 'calendar' : 'list';
  const { year: nowYear, month: nowMonth } = getNow();
  const calYear = Number(searchParams.get('cy')) || nowYear;
  const calMonth = Number(searchParams.get('cm')) || nowMonth;

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

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">투어 리스트</h1>
        <p className="mt-1 text-sm text-slate-600">
          확정된 여행 건의 운영 현황을 확인합니다.
        </p>
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
          year={calYear}
          month={calMonth}
          onChangeMonth={setCalendarMonth}
        />
      ) : trips.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {dateFilter === 'upcoming' && '예정된 투어가 없습니다.'}
          {dateFilter === 'ongoing' && '현재 여행중인 투어가 없습니다.'}
          {dateFilter === 'completed' && '완료된 투어가 없습니다.'}
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">대표자</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">여행기간</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">D-Day</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">인원</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">여행지</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">가이드</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">기사</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">차량</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">숙소</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">총액</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">예약금</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">상태</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">경고</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const meta = trip.planVersion?.meta ?? null;
                  const pricing = trip.planVersion?.pricing ?? null;
                  const startStr = getTripStartDate(trip);
                  const endStr = getTripEndDate(trip);
                  const headcount = getTripHeadcount(trip);
                  return (
                    <tr
                      key={trip.id}
                      className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                      onClick={() => navigate(`/confirmed-trips/${trip.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {getTripLeaderName(trip)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {startStr && endStr ? formatDateRange(startStr, endStr) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {startStr ? <DepartureBadge startDate={startStr} /> : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {headcount ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {getTripDestination(trip)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {trip.guideName ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {trip.driverName ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {trip.assignedVehicle ?? meta?.vehicleType ?? '-'}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-slate-700">
                        <span className="line-clamp-2 text-xs leading-snug">
                          {getLodgingSummary(trip)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {pricing
                          ? formatKrw(pricing.totalAmountKrw)
                          : trip.totalAmountKrw != null
                            ? formatKrw(trip.totalAmountKrw)
                            : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {pricing
                          ? formatKrw(pricing.depositAmountKrw)
                          : trip.depositAmountKrw != null
                            ? formatKrw(trip.depositAmountKrw)
                            : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={trip.status} />
                      </td>
                      <td className="px-4 py-3">
                        <WarningBadges trip={trip} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
