import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccommodations, useCreateAccommodation, type AccommodationLevel, type AccommodationRow } from '../features/accommodation/hooks';

const LEVEL_LABEL: Record<AccommodationLevel, string> = {
  LV2: 'LV.2',
  LV3: 'LV.3',
  LV4: 'LV.4',
  LV5: 'LV.5',
};

const LEVEL_COLORS: Record<AccommodationLevel, string> = {
  LV2: 'bg-slate-100 text-slate-600',
  LV3: 'bg-sky-100 text-sky-700',
  LV4: 'bg-indigo-100 text-indigo-700',
  LV5: 'bg-violet-100 text-violet-700',
};

function LevelBadge({ level }: { level: AccommodationLevel }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_COLORS[level]}`}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

function AccommodationCard({ acc, onClick }: { acc: AccommodationRow; onClick: () => void }) {
  const firstImage = acc.options.flatMap((o) => o.imageUrls)[0];
  const levels = [...new Set(acc.options.map((o) => o.level))];
  const minPrice = acc.options
    .map((o) => o.priceOffSeason)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b)[0];
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
      onClick={onClick}
    >
      {firstImage && !imgFailed ? (
        <img
          src={firstImage}
          alt={acc.name}
          className="h-40 w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-2xl text-slate-400">
          🏠
        </div>
      )}
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{acc.name}</h3>
          <div className="flex shrink-0 gap-1 flex-wrap justify-end">
            {levels.map((l) => (
              <LevelBadge key={l} level={l} />
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {acc.region} · {acc.destination}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">{acc.options.length}개 옵션</span>
          {minPrice != null && (
            <span className="text-xs font-medium text-indigo-600">
              ₮{minPrice.toLocaleString()}~
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const REGIONS = ['고비사막', '중부', '홉스골', '울란바토르', '자브항', '울란곰'];
const LEVELS: AccommodationLevel[] = ['LV2', 'LV3', 'LV4', 'LV5'];

function CreateAccommodationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState<{ name: string; region: string; destination: string }>({ name: '', region: REGIONS[0] ?? '', destination: '' });
  const { createAccommodation, loading } = useCreateAccommodation();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('숙소명을 입력해 주세요.');
      return;
    }
    if (!form.destination.trim()) {
      setError('목적지를 입력해 주세요.');
      return;
    }
    setError(null);
    try {
      const result = await createAccommodation({
        name: form.name.trim(),
        region: form.region,
        destination: form.destination.trim(),
      });
      setForm({ name: '', region: REGIONS[0] ?? '', destination: '' });
      onClose();
      onCreated(result.id);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">숙소 등록</h3>
        <p className="mt-1 text-sm text-slate-500">새로운 숙소를 등록합니다.</p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>
        )}

        <div className="mt-4 grid gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">숙소명 *</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 투어리스트 캠프"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">지역 *</span>
            <select
              value={form.region}
              onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">목적지 *</span>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
              placeholder="예: 테를지"
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

export function AccommodationsPage(): JSX.Element {
  const [regionFilter, setRegionFilter] = useState<string | undefined>(undefined);
  const [levelFilter, setLevelFilter] = useState<AccommodationLevel | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const { accommodations, loading } = useAccommodations({
    region: regionFilter,
    level: levelFilter,
  });
  const navigate = useNavigate();

  const filteredAcc = accommodations.filter((acc) => {
    if (levelFilter) {
      return acc.options.some((o) => o.level === levelFilter);
    }
    return true;
  });

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">숙소 목록</h1>
          <p className="mt-1 text-sm text-slate-600">
            등록된 숙소 및 옵션 정보를 관리합니다.
            {!loading && (
              <span className="ml-2 text-slate-400">
                ({filteredAcc.length}개 숙소)
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ 숙소 등록</Button>
      </header>

      <CreateAccommodationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/accommodations/${id}`)}
      />

      {/* 필터 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          <button
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${!regionFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => setRegionFilter(undefined)}
          >
            전체 지역
          </button>
          {REGIONS.map((r) => (
            <button
              key={r}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${regionFilter === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => setRegionFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${!levelFilter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => setLevelFilter(undefined)}
          >
            전체 등급
          </button>
          {LEVELS.map((l) => (
            <button
              key={l}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${levelFilter === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => setLevelFilter(l)}
            >
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : filteredAcc.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          등록된 숙소가 없습니다.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredAcc.map((acc) => (
            <AccommodationCard
              key={acc.id}
              acc={acc}
              onClick={() => navigate(`/accommodations/${acc.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
