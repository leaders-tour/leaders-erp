import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirmedTrip, useUpdateConfirmedTrip } from '../features/confirmed-trip/hooks';
import { LodgingSection } from '../features/confirmed-trip/LodgingSection';
import { useGuides, type GuideRow } from '../features/guide/hooks';
import { useDrivers, type DriverRow } from '../features/driver/hooks';

// ── 가이드 카드 ──────────────────────────────────────────────────────────────

const GUIDE_LEVEL_LABELS: Record<string, string> = {
  MAIN: '메인',
  JUNIOR: '주니어',
  ROOKIE: '루키',
  OTHER: '기타',
};

function GuideCard({
  guide,
  selected,
  onClick,
}: {
  guide: GuideRow;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all ${
        selected
          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {guide.profileImageUrl ? (
          <img src={guide.profileImageUrl} alt={guide.nameKo} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">👤</div>
        )}
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-blue-500/40">
            <span className="text-sm font-bold text-white">✓</span>
          </div>
        )}
      </div>
      <div className="w-full min-w-0">
        <p className="text-sm font-semibold text-slate-900 break-words leading-tight">{guide.nameKo}</p>
        {guide.nameMn && (
          <p className="text-xs text-slate-400 break-words">{guide.nameMn}</p>
        )}
        <span
          className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
            guide.level === 'MAIN'
              ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
              : guide.level === 'JUNIOR'
                ? 'bg-teal-50 text-teal-700 ring-teal-600/20'
                : 'bg-slate-50 text-slate-600 ring-slate-500/20'
          }`}
        >
          {GUIDE_LEVEL_LABELS[guide.level] ?? guide.level}
        </span>
      </div>
    </button>
  );
}

// ── 기사 카드 ────────────────────────────────────────────────────────────────

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  STAREX: '스타렉스',
  HIACE: '하이에이스',
  PURGON: '부르곤',
  LAND_CRUISER: '랜드크루저',
  ALPHARD: '알파드',
  OTHER: '기타',
};

function DriverCard({
  driver,
  selected,
  onClick,
}: {
  driver: DriverRow;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all ${
        selected
          ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {driver.profileImageUrl ? (
          <img src={driver.profileImageUrl} alt={driver.nameMn} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">🚗</div>
        )}
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500/40">
            <span className="text-sm font-bold text-white">✓</span>
          </div>
        )}
      </div>
      <div className="w-full min-w-0">
        <p className="text-sm font-semibold text-slate-900 break-words leading-tight">{driver.nameMn}</p>
        <p className="text-xs text-slate-400 break-words">
          {VEHICLE_TYPE_LABELS[driver.vehicleType] ?? driver.vehicleType}
        </p>
        <span
          className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
            driver.level === 'MAIN'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
              : 'bg-slate-50 text-slate-600 ring-slate-500/20'
          }`}
        >
          {GUIDE_LEVEL_LABELS[driver.level] ?? driver.level}
        </span>
      </div>
    </button>
  );
}

// ── 패널: 가이드 / 기사 ───────────────────────────────────────────────────────

function PersonnelPanel({
  tripId,
  guideId,
  driverId,
  guideName,
  driverName,
  onSaved,
}: {
  tripId: string;
  guideId: string | null;
  driverId: string | null;
  guideName: string | null;
  driverName: string | null;
  onSaved: () => void;
}) {
  const { guides, loading: guidesLoading } = useGuides({ status: 'ACTIVE_SEASON' });
  const { drivers, loading: driversLoading } = useDrivers({ status: 'ACTIVE_SEASON' });
  const { updateConfirmedTrip, loading: saving } = useUpdateConfirmedTrip();

  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(guideId);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(driverId);
  const [guideSearch, setGuideSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [dirty, setDirty] = useState(false);

  const filteredGuides = guideSearch.trim()
    ? guides.filter(
        (g) =>
          g.nameKo.toLowerCase().includes(guideSearch.toLowerCase()) ||
          (g.nameMn ?? '').toLowerCase().includes(guideSearch.toLowerCase()),
      )
    : guides;

  const filteredDrivers = driverSearch.trim()
    ? drivers.filter(
        (d) =>
          d.nameMn.toLowerCase().includes(driverSearch.toLowerCase()),
      )
    : drivers;

  const handleSave = async () => {
    const selectedGuide = guides.find((g) => g.id === selectedGuideId);
    const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

    await updateConfirmedTrip(tripId, {
      guideId: selectedGuideId,
      driverId: selectedDriverId,
      guideName: selectedGuide?.nameKo ?? guideName ?? null,
      driverName: selectedDriver?.nameMn ?? driverName ?? null,
    });
    setDirty(false);
    onSaved();
  };

  const selectGuide = (id: string) => {
    setSelectedGuideId((prev) => (prev === id ? null : id));
    setDirty(true);
  };

  const selectDriver = (id: string) => {
    setSelectedDriverId((prev) => (prev === id ? null : id));
    setDirty(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 저장 버튼 */}
      {dirty && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '배정 저장'}
          </button>
        </div>
      )}

      {/* 가이드 섹션 */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">가이드</h3>
          {selectedGuideId && (
            <button
              type="button"
              onClick={() => { setSelectedGuideId(null); setDirty(true); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              선택 해제
            </button>
          )}
        </div>

        {/* 현재 선택된 가이드 강조 표시 */}
        {selectedGuideId && (() => {
          const g = guides.find((x) => x.id === selectedGuideId);
          return g ? (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-blue-400 bg-blue-50 px-3 py-2.5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-blue-200">
                {g.profileImageUrl ? (
                  <img src={g.profileImageUrl} alt={g.nameKo} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg text-blue-300">👤</div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">{g.nameKo}</p>
                {g.nameMn && <p className="text-xs text-blue-400">{g.nameMn}</p>}
              </div>
              <span className="ml-auto text-blue-500 text-sm font-bold">✓</span>
            </div>
          ) : null;
        })()}

        <input
          className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="가이드 검색..."
          value={guideSearch}
          onChange={(e) => setGuideSearch(e.target.value)}
        />

        <div className="max-h-96 overflow-y-auto pr-1">
          {guidesLoading ? (
            <p className="py-4 text-center text-xs text-slate-400">불러오는 중...</p>
          ) : filteredGuides.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">결과 없음</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {filteredGuides.map((g) => (
                <GuideCard
                  key={g.id}
                  guide={g}
                  selected={selectedGuideId === g.id}
                  onClick={() => selectGuide(g.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-100 mb-6" />

      {/* 기사 섹션 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">기사</h3>
          {selectedDriverId && (
            <button
              type="button"
              onClick={() => { setSelectedDriverId(null); setDirty(true); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              선택 해제
            </button>
          )}
        </div>

        {/* 현재 선택된 기사 강조 표시 */}
        {selectedDriverId && (() => {
          const d = drivers.find((x) => x.id === selectedDriverId);
          return d ? (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-3 py-2.5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-emerald-200">
                {d.profileImageUrl ? (
                  <img src={d.profileImageUrl} alt={d.nameMn} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg text-emerald-300">🚗</div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">{d.nameMn}</p>
                <p className="text-xs text-emerald-400">{VEHICLE_TYPE_LABELS[d.vehicleType] ?? d.vehicleType}</p>
              </div>
              <span className="ml-auto text-emerald-500 text-sm font-bold">✓</span>
            </div>
          ) : null;
        })()}

        <input
          className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="기사 검색..."
          value={driverSearch}
          onChange={(e) => setDriverSearch(e.target.value)}
        />

        <div className="max-h-96 overflow-y-auto pr-1">
          {driversLoading ? (
            <p className="py-4 text-center text-xs text-slate-400">불러오는 중...</p>
          ) : filteredDrivers.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">결과 없음</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {filteredDrivers.map((d) => (
                <DriverCard
                  key={d.id}
                  driver={d}
                  selected={selectedDriverId === d.id}
                  onClick={() => selectDriver(d.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 배정 페이지 ──────────────────────────────────────────────────────────

export function ConfirmedTripAssignPage(): JSX.Element {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const { trip, loading, refetch } = useConfirmedTrip(tripId);

  if (!tripId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!trip) {
    return <section className="py-8 text-sm text-slate-600">확정 건을 찾을 수 없습니다.</section>;
  }

  const leaderName = trip.planVersion?.meta?.leaderName ?? trip.user.name;

  // totalDays: planVersion 우선, 없으면 travelStart/travelEnd 날짜 차이로 계산
  const computedTotalDays = (() => {
    if (trip.planVersion?.totalDays) return trip.planVersion.totalDays;
    const start = trip.planVersion?.meta?.travelStartDate ?? trip.travelStart;
    const end = trip.planVersion?.meta?.travelEndDate ?? trip.travelEnd;
    if (start && end) {
      const diff = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
      );
      return diff > 0 ? diff + 1 : null;
    }
    return null;
  })();

  const computedStartDate =
    trip.planVersion?.meta?.travelStartDate ?? trip.travelStart ?? null;

  return (
    <section className="grid gap-4">
      {/* 헤더 */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/confirmed-trips/${tripId}`)}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          ← 상세로
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{leaderName} — 배정</h1>
          {trip.plan && trip.planVersion && (
            <p className="text-sm text-slate-500">
              {trip.plan.title} · {trip.plan.regionSet.name}
            </p>
          )}
        </div>
      </header>

      {/* 2-column layout */}
      <div className="grid gap-5 lg:grid-cols-[360px_1fr] items-start">
        {/* 왼쪽: 가이드 + 기사 */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <PersonnelPanel
            tripId={tripId}
            guideId={trip.guide?.id ?? null}
            driverId={trip.driver?.id ?? null}
            guideName={trip.guideName}
            driverName={trip.driverName}
            onSaved={() => void refetch()}
          />
        </div>

        {/* 오른쪽: 숙소 배정 */}
        <LodgingSection
          tripId={tripId}
          hasPlan={!!(trip.planId && trip.planVersionId)}
          totalDays={computedTotalDays}
          travelStartDate={computedStartDate}
        />
      </div>
    </section>
  );
}
