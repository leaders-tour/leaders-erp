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

  const changeType = (t: LodgingAssignmentType) => {
    set('type', t);
    if (t !== 'ACCOMMODATION') {
      set('accommodationId', null);
      set('accommodationOptionId', null);
      if (t !== 'CUSTOM_TEXT') set('lodgingNameSnapshot', LODGING_TYPE_LABELS[t]);
    } else {
      set('lodgingNameSnapshot', '');
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">숙소 배정</p>
      </div>

      <div className="p-4 grid gap-5">
        {/* ① 타입 탭 */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">타입</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(LODGING_TYPE_LABELS) as LodgingAssignmentType[]).filter((t) => t !== 'LV3' && t !== 'LV4').map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  form.type === t
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {LODGING_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* ② 숙소 선택 또는 이름 입력 */}
        {form.type === 'ACCOMMODATION' ? (
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">숙소 선택</p>
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
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">숙소명</p>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              value={form.lodgingNameSnapshot}
              onChange={(e) => set('lodgingNameSnapshot', e.target.value)}
              placeholder="숙소 이름을 입력하세요"
            />
          </div>
        )}

        {/* ③ 객실수 + 메모 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">객실수</p>
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => set('roomCount', Math.max(1, form.roomCount - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-l-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-lg font-medium"
              >
                −
              </button>
              <span className="flex h-9 min-w-[2.5rem] items-center justify-center border-y border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
                {form.roomCount}
              </span>
              <button
                type="button"
                onClick={() => set('roomCount', form.roomCount + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-r-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-lg font-medium"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">메모</p>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              value={form.bookingMemo}
              onChange={(e) => set('bookingMemo', e.target.value)}
              placeholder="내부 메모"
            />
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
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

// ── 하루 섹션 (컴팩트 한 줄) ──────────────────────────────────────────────────

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

  const dateLabel =
    checkInDate && checkOutDate
      ? `${formatDateShort(checkInDate.toISOString())} → ${formatDateShort(checkOutDate.toISOString())}`
      : null;

  return (
    <div>
      {/* 한 줄 요약 행 */}
      <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
        {/* 일차 뱃지 */}
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
          {dayIndex}
        </span>

        {/* 날짜 */}
        {dateLabel && (
          <span className="shrink-0 text-xs text-slate-400 w-28">{dateLabel}</span>
        )}

        {/* 숙소 정보 or 미배정 */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {lodging ? (
            <>
              {(() => {
                const thumb = lodging.accommodation?.options.flatMap((o) => o.imageUrls)[0] ?? null;
                return thumb ? (
                  <img src={thumb} alt="" className="h-6 w-8 shrink-0 rounded object-cover border border-slate-100" />
                ) : null;
              })()}
              <TypeChip type={lodging.type} />
              <span className="text-xs font-medium text-slate-700 truncate">
                {lodging.lodgingNameSnapshot}
              </span>
              {lodging.roomCount > 1 && (
                <span className="text-xs text-slate-400 shrink-0">{lodging.roomCount}실</span>
              )}
              {lodging.conflictWarnings.length > 0 && (
                <div className="group relative shrink-0">
                  <span className="cursor-help rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                    ⚠{lodging.conflictWarnings.length}
                  </span>
                  <div className="absolute left-0 bottom-full mb-1 z-10 hidden group-hover:block w-48 rounded-xl bg-red-50 border border-red-200 p-2 shadow-lg text-xs text-red-700">
                    {lodging.conflictWarnings.map((w, i) => (
                      <p key={i}>{w.conflictingTripLeaderName} ({formatDateShort(w.overlapStartDate)})</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-300 italic">미배정</span>
          )}
        </div>

        {/* 액션 버튼 */}
        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
                lodging
                  ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              {lodging ? '편집' : '+ 배정'}
            </button>
            {lodging && (
              <button
                type="button"
                onClick={() => onDelete(lodging.id)}
                className="rounded-lg p-0.5 text-slate-200 hover:text-red-400 hover:bg-red-50 transition-colors"
                title="삭제"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* 확장 폼 */}
      {editing && (
        <div className="mb-1">
          <InlineForm
            tripId={tripId}
            dayIndex={dayIndex}
            checkInDate={checkInDate ?? new Date()}
            checkOutDate={checkOutDate ?? addDays(checkInDate ?? new Date(), 1)}
            existing={lodging}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
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
  embedded = false,
}: {
  tripId: string;
  hasPlan: boolean;
  totalDays?: number | null;
  travelStartDate?: string | null;
  embedded?: boolean;
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

  const dayList = (
    <div className="grid gap-0.5">
      {loading ? (
        <p className="py-4 text-center text-xs text-slate-400">불러오는 중...</p>
      ) : dayIndices.length === 0 && nights == null ? (
        <div className="flex items-center gap-2 py-2">
          <span className="text-xs text-slate-400">박수 입력:</span>
          <input
            type="number"
            min={1}
            max={30}
            placeholder="박"
            className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center"
            value={manualNights ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setManualNights(v > 0 ? v : null);
            }}
          />
        </div>
      ) : dayIndices.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">배정된 숙소가 없습니다.</p>
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
  );

  /* ── 견적 덮어쓰기 모달 ── */
  const seedModal = seedConfirm && (
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
  );

  /* ── embedded 모드: 래퍼 없이 내용만 반환 ── */
  if (embedded) {
    return (
      <>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            숙소{nights != null ? ` · ${nights}박` : ''}
          </span>
          {hasPlan && (
            <button
              type="button"
              disabled={seeding}
              onClick={() => {
                if (lodgings.length > 0) setSeedConfirm(true);
                else void handleSeed();
              }}
              className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              {seeding ? '불러오는 중...' : '견적에서 가져오기'}
            </button>
          )}
        </div>
        {dayList}
        {seedModal}
      </>
    );
  }

  /* ── 독립 카드 모드 ── */
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
      <div className="p-4">{dayList}</div>
      {seedModal}
    </section>
  );
}
