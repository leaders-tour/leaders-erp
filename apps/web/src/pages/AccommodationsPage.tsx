import { Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccommodations, type AccommodationLevel, type AccommodationRow } from '../features/accommodation/hooks';

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

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
      onClick={onClick}
    >
      {firstImage ? (
        <img
          src={firstImage}
          alt={acc.name}
          className="h-40 w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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

export function AccommodationsPage(): JSX.Element {
  const [regionFilter, setRegionFilter] = useState<string | undefined>(undefined);
  const [levelFilter, setLevelFilter] = useState<AccommodationLevel | undefined>(undefined);

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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">숙소 목록</h1>
        <p className="mt-1 text-sm text-slate-600">
          등록된 숙소 및 옵션 정보를 관리합니다.
          {!loading && (
            <span className="ml-2 text-slate-400">
              ({filteredAcc.length}개 숙소)
            </span>
          )}
        </p>
      </header>

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
