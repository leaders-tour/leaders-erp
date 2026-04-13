import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAccommodation,
  useUpdateAccommodationOption,
  type AccommodationLevel,
  type AccommodationOption,
  type PaymentMethod,
} from '../features/accommodation/hooks';

const LEVEL_LABEL: Record<AccommodationLevel, string> = {
  LV2: 'LV.2', LV3: 'LV.3', LV4: 'LV.4', LV5: 'LV.5',
};

const LEVEL_COLORS: Record<AccommodationLevel, string> = {
  LV2: 'bg-slate-100 text-slate-600',
  LV3: 'bg-sky-100 text-sky-700',
  LV4: 'bg-indigo-100 text-indigo-700',
  LV5: 'bg-violet-100 text-violet-700',
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PER_PERSON: '인당',
  PER_ROOM: '객실당',
};

const PRIORITY_COLORS: Record<string, string> = {
  '1순위': 'bg-emerald-100 text-emerald-700',
  '2순위': 'bg-amber-100 text-amber-700',
  '3순위': 'bg-orange-100 text-orange-700',
  '보류': 'bg-rose-100 text-rose-700',
};

function OptionCard({ opt, accommodationId }: { opt: AccommodationOption; accommodationId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<AccommodationOption>>({});
  const { updateOption, loading: saving } = useUpdateAccommodationOption();

  const current = { ...opt, ...draft };

  async function handleSave() {
    if (Object.keys(draft).length === 0) { setEditing(false); return; }
    await updateOption(opt.id, accommodationId, draft);
    setEditing(false);
    setDraft({});
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* 이미지 슬라이더 */}
      {opt.imageUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-2">
          {opt.imageUrls.slice(0, 6).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0">
              <img
                src={url}
                alt={`${opt.roomType} ${i + 1}`}
                className="h-32 w-48 rounded-lg object-cover transition hover:opacity-90"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </a>
          ))}
          {opt.imageUrls.length > 6 && (
            <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
              +{opt.imageUrls.length - 6}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{opt.roomType}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_COLORS[opt.level]}`}>
              {LEVEL_LABEL[opt.level]}
            </span>
            {opt.bookingPriority && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[opt.bookingPriority] ?? 'bg-slate-100 text-slate-500'}`}>
                {opt.bookingPriority}
              </span>
            )}
            {opt.mealIncluded && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                식사 포함
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '접기' : '상세'}
            </button>
            {editing ? (
              <>
                <button className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onClick={() => { setEditing(false); setDraft({}); }}>취소</button>
                <button className="rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700" onClick={handleSave} disabled={saving}>저장</button>
              </>
            ) : (
              <button className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onClick={() => setEditing(true)}>편집</button>
            )}
          </div>
        </div>

        {/* 가격 */}
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {current.priceOffSeason != null && (
            <span className="text-slate-700">
              비수기 <strong className="text-slate-900">₮{current.priceOffSeason.toLocaleString()}</strong>
              {current.paymentMethod && <span className="text-slate-400 ml-1">/{PAYMENT_LABEL[current.paymentMethod]}</span>}
            </span>
          )}
          {current.pricePeakSeason != null && (
            <span className="text-slate-700">
              성수기 <strong className="text-slate-900">₮{current.pricePeakSeason.toLocaleString()}</strong>
            </span>
          )}
          {current.capacity && <span className="text-slate-500">{current.capacity}</span>}
        </div>

        {/* 상세 정보 */}
        {(expanded || editing) && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['전화번호', 'phone', 'text'],
                  ['오픈일', 'openingDate', 'text'],
                  ['마감일', 'closingDate', 'text'],
                  ['부대시설', 'facilities', 'text'],
                  ['예약 방식', 'bookingMethod', 'text'],
                ] as [string, keyof AccommodationOption, string][]).map(([label, key, type]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{label}</span>
                    <input
                      type={type}
                      value={String(current[key] ?? '')}
                      onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value || null }))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                    />
                  </label>
                ))}
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs text-slate-500">특이사항</span>
                  <textarea
                    value={current.note ?? ''}
                    onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value || null }))}
                    rows={3}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              </div>
            ) : (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {current.phone && <div><dt className="text-slate-400 text-xs">전화번호</dt><dd className="text-slate-800">{current.phone}</dd></div>}
                {current.googleMapsUrl && (
                  <div>
                    <dt className="text-slate-400 text-xs">위치</dt>
                    <dd><a href={current.googleMapsUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs hover:underline">Google Maps</a></dd>
                  </div>
                )}
                {current.openingDate && <div><dt className="text-slate-400 text-xs">오픈</dt><dd className="text-slate-800">{current.openingDate}</dd></div>}
                {current.closingDate && <div><dt className="text-slate-400 text-xs">마감</dt><dd className="text-slate-800">{current.closingDate}</dd></div>}
                {current.bookingMethod && <div><dt className="text-slate-400 text-xs">예약방식</dt><dd className="text-slate-800">{current.bookingMethod}</dd></div>}
                {current.mealCostPerServing != null && <div><dt className="text-slate-400 text-xs">끼니당</dt><dd className="text-slate-800">₮{current.mealCostPerServing.toLocaleString()}</dd></div>}
                {current.facilities && <div><dt className="text-slate-400 text-xs">부대시설</dt><dd className="text-slate-800">{current.facilities}</dd></div>}
                {current.note && <div className="sm:col-span-2"><dt className="text-slate-400 text-xs">특이사항</dt><dd className="text-slate-700 whitespace-pre-wrap">{current.note}</dd></div>}
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccommodationDetailPage(): JSX.Element {
  const { accommodationId } = useParams<{ accommodationId: string }>();
  const navigate = useNavigate();
  const { accommodation, loading } = useAccommodation(accommodationId);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중...</p>;
  if (!accommodation) return <p className="text-sm text-slate-500">숙소를 찾을 수 없습니다.</p>;

  const coverImage = accommodation.options.flatMap((o) => o.imageUrls)[0];

  return (
    <section className="mx-auto grid max-w-5xl gap-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/accommodations')} className="text-slate-400 hover:text-slate-700">
            ← 목록
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{accommodation.name}</h1>
            <p className="text-sm text-slate-500">{accommodation.region} · {accommodation.destination}</p>
          </div>
        </div>
      </div>

      {/* 커버 이미지 */}
      {coverImage && (
        <img
          src={coverImage}
          alt={accommodation.name}
          className="h-64 w-full rounded-3xl object-cover shadow"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* 요약 */}
      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-slate-400 text-xs">총 옵션</p>
            <p className="font-semibold text-slate-900">{accommodation.options.length}개</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">최저 가격 (비수기)</p>
            <p className="font-semibold text-slate-900">
              {(() => {
                const p = accommodation.options.map((o) => o.priceOffSeason).filter((v): v is number => v !== null).sort((a, b) => a - b)[0];
                return p != null ? `₮${p.toLocaleString()}` : '-';
              })()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">등급 범위</p>
            <p className="font-semibold text-slate-900">
              {[...new Set(accommodation.options.map((o) => o.level))].map((l) => LEVEL_LABEL[l]).join(' / ')}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">여행지</p>
            <p className="font-semibold text-slate-900">{accommodation.destination}</p>
          </div>
        </div>
      </Card>

      {/* 옵션 목록 */}
      <div>
        <h2 className="mb-4 text-lg font-medium text-slate-800">
          객실 옵션 ({accommodation.options.length}개)
        </h2>
        <div className="grid gap-4">
          {accommodation.options.map((opt) => (
            <OptionCard key={opt.id} opt={opt} accommodationId={accommodation.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
