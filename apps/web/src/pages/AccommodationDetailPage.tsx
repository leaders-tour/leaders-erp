import { Button, Card } from '@tour/ui';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAccommodation,
  useCreateAccommodationOption,
  useDeleteAccommodation,
  useDeleteAccommodationOption,
  useRemoveAccommodationOptionImage,
  useUpdateAccommodation,
  useUpdateAccommodationOption,
  useUploadAccommodationOptionImages,
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

const LEVEL_OPTIONS: { value: AccommodationLevel; label: string }[] = [
  { value: 'LV2', label: 'LV.2' },
  { value: 'LV3', label: 'LV.3' },
  { value: 'LV4', label: 'LV.4' },
  { value: 'LV5', label: 'LV.5' },
];

const REGIONS = ['고비사막', '중부', '홉스골', '울란바토르', '자브항', '울란곰'];

function OptionCard({
  opt,
  accommodationId,
  onDeleted,
}: {
  opt: AccommodationOption;
  accommodationId: string;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<AccommodationOption>>({});
  const { updateOption, loading: saving } = useUpdateAccommodationOption();
  const { deleteOption, loading: deleting } = useDeleteAccommodationOption();
  const { uploadImages, loading: uploading } = useUploadAccommodationOptionImages();
  const { removeImage, loading: removing } = useRemoveAccommodationOptionImage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const current = { ...opt, ...draft };

  async function handleSave() {
    if (Object.keys(draft).length === 0) { setEditing(false); return; }
    await updateOption(opt.id, accommodationId, draft);
    setEditing(false);
    setDraft({});
  }

  async function handleDelete() {
    if (!window.confirm('정말 이 옵션을 삭제할까요?')) return;
    await deleteOption(opt.id, accommodationId);
    onDeleted();
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    await uploadImages(opt.id, accommodationId, Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleRemoveImage(imageUrl: string) {
    if (!window.confirm('이 이미지를 삭제할까요?')) return;
    await removeImage(opt.id, accommodationId, imageUrl);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* 이미지 슬라이더 */}
      {opt.imageUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-2">
          {opt.imageUrls.map((url, i) => (
            <div key={i} className="relative shrink-0 group">
              <a href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt={`${opt.roomType} ${i + 1}`}
                  className="h-32 w-48 rounded-lg object-cover transition hover:opacity-90"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </a>
              {editing && (
                <button
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  disabled={removing}
                  className="absolute -right-1 -top-1 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white text-xs hover:bg-rose-700"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="border-t border-slate-100 px-4 pt-3 pb-1">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">이미지 추가 (jpg/png/webp, 최대 25MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              onChange={(e) => handleImageUpload(e.target.files)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
            />
            {uploading && <span className="text-slate-500">업로드 중...</span>}
          </label>
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
              <>
                <button className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onClick={() => setEditing(true)}>편집</button>
                <button
                  className="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  삭제
                </button>
              </>
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

function AddOptionModal({
  open,
  accommodationId,
  onClose,
}: {
  open: boolean;
  accommodationId: string;
  onClose: () => void;
}) {
  const { createOption, loading } = useCreateAccommodationOption();
  const [form, setForm] = useState<{
    roomType: string;
    level: AccommodationLevel;
    priceOffSeason: string;
    pricePeakSeason: string;
    capacity: string;
    mealIncluded: boolean;
    bookingPriority: string;
    note: string;
  }>({
    roomType: '',
    level: 'LV3',
    priceOffSeason: '',
    pricePeakSeason: '',
    capacity: '',
    mealIncluded: false,
    bookingPriority: '',
    note: '',
  });
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.roomType.trim()) {
      setError('객실 유형을 입력해 주세요.');
      return;
    }
    setError(null);
    try {
      await createOption({
        accommodationId,
        roomType: form.roomType.trim(),
        level: form.level,
        priceOffSeason: form.priceOffSeason ? parseInt(form.priceOffSeason, 10) : null,
        pricePeakSeason: form.pricePeakSeason ? parseInt(form.pricePeakSeason, 10) : null,
        capacity: form.capacity || null,
        mealIncluded: form.mealIncluded,
        bookingPriority: form.bookingPriority || null,
        note: form.note || null,
      });
      onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">객실 옵션 추가</h3>
        <p className="mt-1 text-sm text-slate-500">새 객실 옵션을 추가합니다.</p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">객실 유형 *</span>
            <input
              type="text"
              value={form.roomType}
              onChange={(e) => setForm((p) => ({ ...p, roomType: e.target.value }))}
              placeholder="예: 2인실 게르"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">등급</span>
            <select
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as AccommodationLevel }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">정원</span>
            <input
              type="text"
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
              placeholder="예: 2~3인"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">비수기 가격 (₮)</span>
            <input
              type="number"
              value={form.priceOffSeason}
              onChange={(e) => setForm((p) => ({ ...p, priceOffSeason: e.target.value }))}
              placeholder="0"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">성수기 가격 (₮)</span>
            <input
              type="number"
              value={form.pricePeakSeason}
              onChange={(e) => setForm((p) => ({ ...p, pricePeakSeason: e.target.value }))}
              placeholder="0"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">예약 우선순위</span>
            <select
              value={form.bookingPriority}
              onChange={(e) => setForm((p) => ({ ...p, bookingPriority: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="">-</option>
              <option value="1순위">1순위</option>
              <option value="2순위">2순위</option>
              <option value="3순위">3순위</option>
              <option value="보류">보류</option>
            </select>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.mealIncluded}
              onChange={(e) => setForm((p) => ({ ...p, mealIncluded: e.target.checked }))}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-slate-700">식사 포함</span>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">특이사항</span>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '추가 중...' : '추가'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function AccommodationDetailPage(): JSX.Element {
  const { accommodationId } = useParams<{ accommodationId: string }>();
  const navigate = useNavigate();
  const { accommodation, loading, refetch } = useAccommodation(accommodationId);
  const { updateAccommodation, loading: updating } = useUpdateAccommodation();
  const { deleteAccommodation, loading: deleting } = useDeleteAccommodation();

  const [editingAccom, setEditingAccom] = useState(false);
  const [accomDraft, setAccomDraft] = useState<{ name: string; region: string; destination: string }>({
    name: '',
    region: '',
    destination: '',
  });
  const [addOptionOpen, setAddOptionOpen] = useState(false);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중...</p>;
  if (!accommodation) return <p className="text-sm text-slate-500">숙소를 찾을 수 없습니다.</p>;

  const coverImage = accommodation.options.flatMap((o) => o.imageUrls)[0];

  const startEditAccom = () => {
    setAccomDraft({
      name: accommodation.name,
      region: accommodation.region,
      destination: accommodation.destination,
    });
    setEditingAccom(true);
  };

  const saveAccom = async () => {
    await updateAccommodation(accommodation.id, accomDraft);
    await refetch();
    setEditingAccom(false);
  };

  return (
    <section className="mx-auto grid max-w-5xl gap-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/accommodations')} className="text-slate-400 hover:text-slate-700">
            ← 목록
          </button>
          {editingAccom ? (
            <div className="grid gap-2 sm:flex sm:items-end sm:gap-3">
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500">숙소명</span>
                <input
                  type="text"
                  value={accomDraft.name}
                  onChange={(e) => setAccomDraft((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500">지역</span>
                <select
                  value={accomDraft.region}
                  onChange={(e) => setAccomDraft((p) => ({ ...p, region: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500">목적지</span>
                <input
                  type="text"
                  value={accomDraft.destination}
                  onChange={(e) => setAccomDraft((p) => ({ ...p, destination: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{accommodation.name}</h1>
              <p className="text-sm text-slate-500">{accommodation.region} · {accommodation.destination}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {editingAccom ? (
            <>
              <Button variant="outline" onClick={() => setEditingAccom(false)} disabled={updating}>취소</Button>
              <Button onClick={saveAccom} disabled={updating}>{updating ? '저장 중...' : '저장'}</Button>
            </>
          ) : (
            <>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={async () => {
                  if (!accommodationId) return;
                  if (!window.confirm('숙소를 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) return;
                  await deleteAccommodation(accommodationId);
                  navigate('/accommodations');
                }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </Button>
              <Button variant="outline" onClick={startEditAccom}>숙소 편집</Button>
            </>
          )}
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-800">
            객실 옵션 ({accommodation.options.length}개)
          </h2>
          <Button onClick={() => setAddOptionOpen(true)}>+ 옵션 추가</Button>
        </div>
        <div className="grid gap-4">
          {accommodation.options.map((opt) => (
            <OptionCard
              key={opt.id}
              opt={opt}
              accommodationId={accommodation.id}
              onDeleted={() => refetch()}
            />
          ))}
        </div>
      </div>

      <AddOptionModal
        open={addOptionOpen}
        accommodationId={accommodation.id}
        onClose={() => setAddOptionOpen(false)}
      />
    </section>
  );
}
