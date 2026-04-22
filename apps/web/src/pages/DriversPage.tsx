import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrivers, useCreateDriver, type DriverRow } from '../features/driver/hooks';

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  STAREX: '스타렉스',
  HIACE_SHORT: '하이에이스(숏)',
  HIACE_LONG: '하이에이스(롱)',
  PURGON: '푸르공',
  LAND_CRUISER: '랜드크루저',
  ALPHARD: '알파드',
  OTHER: '기타',
};

const LEVEL_LABEL: Record<string, string> = {
  MAIN: '메인',
  JUNIOR: '주니어',
  ROOKIE: '신입',
  OTHER: '기타',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE_SEASON: '2026 시즌',
  INTERVIEW_DONE: '면접 완료',
  BLACKLISTED: '블랙리스트',
  OTHER: '기타',
};

function LevelBadge({ level }: { level: DriverRow['level'] }) {
  const colors: Record<string, string> = {
    MAIN: 'bg-indigo-100 text-indigo-700',
    JUNIOR: 'bg-sky-100 text-sky-700',
    ROOKIE: 'bg-emerald-100 text-emerald-700',
    OTHER: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[level] ?? colors.OTHER}`}>
      {LEVEL_LABEL[level] ?? level}
    </span>
  );
}

function StatusBadge({ status }: { status: DriverRow['status'] }) {
  const colors: Record<string, string> = {
    ACTIVE_SEASON: 'bg-emerald-100 text-emerald-700',
    INTERVIEW_DONE: 'bg-amber-100 text-amber-700',
    BLACKLISTED: 'bg-rose-100 text-rose-700',
    OTHER: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.OTHER}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function VehicleBadge({ vehicleType }: { vehicleType: DriverRow['vehicleType'] }) {
  const colors: Record<string, string> = {
    STAREX: 'bg-violet-100 text-violet-700',
    HIACE_SHORT: 'bg-blue-100 text-blue-700',
    HIACE_LONG: 'bg-sky-100 text-sky-700',
    PURGON: 'bg-orange-100 text-orange-700',
    LAND_CRUISER: 'bg-teal-100 text-teal-700',
    ALPHARD: 'bg-pink-100 text-pink-700',
    OTHER: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[vehicleType] ?? colors.OTHER}`}>
      {VEHICLE_TYPE_LABEL[vehicleType] ?? vehicleType}
    </span>
  );
}

type StatusFilter = DriverRow['status'] | undefined;
type LevelFilter = DriverRow['level'] | undefined;
type VehicleFilter = DriverRow['vehicleType'] | undefined;

const VEHICLE_OPTIONS: { value: DriverRow['vehicleType']; label: string }[] = [
  { value: 'STAREX', label: '스타렉스' },
  { value: 'HIACE_SHORT', label: '하이에이스(숏)' },
  { value: 'HIACE_LONG', label: '하이에이스(롱)' },
  { value: 'PURGON', label: '푸르공' },
  { value: 'LAND_CRUISER', label: '랜드크루저' },
  { value: 'ALPHARD', label: '알파드' },
  { value: 'OTHER', label: '기타' },
];

const LEVEL_OPTIONS: { value: DriverRow['level']; label: string }[] = [
  { value: 'MAIN', label: '메인' },
  { value: 'JUNIOR', label: '주니어' },
  { value: 'ROOKIE', label: '신입' },
  { value: 'OTHER', label: '기타' },
];

const STATUS_OPTIONS: { value: DriverRow['status']; label: string }[] = [
  { value: 'ACTIVE_SEASON', label: '2026 시즌' },
  { value: 'INTERVIEW_DONE', label: '면접 완료' },
  { value: 'BLACKLISTED', label: '블랙리스트' },
  { value: 'OTHER', label: '기타' },
];

function CreateDriverModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({
    nameMn: '',
    vehicleType: 'STAREX' as DriverRow['vehicleType'],
    level: 'ROOKIE' as DriverRow['level'],
    status: 'INTERVIEW_DONE' as DriverRow['status'],
    phone: '',
  });
  const { createDriver, loading } = useCreateDriver();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.nameMn.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    setError(null);
    try {
      const result = await createDriver({
        nameMn: form.nameMn.trim(),
        vehicleType: form.vehicleType,
        level: form.level,
        status: form.status,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      } as any);
      setForm({ nameMn: '', vehicleType: 'STAREX', level: 'ROOKIE', status: 'INTERVIEW_DONE', phone: '' });
      onClose();
      onCreated(result.id);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">기사 등록</h3>
        <p className="mt-1 text-sm text-slate-500">새로운 기사를 등록합니다. 상세 정보는 등록 후 수정할 수 있습니다.</p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">이름 (몽골) *</span>
            <input
              type="text"
              value={form.nameMn}
              onChange={(e) => setForm((p) => ({ ...p, nameMn: e.target.value }))}
              placeholder="기사 이름"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">차종</span>
            <select
              value={form.vehicleType}
              onChange={(e) => setForm((p) => ({ ...p, vehicleType: e.target.value as DriverRow['vehicleType'] }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {VEHICLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">레벨</span>
            <select
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as DriverRow['level'] }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">상태</span>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as DriverRow['status'] }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">전화번호</span>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="전화번호"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '등록 중...' : '등록'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function DriversPage(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE_SEASON');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(undefined);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { drivers, loading } = useDrivers({
    status: statusFilter,
    level: levelFilter,
    vehicleType: vehicleFilter,
  });
  const navigate = useNavigate();

  const filteredDrivers = searchQuery.trim()
    ? drivers.filter((d) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          d.nameMn.toLowerCase().includes(q) ||
          (d.phone?.toLowerCase().includes(q) ?? false) ||
          (d.vehicleNumber?.toLowerCase().includes(q) ?? false)
        );
      })
    : drivers;

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">기사 목록</h1>
          <p className="mt-1 text-sm text-slate-600">등록된 기사 및 차량 정보를 관리합니다.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ 기사 등록</Button>
      </header>

      <CreateDriverModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/drivers/${id}`)}
      />

      {/* 검색 + 필터 */}
      <div className="flex flex-col gap-3">
        {/* 검색 인풋 */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 전화번호, 차량번호 검색..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {([undefined, 'ACTIVE_SEASON', 'INTERVIEW_DONE', 'BLACKLISTED'] as (StatusFilter | undefined)[]).map(
            (s) => (
              <button
                key={String(s)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === s
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setStatusFilter(s as StatusFilter)}
              >
                {s == null ? '전체' : STATUS_LABEL[s]}
              </button>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {([undefined, 'MAIN', 'JUNIOR', 'ROOKIE'] as (LevelFilter | undefined)[]).map((l) => (
            <button
              key={String(l)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                levelFilter === l
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setLevelFilter(l as LevelFilter)}
            >
              {l == null ? '전체 레벨' : LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {([undefined, 'STAREX', 'HIACE_SHORT', 'HIACE_LONG', 'PURGON', 'LAND_CRUISER', 'ALPHARD'] as (VehicleFilter | undefined)[]).map((v) => (
            <button
              key={String(v)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                vehicleFilter === v
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setVehicleFilter(v as VehicleFilter)}
            >
              {v == null ? '전체 차종' : VEHICLE_TYPE_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : filteredDrivers.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {searchQuery.trim() ? `"${searchQuery}" 검색 결과가 없습니다.` : '등록된 기사가 없습니다.'}
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="w-12 px-3 py-3" />
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">이름 (몽골)</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">레벨</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">상태</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">차종</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">차량번호</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">차량옵션</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">연식</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">탑승</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">전화번호</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Tourist</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">흡연</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                    onClick={() => navigate(`/drivers/${driver.id}`)}
                  >
                    <td className="px-3 py-2">
                      {driver.profileImageUrl ? (
                        <img
                          src={driver.profileImageUrl}
                          alt={driver.nameMn}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                          {driver.nameMn.slice(0, 1)}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {driver.nameMn}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <LevelBadge level={driver.level} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={driver.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <VehicleBadge vehicleType={driver.vehicleType} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {driver.vehicleNumber ?? '-'}
                    </td>
                    <td className="max-w-[160px] px-4 py-3 text-slate-600">
                      <span className="line-clamp-1 text-xs">{driver.vehicleOptions ?? '-'}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {driver.vehicleYear ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {driver.maxPassengers != null ? `${driver.maxPassengers}인` : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {driver.phone ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {driver.hasTouristLicense ? '✅' : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {driver.isSmoker ? '🚬' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
