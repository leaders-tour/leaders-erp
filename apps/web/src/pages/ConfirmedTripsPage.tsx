import { Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirmedTrips, type ConfirmedTripRow } from '../features/confirmed-trip/hooks';

type StatusFilter = 'ACTIVE' | 'CANCELLED' | undefined;

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
  const selections = trip.planVersion.meta?.lodgingSelections ?? [];
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const { trips, loading } = useConfirmedTrips(statusFilter);
  const navigate = useNavigate();

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">투어 리스트</h1>
        <p className="mt-1 text-sm text-slate-600">
          확정된 여행 건의 운영 현황을 확인합니다.
        </p>
      </header>

      <div className="flex gap-2">
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setStatusFilter('ACTIVE')}
        >
          확정
        </button>
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            statusFilter === 'CANCELLED'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setStatusFilter('CANCELLED')}
        >
          취소됨
        </button>
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            statusFilter === undefined
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setStatusFilter(undefined)}
        >
          전체
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : trips.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          확정된 투어가 없습니다.
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
                  const meta = trip.planVersion.meta;
                  const pricing = trip.planVersion.pricing;
                  return (
                    <tr
                      key={trip.id}
                      className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                      onClick={() => navigate(`/confirmed-trips/${trip.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {meta?.leaderName ?? trip.user.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {meta ? formatDateRange(meta.travelStartDate, meta.travelEndDate) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {meta ? <DepartureBadge startDate={meta.travelStartDate} /> : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {meta?.headcountTotal ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {trip.plan.regionSet.name}
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
                        {pricing ? formatKrw(pricing.totalAmountKrw) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {pricing ? formatKrw(pricing.depositAmountKrw) : '-'}
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
