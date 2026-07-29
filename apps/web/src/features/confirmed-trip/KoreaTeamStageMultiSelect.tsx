import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useConfirmedTripKoreaTeamStageOptions,
  useCreateConfirmedTripKoreaTeamStageOption,
  type ConfirmedTripKoreaTeamStageOptionRow,
} from './hooks';
import { useDebouncedSelectionSave } from './useDebouncedSelectionSave';
import { useOptimisticSelection } from './useOptimisticSelection';
import { trackConfirmedTripSelectionPending } from './confirmed-trip-selection-persistence';

const CHIP_CLASS_BY_TONE: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};
const DEFAULT_CHIP_CLASS = 'bg-slate-100 text-slate-700 ring-slate-500/20';

function stageChipClass(option: ConfirmedTripKoreaTeamStageOptionRow): string {
  return CHIP_CLASS_BY_TONE[option.colorTone] ?? DEFAULT_CHIP_CLASS;
}

interface KoreaTeamStageMultiSelectProps {
  tripId: string;
  selected: ConfirmedTripKoreaTeamStageOptionRow[];
  disabled?: boolean;
  compact?: boolean;
  onChange: (optionIds: string[]) => void | Promise<void>;
}

export function KoreaTeamStageMultiSelect({
  tripId,
  selected,
  disabled = false,
  compact = false,
  onChange,
}: KoreaTeamStageMultiSelectProps): JSX.Element {
  const { options } = useConfirmedTripKoreaTeamStageOptions(true);
  const { createOption } = useCreateConfirmedTripKoreaTeamStageOption();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { displaySelected, beginPending, rollback } = useOptimisticSelection(selected);
  const { scheduleSave, saveImmediately, flushPending } = useDebouncedSelectionSave(onChange);

  const selectedIds = useMemo(() => displaySelected.map((option) => option.id), [displaySelected]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleOptions = useMemo(() => {
    const byId = new Map<string, ConfirmedTripKoreaTeamStageOptionRow>();
    for (const option of options) byId.set(option.id, option);
    for (const option of displaySelected) byId.set(option.id, option);
    return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }, [displaySelected, options]);

  useEffect(() => {
    if (!open) {
      flushPending();
    }
  }, [open, flushPending]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function commit(nextIds: string[], immediate = false): void {
    const nextSelected = visibleOptions.filter((option) => nextIds.includes(option.id));
    beginPending(nextIds, nextSelected);
    trackConfirmedTripSelectionPending('koreaTeamStages', tripId, nextIds);
    if (immediate) {
      saveImmediately(nextIds, rollback);
      return;
    }
    scheduleSave(nextIds, rollback);
  }

  function toggle(optionId: string): void {
    const next = selectedIdSet.has(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    commit(next);
  }

  async function handleCreate(): Promise<void> {
    const label = draft.trim();
    if (!label) return;
    setCreating(true);
    try {
      const option = await createOption(label);
      if (!selectedIdSet.has(option.id)) {
        commit([...selectedIds, option.id], true);
      }
      setDraft('');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '옵션 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative inline-block max-w-full" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled || creating}
        onClick={() => setOpen((v) => !v)}
        className={`flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-transparent text-left transition hover:border-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? 'min-w-[8rem] px-1.5 py-1' : 'min-w-[12rem] px-2 py-1.5'
        }`}
      >
        {displaySelected.length > 0 ? (
          displaySelected.map((option) => (
            <span
              key={option.id}
              className={`inline-flex max-w-[9rem] items-center truncate rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${stageChipClass(option)}`}
            >
              {option.label}
            </span>
          ))
        ) : (
          <span className="text-xs font-medium text-slate-400">단계 선택</span>
        )}
      </button>

      {open ? (
        <div className="absolute left-0 z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-3 text-xs text-slate-400">옵션 없음</p>
            ) : (
              visibleOptions.map((option) => {
                const checked = selectedIdSet.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      toggle(option.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                        checked
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${stageChipClass(option)}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <input
              type="text"
              value={draft}
              disabled={creating}
              maxLength={50}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreate();
                }
                if (event.key === 'Escape') {
                  setOpen(false);
                }
              }}
              placeholder="새 옵션 추가"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-900"
            />
            <button
              type="button"
              disabled={creating || !draft.trim()}
              onClick={() => {
                void handleCreate();
              }}
              className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              옵션 추가
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
