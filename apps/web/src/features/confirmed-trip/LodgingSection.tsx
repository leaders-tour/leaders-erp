import { useState } from 'react';
import { useAccommodations } from '../accommodation/hooks';
import type { AccommodationRow } from '../accommodation/hooks';
import {
  LODGING_TYPE_CHIP_STYLES,
  LODGING_TYPE_LABELS,
  useConfirmedTripLodgings,
  useDeleteConfirmedTripLodging,
  useSeedConfirmedTripLodgings,
  useUpsertConfirmedTripLodging,
  type ConfirmedTripLodgingRow,
  type LodgingAssignmentType,
} from './lodging-hooks';

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Chip ─────────────────────────────────────────────────────────────────────

function TypeChip({ type }: { type: LodgingAssignmentType }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${LODGING_TYPE_CHIP_STYLES[type]}`}
    >
      {LODGING_TYPE_LABELS[type]}
    </span>
  );
}

// ── 숙소 검색·선택 컴포넌트 (인라인용) ──────────────────────────────────────

function AccommodationPicker({
  accommodationId,
  optionId,
  onChange,
}: {
  accommodationId: string | null;
  optionId: string | null;
  onChange: (accId: string | null, optId: string | null, name: string) => void;
}) {
  const { accommodations } = useAccommodations();
  const [search, setSearch] = useState('');

  const selected = accommodations.find((a) => a.id === accommodationId) ?? null;

  const filtered = search.trim()
    ? accommodations.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.region.toLowerCase().includes(search.toLowerCase()),
      )
    : accommodations;

  if (selected) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-blue-900">{selected.name}</p>
          <button
            type="button"
            onClick={() => onChange(null, null, '')}
            className="text-xs text-blue-500 hover:underline"
          >
            변경
          </button>
        </div>
        <div className="grid gap-2">
          {selected.options.length === 0 ? (
            <p className="text-xs text-slate-400">옵션 없음</p>
          ) : (
            selected.options.map((opt) => {
              const isSelected = optionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange(selected.id, opt.id, `${selected.name} - ${opt.roomType}`)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  {/* 상단: 썸네일 + 정보 */}
                  <div className="flex gap-3">
                    {/* 썸네일 */}
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {opt.imageUrls[0] ? (
                        <img src={opt.imageUrls[0]} alt={opt.roomType} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">🛏</div>
                      )}
                    </div>
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-sm text-slate-800 leading-tight">{opt.roomType}</p>
                        {isSelected && (
                          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs">✓</span>
                        )}
                      </div>
                      {/* 뱃지 행 */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {opt.capacity && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                            👤 {opt.capacity}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
                          {opt.level}
                        </span>
                        {opt.mealIncluded && (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-600">
                            🍽 식사포함
                          </span>
                        )}
                        {opt.bookingPriority && (
                          <span className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-600">
                            ★ {opt.bookingPriority}
                          </span>
                        )}
                      </div>
                      {/* 특이사항 */}
                      {opt.note && (
                        <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1 leading-snug line-clamp-2">
                          ⚠ {opt.note}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* 하단: 추가 사진 갤러리 */}
                  {opt.imageUrls.length > 1 && (
                    <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
                      {opt.imageUrls.slice(1).map((url, i) => (
                        <div
                          key={i}
                          className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100"
                        >
                          <img src={url} alt={`${opt.roomType} ${i + 2}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
        placeholder="숙소 이름·지역 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-44 overflow-y-auto grid gap-1 pr-0.5">
        {filtered.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">결과 없음</p>
        ) : (
          filtered.map((acc) => (
            <AccommodationListItem
              key={acc.id}
              acc={acc}
              onSelect={() => {
                const firstOpt = acc.options[0];
                if (acc.options.length === 1 && firstOpt) {
                  onChange(acc.id, firstOpt.id, `${acc.name} - ${firstOpt.roomType}`);
                } else {
                  onChange(acc.id, null, acc.name);
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AccommodationListItem({
  acc,
  onSelect,
}: {
  acc: AccommodationRow;
  onSelect: () => void;
}) {
  const firstImg = acc.options.flatMap((o) => o.imageUrls)[0] ?? null;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
    >
      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {firstImg ? (
          <img src={firstImg} alt={acc.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl text-slate-300">🏨</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{acc.name}</p>
        <p className="text-xs text-slate-400">{acc.region} · 옵션 {acc.options.length}개</p>
      </div>
    </button>
  );
}

// ── 인라인 배정 폼 ────────────────────────────────────────────────────────────

interface DayForm {
  type: LodgingAssignmentType;
  accommodationId: string | null;
  accommodationOptionId: string | null;
  lodgingNameSnapshot: string;
  roomCount: number;
  bookingMemo: string;
}

function makeDayForm(lodging?: ConfirmedTripLodgingRow | null): DayForm {
  if (lodging) {
    return {
      type: lodging.type,
      accommodationId: lodging.accommodationId,
      accommodationOptionId: lodging.accommodationOptionId,
      lodgingNameSnapshot: lodging.lodgingNameSnapshot,
      roomCount: lodging.roomCount,
      bookingMemo: lodging.bookingMemo ?? '',
    };
  }
  return {
    type: 'ACCOMMODATION',
    accommodationId: null,
    accommodationOptionId: null,
    lodgingNameSnapshot: '',
    roomCount: 1,
    bookingMemo: '',
  };
}

function InlineForm({
  tripId,
  dayIndex,
  checkInDate,
  checkOutDate,
  existing,
  onSaved,
  onCancel,
}: {
  tripId: string;
  dayIndex: number;
  checkInDate: Date;
  checkOutDate: Date;
  existing?: ConfirmedTripLodgingRow | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DayForm>(() => makeDayForm(existing));
  const { upsertLodging, loading } = useUpsertConfirmedTripLodging(tripId);

  const set = <K extends keyof DayForm>(k: K, v: DayForm[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    try {
      await upsertLodging({
        id: existing?.id,
        confirmedTripId: tripId,
        dayIndex,
        checkInDate: toInputDate(checkInDate),
        checkOutDate: toInputDate(checkOutDate),
        type: form.type,
        accommodationId: form.type === 'ACCOMMODATION' ? form.accommodationId : null,
        accommodationOptionId: form.type === 'ACCOMMODATION' ? form.accommodationOptionId : null,
        lodgingNameSnapshot: form.lodgingNameSnapshot || LODGING_TYPE_LABELS[form.type],
        roomCount: form.roomCount,
        bookingMemo: form.bookingMemo.trim() || null,
      });
      onSaved();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '저장 실패');
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 grid gap-3">
      {/* 타입 + 객실수 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label className="text-xs font-medium text-slate-500">타입</label>
          <select
            className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.type}
            onChange={(e) => {
              const t = e.target.value as LodgingAssignmentType;
              set('type', t);
              if (t !== 'ACCOMMODATION') {
                set('accommodationId', null);
                set('accommodationOptionId', null);
                if (t !== 'CUSTOM_TEXT') set('lodgingNameSnapshot', LODGING_TYPE_LABELS[t]);
              } else {
                set('lodgingNameSnapshot', '');
              }
            }}
          >
            {(Object.keys(LODGING_TYPE_LABELS) as LodgingAssignmentType[]).map((t) => (
              <option key={t} value={t}>{LODGING_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs font-medium text-slate-500">객실수</label>
          <input
            type="number"
            min={1}
            className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.roomCount}
            onChange={(e) => set('roomCount', parseInt(e.target.value, 10) || 1)}
          />
        </div>
      </div>

      {/* 숙소명 or Accommodation Picker */}
      {form.type === 'ACCOMMODATION' ? (
        <div className="grid gap-1">
          <label className="text-xs font-medium text-slate-500">숙소 선택</label>
          <AccommodationPicker
            accommodationId={form.accommodationId}
            optionId={form.accommodationOptionId}
            onChange={(accId, optId, name) => {
              set('accommodationId', accId);
              set('accommodationOptionId', optId);
              if (name) set('lodgingNameSnapshot', name);
            }}
          />
        </div>
      ) : (
        <div className="grid gap-1">
          <label className="text-xs font-medium text-slate-500">숙소명</label>
          <input
            className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.lodgingNameSnapshot}
            onChange={(e) => set('lodgingNameSnapshot', e.target.value)}
            placeholder="숙소 이름 입력"
          />
        </div>
      )}

      {/* 메모 */}
      <div className="grid gap-1">
        <label className="text-xs font-medium text-slate-500">메모</label>
        <input
          className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={form.bookingMemo}
          onChange={(e) => set('bookingMemo', e.target.value)}
          placeholder="내부 메모"
        />
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

// ── 하루 섹션 ─────────────────────────────────────────────────────────────────

function DayRow({
  tripId,
  dayIndex,
  checkInDate,
  checkOutDate,
  lodging,
  onDelete,
}: {
  tripId: string;
  dayIndex: number;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  lodging: ConfirmedTripLodgingRow | null;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  const thumbUrl =
    lodging?.accommodation?.options.flatMap((o) => o.imageUrls)[0] ?? null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      {/* 헤더: day 번호 + 날짜 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shrink-0">
            {dayIndex}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {dayIndex}일차 숙박
            </p>
            {checkInDate && checkOutDate && (
              <p className="text-xs text-slate-400">
                {formatDateShort(checkInDate.toISOString())} →{' '}
                {formatDateShort(checkOutDate.toISOString())}
              </p>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              lodging
                ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {lodging ? '편집' : '배정'}
          </button>
        )}
      </div>

      {/* 배정된 숙소 표시 */}
      {lodging && !editing && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="h-10 w-14 shrink-0 rounded-lg object-cover border border-slate-100"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xl text-slate-400">
              🏨
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {lodging.lodgingNameSnapshot}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                <TypeChip type={lodging.type} />
                {lodging.roomCount > 1 && (
                  <span className="text-xs text-slate-400">{lodging.roomCount}실</span>
                )}
              </div>
          </div>
          {/* 경고 배지 */}
          {lodging.conflictWarnings.length > 0 && (
            <div className="group relative shrink-0">
              <span className="cursor-help rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                ⚠ {lodging.conflictWarnings.length}
              </span>
              <div className="absolute right-0 bottom-full mb-1 z-10 hidden group-hover:block w-52 rounded-xl bg-red-50 border border-red-200 p-2 shadow-lg text-xs text-red-700">
                {lodging.conflictWarnings.map((w, i) => (
                  <p key={i}>
                    {w.conflictingTripLeaderName} ({formatDateShort(w.overlapStartDate)})
                  </p>
                ))}
              </div>
            </div>
          )}
          {/* 삭제 */}
          <button
            type="button"
            onClick={() => onDelete(lodging.id)}
            className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors"
            title="삭제"
          >
            ✕
          </button>
        </div>
      )}

      {/* 인라인 폼 */}
      {editing && (
        <InlineForm
          tripId={tripId}
          dayIndex={dayIndex}
          checkInDate={checkInDate ?? new Date()}
          checkOutDate={checkOutDate ?? addDays(checkInDate ?? new Date(), 1)}
          existing={lodging}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── 메인 LodgingSection ───────────────────────────────────────────────────────

export function LodgingSection({
  tripId,
  hasPlan,
  totalDays,
  travelStartDate,
}: {
  tripId: string;
  hasPlan: boolean;
  totalDays?: number | null;
  travelStartDate?: string | null;
}) {
  const { lodgings, loading } = useConfirmedTripLodgings(tripId);
  const { deleteLodging } = useDeleteConfirmedTripLodging(tripId);
  const { seedLodgings, loading: seeding } = useSeedConfirmedTripLodgings(tripId);
  const [seedConfirm, setSeedConfirm] = useState(false);
  // totalDays가 없을 때 직접 입력
  const [manualNights, setManualNights] = useState<number | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 숙소를 삭제하시겠습니까?')) return;
    await deleteLodging(id).catch((e) => window.alert(e instanceof Error ? e.message : '삭제 실패'));
  };

  const handleSeed = async () => {
    setSeedConfirm(false);
    await seedLodgings().catch((e) => window.alert(e instanceof Error ? e.message : '가져오기 실패'));
  };

  // 일차별 날짜 계산
  const derivedNights = totalDays != null && totalDays > 1 ? totalDays - 1 : null;
  const nights = derivedNights ?? manualNights;
  const baseDate = travelStartDate ? new Date(travelStartDate) : null;

  // dayIndex → 배정된 숙소 맵
  const lodgingByDay = new Map<number, ConfirmedTripLodgingRow>();
  for (const l of lodgings) {
    lodgingByDay.set(l.dayIndex, l);
  }

  // 일차가 있으면 day rows, 없으면 기존 lodgings만 표시
  const dayIndices: number[] =
    nights != null
      ? Array.from({ length: nights }, (_, i) => i + 1)
      : Array.from(new Set(lodgings.map((l) => l.dayIndex))).sort((a, b) => a - b);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">숙소 배정</h2>
          {nights != null && (
            <p className="text-xs text-slate-400 mt-0.5">{nights}박</p>
          )}
        </div>
        {hasPlan && (
          <button
            type="button"
            disabled={seeding}
            onClick={() => {
              if (lodgings.length > 0) setSeedConfirm(true);
              else void handleSeed();
            }}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {seeding ? '불러오는 중...' : '견적에서 가져오기'}
          </button>
        )}
      </div>

      {/* 박수 직접 입력 (totalDays 없을 때) */}
      {derivedNights == null && (
        <div className="px-4 pt-3 pb-0 flex items-center gap-2">
          <span className="text-xs text-slate-500">여행 일정 정보가 없습니다. 박수를 직접 입력하세요:</span>
          <input
            type="number"
            min={1}
            max={30}
            placeholder="박"
            className="w-16 rounded-xl border border-slate-200 px-2 py-1 text-sm text-center"
            value={manualNights ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setManualNights(v > 0 ? v : null);
            }}
          />
          <span className="text-xs text-slate-400">박</span>
        </div>
      )}

      {/* Day 리스트 */}
      <div className="p-4 grid gap-3">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">불러오는 중...</p>
        ) : dayIndices.length === 0 && nights == null ? (
          <p className="py-8 text-center text-sm text-slate-400">
            위에서 박수를 입력하면 일차별 배정 섹션이 나타납니다.
          </p>
        ) : dayIndices.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            배정된 숙소가 없습니다.
          </p>
        ) : (
          dayIndices.map((dayIdx) => {
            const checkIn = baseDate ? addDays(baseDate, dayIdx - 1) : null;
            const checkOut = checkIn ? addDays(checkIn, 1) : null;
            return (
              <DayRow
                key={dayIdx}
                tripId={tripId}
                dayIndex={dayIdx}
                checkInDate={checkIn}
                checkOutDate={checkOut}
                lodging={lodgingByDay.get(dayIdx) ?? null}
                onDelete={(id) => void handleDelete(id)}
              />
            );

          })
        )}
      </div>

      {/* 견적 덮어쓰기 확인 */}
      {seedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-2">견적에서 가져오기</h3>
            <p className="text-sm text-slate-600 mb-5">
              기존 배정 데이터를 모두 삭제하고 견적 기준으로 다시 채웁니다. 계속하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSeedConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSeed()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                덮어쓰기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
