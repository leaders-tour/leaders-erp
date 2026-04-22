import { Button, Card } from '@tour/ui';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuideTripCalendar } from '../features/guide/components/GuideTripCalendar';
import { GuideTripCard } from '../features/guide/components/GuideTripCard';
import { GuideTripTimeline } from '../features/guide/components/GuideTripTimeline';
import {
  useDeleteDriver,
  useDriver,
  useDriverTrips,
  useRemoveDriverVehicleImage,
  useUpdateDriver,
  useUploadDriverProfileImage,
  useUploadDriverVehicleImages,
  type DriverRow,
} from '../features/driver/hooks';
import { splitGuideTrips } from '../features/guide/trip-utils';

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  STAREX: '스타렉스',
  HIACE_SHORT: '하이에이스(숏)',
  HIACE_LONG: '하이에이스(롱)',
  PURGON: '푸르공',
  LAND_CRUISER: '랜드크루저',
  ALPHARD: '알파드',
  OTHER: '기타',
};

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

const VEHICLE_TYPE_OPTIONS: { value: DriverRow['vehicleType']; label: string }[] = [
  { value: 'STAREX', label: '스타렉스' },
  { value: 'HIACE_SHORT', label: '하이에이스(숏)' },
  { value: 'HIACE_LONG', label: '하이에이스(롱)' },
  { value: 'PURGON', label: '푸르공' },
  { value: 'LAND_CRUISER', label: '랜드크루저' },
  { value: 'ALPHARD', label: '알파드' },
  { value: 'OTHER', label: '기타' },
];

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="w-36 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="flex-1 text-sm font-medium text-slate-900">{value ?? '-'}</dd>
    </div>
  );
}

function EditField({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string | number | boolean;
  onChange: (v: string) => void;
}) {
  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-3">
        <span className="w-36 text-sm text-slate-500">{label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="h-4 w-4 accent-indigo-600"
        />
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type={type}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DriverDetailPage(): JSX.Element {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const { driver, loading, refetch } = useDriver(driverId);
  const { updateDriver, loading: saving } = useUpdateDriver();
  const { deleteDriver, loading: deleting } = useDeleteDriver();
  const { uploadProfileImage, loading: uploadingProfile } = useUploadDriverProfileImage();
  const { uploadVehicleImages, loading: uploadingVehicle } = useUploadDriverVehicleImages();
  const { removeVehicleImage, loading: removingVehicle } = useRemoveDriverVehicleImage();

  const { trips, loading: tripsLoading } = useDriverTrips(driverId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<DriverRow>>({});
  const [upcomingView, setUpcomingView] = useState<'cards' | 'calendar'>('cards');
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const vehicleInputRef = useRef<HTMLInputElement | null>(null);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중...</p>;
  if (!driver) return <p className="text-sm text-slate-500">기사를 찾을 수 없습니다.</p>;

  const current = { ...driver, ...draft };

  function field<K extends keyof DriverRow>(key: K) {
    return (v: string) => {
      setDraft((prev) => {
        if (key === 'vehicleYear' || key === 'maxPassengers' || key === 'birthYear' || key === 'joinYear') {
          const num = parseInt(v, 10);
          return { ...prev, [key]: isNaN(num) ? null : num };
        }
        if (key === 'isSmoker' || key === 'hasTouristLicense') {
          return { ...prev, [key]: v === 'true' };
        }
        return { ...prev, [key]: v || null };
      });
    };
  }

  async function handleSave() {
    if (!driverId || Object.keys(draft).length === 0) {
      setEditing(false);
      return;
    }
    await updateDriver(driverId, draft);
    setEditing(false);
    setDraft({});
  }

  return (
    <section className="mx-auto grid max-w-4xl gap-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/drivers')} className="text-slate-400 hover:text-slate-700">
            ← 목록
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">{driver.nameMn}</h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="default" onClick={() => { setEditing(false); setDraft({}); }}>
                취소
              </Button>
              <Button variant="default" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={async () => {
                  if (!driverId) return;
                  if (!window.confirm('기사를 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) return;
                  await deleteDriver(driverId);
                  navigate('/drivers');
                }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </Button>
              <Button variant="default" onClick={() => setEditing(true)}>
                편집
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 프로필 이미지 */}
        <div className="flex flex-col items-center gap-3">
          {driver.profileImageUrl ? (
            <img
              src={driver.profileImageUrl}
              alt={driver.nameMn}
              className="h-48 w-48 rounded-2xl object-cover shadow"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-slate-200 text-4xl font-bold text-slate-500">
              {driver.nameMn.slice(0, 2)}
            </div>
          )}
          <span className="text-xs text-slate-500">
            가입: {driver.joinYear ?? '-'}
          </span>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !driverId) return;
              await uploadProfileImage(driverId, file);
              await refetch();
              if (profileInputRef.current) profileInputRef.current.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploadingProfile}
            onClick={() => profileInputRef.current?.click()}
            className="text-xs text-indigo-600 hover:underline disabled:text-slate-400"
          >
            {uploadingProfile ? '업로드 중...' : '프로필 변경'}
          </button>
        </div>

        {/* 기본 정보 (뷰 / 편집) */}
        <div className="md:col-span-2">
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <EditField label="이름 (몽골)" value={current.nameMn} onChange={field('nameMn')} />
                <SelectField
                  label="레벨"
                  options={LEVEL_OPTIONS}
                  value={current.level}
                  onChange={(v) => setDraft((p) => ({ ...p, level: v }))}
                />
                <SelectField
                  label="상태"
                  options={STATUS_OPTIONS}
                  value={current.status}
                  onChange={(v) => setDraft((p) => ({ ...p, status: v }))}
                />
                <SelectField
                  label="차종"
                  options={VEHICLE_TYPE_OPTIONS}
                  value={current.vehicleType}
                  onChange={(v) => setDraft((p) => ({ ...p, vehicleType: v }))}
                />
                <EditField label="차량번호" value={current.vehicleNumber ?? ''} onChange={field('vehicleNumber')} />
                <EditField label="차량옵션" value={current.vehicleOptions ?? ''} onChange={field('vehicleOptions')} />
                <EditField label="연식" type="number" value={current.vehicleYear ?? ''} onChange={field('vehicleYear')} />
                <EditField label="최대탑승" type="number" value={current.maxPassengers ?? ''} onChange={field('maxPassengers')} />
                <EditField label="출생년도" type="number" value={current.birthYear ?? ''} onChange={field('birthYear')} />
                <EditField label="입사연도" type="number" value={current.joinYear ?? ''} onChange={field('joinYear')} />
                <EditField label="전화번호" value={current.phone ?? ''} onChange={field('phone')} />
                <EditField label="흡연여부" type="checkbox" value={current.isSmoker} onChange={field('isSmoker')} />
                <EditField label="Tourist 허가" type="checkbox" value={current.hasTouristLicense} onChange={field('hasTouristLicense')} />
                <div className="sm:col-span-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">특이사항</span>
                    <textarea
                      value={current.note ?? ''}
                      onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value || null }))}
                      rows={3}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <dl>
                <InfoRow label="레벨" value={LEVEL_OPTIONS.find(o => o.value === driver.level)?.label} />
                <InfoRow label="상태" value={STATUS_OPTIONS.find(o => o.value === driver.status)?.label} />
                <InfoRow label="차종" value={VEHICLE_TYPE_LABEL[driver.vehicleType]} />
                <InfoRow label="차량번호" value={driver.vehicleNumber} />
                <InfoRow label="차량옵션" value={driver.vehicleOptions} />
                <InfoRow label="연식" value={driver.vehicleYear} />
                <InfoRow label="최대탑승" value={driver.maxPassengers != null ? `${driver.maxPassengers}인` : null} />
                <InfoRow label="출생년도" value={driver.birthYear} />
                <InfoRow label="입사연도" value={driver.joinYear} />
                <InfoRow label="전화번호" value={driver.phone} />
                <InfoRow label="성별" value={driver.gender === 'MALE' ? '남' : driver.gender === 'FEMALE' ? '여' : null} />
                <InfoRow label="흡연여부" value={driver.isSmoker ? '흡연' : '비흡연'} />
                <InfoRow label="Tourist 허가" value={driver.hasTouristLicense ? '있음' : '없음'} />
                <InfoRow label="특이사항" value={driver.note} />
              </dl>
            )}
          </Card>
        </div>
      </div>

      {/* 차량 이미지 */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-800">차량 사진</h2>
          <div className="flex items-center gap-2">
            <input
              ref={vehicleInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0 || !driverId) return;
                await uploadVehicleImages(driverId, Array.from(files));
                await refetch();
                if (vehicleInputRef.current) vehicleInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploadingVehicle}
              onClick={() => vehicleInputRef.current?.click()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:text-slate-400"
            >
              {uploadingVehicle ? '업로드 중...' : '+ 사진 추가'}
            </button>
          </div>
        </div>
        {driver.vehicleImageUrls.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 차량 사진이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {driver.vehicleImageUrls.map((url, idx) => (
              <div key={idx} className="group relative">
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`차량 사진 ${idx + 1}`}
                    className="aspect-video w-full rounded-xl object-cover shadow-sm transition hover:scale-[1.02]"
                  />
                </a>
                <button
                  type="button"
                  disabled={removingVehicle}
                  onClick={async () => {
                    if (!driverId || !window.confirm('이 사진을 삭제할까요?')) return;
                    await removeVehicleImage(driverId, url);
                    await refetch();
                  }}
                  className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white text-xs hover:bg-rose-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 예정 여행 섹션 ─────────────────────────────────── */}
      {(() => {
        if (tripsLoading) {
          return (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-400">배정 정보 불러오는 중...</p>
            </Card>
          );
        }
        const { upcoming, ongoing, past } = splitGuideTrips(trips);
        const futureTrips = [...ongoing, ...upcoming];

        return (
          <>
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-slate-700">예정 여행</h3>
                  <div className="flex gap-1.5">
                    {ongoing.length > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">
                        진행중 {ongoing.length}건
                      </span>
                    )}
                    {upcoming.length > 0 && (
                      <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-0.5 font-medium">
                        예정 {upcoming.length}건
                      </span>
                    )}
                    {futureTrips.length === 0 && (
                      <span className="text-xs text-slate-400">없음</span>
                    )}
                  </div>
                </div>

                {futureTrips.length > 0 && (
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setUpcomingView('cards')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        upcomingView === 'cards'
                          ? 'bg-white shadow text-slate-800 font-medium'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      카드
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpcomingView('calendar')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        upcomingView === 'calendar'
                          ? 'bg-white shadow text-slate-800 font-medium'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      캘린더
                    </button>
                  </div>
                )}
              </div>

              {futureTrips.length === 0 ? (
                <p className="text-sm text-slate-400">예정된 배정이 없습니다.</p>
              ) : (
                <div className="space-y-5">
                  <GuideTripTimeline upcoming={upcoming} ongoing={ongoing} />
                  {upcomingView === 'cards' ? (
                    <div className="space-y-2">
                      {ongoing.map((t) => (
                        <GuideTripCard key={t.id} trip={t} variant="ongoing" />
                      ))}
                      {upcoming.map((t) => (
                        <GuideTripCard key={t.id} trip={t} variant="upcoming" />
                      ))}
                    </div>
                  ) : (
                    <GuideTripCalendar trips={futureTrips} />
                  )}
                </div>
              )}
            </Card>

            {/* ── 배정 이력 섹션 ────────────────────────────── */}
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-700">배정 이력</h3>
                {past.length > 0 && (
                  <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                    {past.length}건
                  </span>
                )}
              </div>
              {past.length === 0 ? (
                <p className="text-sm text-slate-400">과거 배정 이력이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {past.map((t) => (
                    <GuideTripCard key={t.id} trip={t} variant="past" />
                  ))}
                </div>
              )}
            </Card>
          </>
        );
      })()}
    </section>
  );
}
