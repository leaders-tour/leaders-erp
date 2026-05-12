import { Button, Card, listFiltersTokens } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAccommodations,
  useCreateAccommodation,
  useAccommodation,
  useUpdateAccommodation,
  accommodationDisplayImageUrl,
  type AccommodationLevel,
  type AccommodationRow,
} from '../features/accommodation/hooks';

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

const BOOKING_PRIORITY_LABELS = ['1순위', '2순위', '3순위', '보류'] as const;

const PRIORITY_CHIP_COLORS: Record<string, string> = {
  '1순위': 'bg-emerald-100 text-emerald-700',
  '2순위': 'bg-amber-100 text-amber-700',
  '3순위': 'bg-orange-100 text-orange-700',
  보류: 'bg-rose-100 text-rose-700',
};

function LevelBadge({ level }: { level: AccommodationLevel }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_COLORS[level]}`}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

function collectDistinctOptionImageUrls(acc: AccommodationRow): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of acc.options) {
    for (const u of o.imageUrls) {
      if (u && !seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
  }
  return out;
}

function CoverImagePickerModal({
  acc,
  open,
  onClose,
}: {
  acc: AccommodationRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const accId = open && acc ? acc.id : undefined;
  const { accommodation: fullAcc, loading: loadingFull } = useAccommodation(accId);
  const { updateAccommodation, loading } = useUpdateAccommodation();
  const [error, setError] = useState<string | null>(null);

  if (!open || !acc) return null;

  const sourceAcc = fullAcc ?? acc;
  const images = collectDistinctOptionImageUrls(sourceAcc);
  const explicitCover = acc.coverImageUrl?.trim() ?? null;

  const apply = async (coverImageUrl: string | null) => {
    setError(null);
    try {
      await updateAccommodation(acc.id, { coverImageUrl });
      onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <Card
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">대표 사진</h3>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{acc.name}</span> 목록·상세에 보일 사진을 고릅니다.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
          {loadingFull && fullAcc == null ? (
            <p className="text-sm text-slate-500">옵션·사진 목록 불러오는 중...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-slate-600">
              등록된 옵션 사진이 없습니다. 숙소 상세에서 옵션별로 사진을 먼저 추가해 주세요.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading || loadingFull}
                  onClick={() => apply(null)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    !explicitCover
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  자동 (옵션 첫 사진)
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((url) => {
                  const selected = explicitCover === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      disabled={loading || loadingFull}
                      onClick={() => apply(url)}
                      className={`relative overflow-hidden rounded-xl border-2 transition ${
                        selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                      {selected && (
                        <span className="absolute bottom-1 right-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          대표
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            닫기
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AccommodationCard({ acc, onClick }: { acc: AccommodationRow; onClick: () => void }) {
  const displayImage = accommodationDisplayImageUrl(acc);
  const levels = [...new Set(acc.options.map((o) => o.level))];
  const minPrice = acc.options
    .map((o) => o.priceOffSeason)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b)[0];
  const [imgFailed, setImgFailed] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  return (
    <>
      <div
        className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
        onClick={onClick}
      >
        <div className="relative">
          {displayImage && !imgFailed ? (
            <img
              src={displayImage}
              alt={acc.name}
              className="h-40 w-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-2xl text-slate-400">
              🏠
            </div>
          )}
          <button
            type="button"
            className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              setCoverPickerOpen(true);
            }}
          >
            대표 사진
          </button>
        </div>
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{acc.name}</h3>
          <div className="flex shrink-0 gap-1 flex-wrap justify-end items-start">
            {acc.bookingPriority && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_CHIP_COLORS[acc.bookingPriority] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {acc.bookingPriority}
              </span>
            )}
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
      <CoverImagePickerModal acc={acc} open={coverPickerOpen} onClose={() => setCoverPickerOpen(false)} />
    </>
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
  const [form, setForm] = useState<{
    name: string;
    region: string;
    destination: string;
    phone: string;
    facilities: string;
    bookingMethod: string;
    openingDate: string;
    closingDate: string;
  }>({
    name: '',
    region: REGIONS[0] ?? '',
    destination: '',
    phone: '',
    facilities: '',
    bookingMethod: '',
    openingDate: '',
    closingDate: '',
  });
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
        phone: form.phone.trim() || null,
        facilities: form.facilities.trim() || null,
        bookingMethod: form.bookingMethod.trim() || null,
        openingDate: form.openingDate.trim() || null,
        closingDate: form.closingDate.trim() || null,
      });
      setForm({ name: '', region: REGIONS[0] ?? '', destination: '', phone: '', facilities: '', bookingMethod: '', openingDate: '', closingDate: '' });
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
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
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">전화번호</span>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="예: +976-9999-0000"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">예약 방식</span>
            <input
              type="text"
              value={form.bookingMethod}
              onChange={(e) => setForm((p) => ({ ...p, bookingMethod: e.target.value }))}
              placeholder="예: 전화예약"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">오픈일</span>
            <input
              type="text"
              value={form.openingDate}
              onChange={(e) => setForm((p) => ({ ...p, openingDate: e.target.value }))}
              placeholder="예: 6월 초"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">마감일</span>
            <input
              type="text"
              value={form.closingDate}
              onChange={(e) => setForm((p) => ({ ...p, closingDate: e.target.value }))}
              placeholder="예: 9월 말"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">부대시설</span>
            <input
              type="text"
              value={form.facilities}
              onChange={(e) => setForm((p) => ({ ...p, facilities: e.target.value }))}
              placeholder="예: 샤워실, 화장실, Wi-Fi"
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

type BookingPriorityFilter = 'all' | 'unset' | (typeof BOOKING_PRIORITY_LABELS)[number];

const LF = listFiltersTokens;

export function AccommodationsPage(): JSX.Element {
  const [regionFilter, setRegionFilter] = useState<string | undefined>(undefined);
  const [destinationFilter, setDestinationFilter] = useState<string | undefined>(undefined);
  const [levelFilter, setLevelFilter] = useState<AccommodationLevel | undefined>(undefined);
  const [bookingPriorityFilter, setBookingPriorityFilter] = useState<BookingPriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  /** 필터 칩용: 실데이터 기준 지역별 여행지 목록 (별도 쿼리) */
  const { accommodations: allAccommodationsForMeta } = useAccommodations({});

  const bookingPriorityQuery =
    bookingPriorityFilter === 'all'
      ? {}
      : bookingPriorityFilter === 'unset'
        ? { bookingPriorityUnset: true as const }
        : { bookingPriority: bookingPriorityFilter };

  const { accommodations, loading } = useAccommodations({
    region: regionFilter,
    destination: destinationFilter,
    level: levelFilter,
    ...bookingPriorityQuery,
  });
  const navigate = useNavigate();

  const destinationsForSelectedRegion = useMemo(() => {
    if (!regionFilter) return [];
    const seen = new Set<string>();
    for (const acc of allAccommodationsForMeta) {
      if (acc.region !== regionFilter) continue;
      const d = acc.destination.trim();
      if (d) seen.add(d);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [regionFilter, allAccommodationsForMeta]);

  const filteredAcc = accommodations.filter((acc) => {
    if (levelFilter && !acc.options.some((o) => o.level === levelFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.destination.toLowerCase().includes(q) ||
        acc.region.toLowerCase().includes(q)
      );
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
            placeholder="숙소명, 목적지, 지역 검색..."
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
          <button
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${!regionFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => {
              setRegionFilter(undefined);
              setDestinationFilter(undefined);
            }}
          >
            전체 지역
          </button>
          {REGIONS.map((r) => (
            <button
              key={r}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${regionFilter === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => {
                setRegionFilter(r);
                setDestinationFilter(undefined);
              }}
            >
              {r}
            </button>
          ))}
        </div>
        {regionFilter ? (
          <div
            key={regionFilter}
            className={`motion-safe:animate-accommodation-destination-reveal ${LF.nestedRail}`}
          >
            <div className={LF.nestedChipRow}>
              <button
                type="button"
                className={`${LF.nestedChipBase} ${!destinationFilter ? LF.nestedChipActive : LF.nestedChipInactive}`}
                onClick={() => setDestinationFilter(undefined)}
              >
                전체
              </button>
              {destinationsForSelectedRegion.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`max-w-full truncate ${LF.nestedChipBase} ${destinationFilter === d ? LF.nestedChipActive : LF.nestedChipInactive}`}
                  onClick={() => setDestinationFilter(d)}
                  title={d}
                >
                  {d}
                </button>
              ))}
            </div>
            {destinationsForSelectedRegion.length === 0 && (
              <p className={LF.nestedEmptyHint}>
                이 지역에 등록된 숙소가 없거나 여행지명이 비어 있습니다.
              </p>
            )}
          </div>
        ) : null}
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
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${bookingPriorityFilter === 'all' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => setBookingPriorityFilter('all')}
          >
            전체 순위
          </button>
          {BOOKING_PRIORITY_LABELS.map((p) => (
            <button
              type="button"
              key={p}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${bookingPriorityFilter === p ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => setBookingPriorityFilter(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${bookingPriorityFilter === 'unset' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => setBookingPriorityFilter('unset')}
          >
            미지정
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : filteredAcc.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {searchQuery.trim() ? `"${searchQuery}" 검색 결과가 없습니다.` : '등록된 숙소가 없습니다.'}
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
