import { Button, Card } from '@tour/ui';
import { useCallback, useMemo, useState } from 'react';

import type { CalendarNoteKind, CalendarNoteRow } from './hooks';
import {
  useConfirmedTripCalendarNotes,
  useCreateCalendarNote,
  useDeleteCalendarNote,
  useUpdateCalendarNote,
} from './hooks';

const SECTION_KINDS = ['CAMEL_DOLL', 'NOMADIC_SHOW', 'CUSTOM'] as const satisfies readonly CalendarNoteKind[];

type SectionKind = (typeof SECTION_KINDS)[number];

const KIND_LABEL: Record<SectionKind, string> = {
  CAMEL_DOLL: '낙타인형구매',
  NOMADIC_SHOW: '노마딕쇼',
  CUSTOM: '직접입력',
};

function isSectionKind(k: CalendarNoteKind): k is SectionKind {
  return (SECTION_KINDS as readonly CalendarNoteKind[]).includes(k);
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

interface Props {
  tripId: string;
  tripActive: boolean;
  /** 신규 행 기본 날짜 (YYYY-MM-DD) */
  defaultDateIso: string;
}

export function ConfirmedTripScheduleSection({
  tripId,
  tripActive,
  defaultDateIso,
}: Props): JSX.Element {
  const { notes, loading, refetch } = useConfirmedTripCalendarNotes(tripId);
  const { createCalendarNote } = useCreateCalendarNote();
  const { updateCalendarNote } = useUpdateCalendarNote();
  const { deleteCalendarNote } = useDeleteCalendarNote();

  const filteredNotes = useMemo(
    () => notes.filter((n) => isSectionKind(n.kind)),
    [notes],
  );

  const afterChange = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState({
    occursOn: defaultDateIso,
    kind: 'CAMEL_DOLL' as SectionKind,
    customText: '',
    timeText: '',
    headcount: '',
    memo: '',
  });

  const resetAddDraft = useCallback(() => {
    setAddDraft({
      occursOn: defaultDateIso,
      kind: 'CAMEL_DOLL',
      customText: '',
      timeText: '',
      headcount: '',
      memo: '',
    });
  }, [defaultDateIso]);

  async function handleCreate() {
    if (!addDraft.occursOn) {
      window.alert('날짜를 입력해 주세요.');
      return;
    }
    if (addDraft.kind === 'CUSTOM' && !addDraft.customText.trim()) {
      window.alert('직접입력 제목을 입력해 주세요.');
      return;
    }
    const headParsed =
      addDraft.headcount.trim() === '' ? null : Number.parseInt(addDraft.headcount, 10);
    if (addDraft.headcount.trim() !== '' && (!Number.isFinite(headParsed) || headParsed! < 1)) {
      window.alert('인원은 1 이상의 숫자로 입력해 주세요.');
      return;
    }
    try {
      await createCalendarNote({
        occursOn: addDraft.occursOn,
        kind: addDraft.kind,
        customText: addDraft.kind === 'CUSTOM' ? addDraft.customText.trim() : null,
        timeText: addDraft.timeText.trim() || null,
        headcount: headParsed,
        confirmedTripId: tripId,
        memo: addDraft.memo.trim() || null,
      });
      setAdding(false);
      resetAddDraft();
      await afterChange();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    }
  }

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">운영 일정</h2>
          <p className="mt-1 text-xs text-slate-500">
            낙타인형·노마딕쇼·직접입력 일정을 추가합니다. 실투어 외 픽드랍은 견적 메타를 따르며 캘린더에 자동
            표시됩니다.
          </p>
        </div>
        {tripActive ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              resetAddDraft();
              setAdding(true);
            }}
          >
            항목 추가
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4">
        {loading ? (
          <p className="text-sm text-slate-400">불러오는 중...</p>
        ) : filteredNotes.length === 0 && !adding ? (
          <p className="text-sm text-slate-400">등록된 일정이 없습니다.</p>
        ) : null}

        {filteredNotes.map((note) => (
          <ScheduleNoteRow
            key={note.id}
            note={note}
            tripActive={tripActive}
            tripId={tripId}
            updateCalendarNote={updateCalendarNote}
            deleteCalendarNote={deleteCalendarNote}
            afterChange={afterChange}
          />
        ))}

        {adding && tripActive ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
            <p className="mb-3 text-xs font-medium text-slate-600">새 일정</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs">
                <span className="text-slate-500">날짜 *</span>
                <input
                  type="date"
                  value={addDraft.occursOn}
                  onChange={(e) => setAddDraft((d) => ({ ...d, occursOn: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-500">제목 *</span>
                <select
                  value={addDraft.kind}
                  onChange={(e) =>
                    setAddDraft((d) => ({ ...d, kind: e.target.value as SectionKind }))
                  }
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {(SECTION_KINDS as readonly SectionKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-500">시간 (선택)</span>
                <input
                  type="time"
                  value={addDraft.timeText}
                  onChange={(e) => setAddDraft((d) => ({ ...d, timeText: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-500">인원 (선택)</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="예: 6"
                  value={addDraft.headcount}
                  onChange={(e) => setAddDraft((d) => ({ ...d, headcount: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              {addDraft.kind === 'CUSTOM' ? (
                <label className="grid gap-1 text-xs sm:col-span-2">
                  <span className="text-slate-500">표시 문구 *</span>
                  <input
                    type="text"
                    value={addDraft.customText}
                    onChange={(e) => setAddDraft((d) => ({ ...d, customText: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="캘린더에 표시할 제목"
                  />
                </label>
              ) : null}
              <label className="grid gap-1 text-xs sm:col-span-2">
                <span className="text-slate-500">메모 (선택)</span>
                <textarea
                  value={addDraft.memo}
                  onChange={(e) => setAddDraft((d) => ({ ...d, memo: e.target.value }))}
                  rows={2}
                  className="resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={() => void handleCreate()}>
                저장
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  resetAddDraft();
                }}
              >
                취소
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

interface RowProps {
  note: CalendarNoteRow;
  tripActive: boolean;
  tripId: string;
  updateCalendarNote: ReturnType<typeof useUpdateCalendarNote>['updateCalendarNote'];
  deleteCalendarNote: ReturnType<typeof useDeleteCalendarNote>['deleteCalendarNote'];
  afterChange: () => Promise<void>;
}

function ScheduleNoteRow({
  note,
  tripActive,
  tripId,
  updateCalendarNote,
  deleteCalendarNote,
  afterChange,
}: RowProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    occursOn: toDateInput(note.occursOn),
    kind: note.kind as SectionKind,
    customText: note.customText ?? '',
    timeText: note.timeText ?? '',
    headcount: note.headcount != null ? String(note.headcount) : '',
    memo: note.memo ?? '',
  });

  async function handleSave() {
    if (!draft.occursOn) {
      window.alert('날짜를 입력해 주세요.');
      return;
    }
    if (draft.kind === 'CUSTOM' && !draft.customText.trim()) {
      window.alert('직접입력 제목을 입력해 주세요.');
      return;
    }
    const headParsed = draft.headcount.trim() === '' ? null : Number.parseInt(draft.headcount, 10);
    if (draft.headcount.trim() !== '' && (!Number.isFinite(headParsed) || headParsed! < 1)) {
      window.alert('인원은 1 이상의 숫자로 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateCalendarNote(note.id, {
        occursOn: draft.occursOn,
        kind: draft.kind,
        customText: draft.kind === 'CUSTOM' ? draft.customText.trim() : null,
        timeText: draft.timeText.trim() || null,
        headcount: headParsed,
        confirmedTripId: tripId,
        memo: draft.memo.trim() || null,
      });
      setEditing(false);
      await afterChange();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('이 일정을 삭제할까요?')) return;
    try {
      await deleteCalendarNote(note.id);
      await afterChange();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    }
  }

  const titleLabel = isSectionKind(note.kind) ? KIND_LABEL[note.kind] : note.kind;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {!editing ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-slate-900">{titleLabel}</p>
            <p className="mt-1 text-slate-600">
              {toDateInput(note.occursOn)}
              {note.timeText ? ` · ${note.timeText}` : ''}
              {note.headcount != null ? ` · ${note.headcount}명` : ''}
            </p>
            {note.kind === 'CUSTOM' && note.customText ? (
              <p className="mt-1 text-slate-700">{note.customText}</p>
            ) : null}
            {note.memo ? (
              <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{note.memo}</p>
            ) : null}
          </div>
          {tripActive ? (
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setDraft({
                    occursOn: toDateInput(note.occursOn),
                    kind: note.kind as SectionKind,
                    customText: note.customText ?? '',
                    timeText: note.timeText ?? '',
                    headcount: note.headcount != null ? String(note.headcount) : '',
                    memo: note.memo ?? '',
                  });
                  setEditing(true);
                }}
              >
                편집
              </Button>
              <Button type="button" variant="outline" className="text-xs text-red-600" onClick={() => void handleDelete()}>
                삭제
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              <span className="text-slate-500">날짜 *</span>
              <input
                type="date"
                value={draft.occursOn}
                onChange={(e) => setDraft((d) => ({ ...d, occursOn: e.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-slate-500">제목 *</span>
              <select
                value={draft.kind}
                onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as SectionKind }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                {(SECTION_KINDS as readonly SectionKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-slate-500">시간 (선택)</span>
              <input
                type="time"
                value={draft.timeText}
                onChange={(e) => setDraft((d) => ({ ...d, timeText: e.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-slate-500">인원 (선택)</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={draft.headcount}
                onChange={(e) => setDraft((d) => ({ ...d, headcount: e.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            {draft.kind === 'CUSTOM' ? (
              <label className="grid gap-1 text-xs sm:col-span-2">
                <span className="text-slate-500">표시 문구 *</span>
                <input
                  type="text"
                  value={draft.customText}
                  onChange={(e) => setDraft((d) => ({ ...d, customText: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
            ) : null}
            <label className="grid gap-1 text-xs sm:col-span-2">
              <span className="text-slate-500">메모 (선택)</span>
              <textarea
                value={draft.memo}
                onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
                rows={2}
                className="resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? '저장 중...' : '저장'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setDraft({
                  occursOn: toDateInput(note.occursOn),
                  kind: note.kind as SectionKind,
                  customText: note.customText ?? '',
                  timeText: note.timeText ?? '',
                  headcount: note.headcount != null ? String(note.headcount) : '',
                  memo: note.memo ?? '',
                });
                setEditing(false);
              }}
            >
              취소
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
