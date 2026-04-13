import { Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrivers, type DriverRow } from '../features/driver/hooks';

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  STAREX: '스타렉스',
  HIACE: '하이에이스',
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
    HIACE: 'bg-blue-100 text-blue-700',
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

export function DriversPage(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE_SEASON');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(undefined);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>(undefined);
  const { drivers, loading } = useDrivers({
    status: statusFilter,
    level: levelFilter,
    vehicleType: vehicleFilter,
  });
  const navigate = useNavigate();

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">기사 목록</h1>
        <p className="mt-1 text-sm text-slate-600">등록된 기사 및 차량 정보를 관리합니다.</p>
      </header>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3">
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
          {([undefined, 'STAREX', 'HIACE', 'PURGON', 'LAND_CRUISER', 'ALPHARD'] as (VehicleFilter | undefined)[]).map((v) => (
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
      ) : drivers.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          등록된 기사가 없습니다.
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
                {drivers.map((driver) => (
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
