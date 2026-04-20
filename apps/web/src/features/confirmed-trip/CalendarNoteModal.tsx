import { useState, useEffect } from 'react';
import type { CalendarNoteKind, CalendarNoteRow, ConfirmedTripRow } from './hooks';
import { getTripLeaderName, getTripStartDate } from './hooks';

interface CalendarNoteModalProps {
  open: boolean;
  initialDate?: string;
  note?: CalendarNoteRow | null;
  confirmedTrips: ConfirmedTripRow[];
  saving: boolean;
  onSave: (payload: {
    occursOn: string;
    kind: CalendarNoteKind;
    customText?: string | null;
    confirmedTripId?: string | null;
    memo?: string | null;
  }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const KIND_LABELS: Record<CalendarNoteKind, string> = {
  GUEST_HOUSE: '게스트하우스',
  PICKUP: '픽업',
  DROP: '드랍',
  CAMEL_DOLL: '낙타인형 구매',
  CUSTOM: '직접입력',
};

const KIND_OPTIONS: CalendarNoteKind[] = ['GUEST_HOUSE', 'PICKUP', 'DROP', 'CAMEL_DOLL', 'CUSTOM'];

export function CalendarNoteModal({
  open,
  initialDate,
  note,
  confirmedTrips,
  saving,
  onSave,
  onDelete,
  onClose,
}: CalendarNoteModalProps): JSX.Element | null {
  const [occursOn, setOccursOn] = useState('');
  const [kind, setKind] = useState<CalendarNoteKind>('PICKUP');
  const [customText, setCustomText] = useState('');
  const [confirmedTripId, setConfirmedTripId] = useState<string>('');
  const [memo, setMemo] = useState('');
  const [tripSearch, setTripSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    if (note) {
      setOccursOn(note.occursOn.slice(0, 10));
      setKind(note.kind);
      setCustomText(note.customText ?? '');
      setConfirmedTripId(note.confirmedTripId ?? '');
      setMemo(note.memo ?? '');
    } else {
      setOccursOn(initialDate ?? '');
      setKind('PICKUP');
      setCustomText('');
      setConfirmedTripId('');
      setMemo('');
    }
    setTripSearch('');
  }, [open, note, initialDate]);

  if (!open) return null;

  const filteredTrips = confirmedTrips.filter((t) => {
    if (!tripSearch) return true;
    const leader = getTripLeaderName(t).toLowerCase();
    return leader.includes(tripSearch.toLowerCase());
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      occursOn,
      kind,
      customText: kind === 'CUSTOM' ? (customText.trim() || null) : null,
      confirmedTripId: confirmedTripId || null,
      memo: memo.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {note ? '일정 수정' : '일정 추가'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-5">
          {/* 날짜 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">날짜</label>
            <input
              type="date"
              required
              value={occursOn}
              onChange={(e) => setOccursOn(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>

          {/* 항목 선택 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">항목</label>
            <div className="flex flex-wrap gap-2">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    kind === k
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          {/* 직접입력 텍스트 */}
          {kind === 'CUSTOM' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">표시 문구</label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="캘린더에 표시할 텍스트"
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </div>
          )}

          {/* 고객 선택 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">고객 (없으면 독립 메모)</label>
            <div className="relative">
              <input
                type="text"
                value={tripSearch}
                onChange={(e) => setTripSearch(e.target.value)}
                placeholder="이름으로 검색..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setConfirmedTripId('')}
                className={`flex w-full items-center px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                  confirmedTripId === '' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600'
                }`}
              >
                고객 없음
              </button>
              {filteredTrips.map((t) => {
                const startStr = getTripStartDate(t);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfirmedTripId(t.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                      confirmedTripId === t.id ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    <span>{getTripLeaderName(t)}</span>
                    {startStr && (
                      <span className="ml-2 shrink-0 text-slate-400">
                        {startStr.slice(0, 10)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">메모 (선택)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="추가 메모..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {note && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving || !occursOn}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
