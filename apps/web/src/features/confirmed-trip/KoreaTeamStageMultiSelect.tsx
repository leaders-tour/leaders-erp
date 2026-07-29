import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useConfirmedTripKoreaTeamStageOptions,
  type ConfirmedTripKoreaTeamStageOptionRow,
} from './hooks';
import { useDebouncedSelectionSave } from './useDebouncedSelectionSave';
import { useOptimisticSelection } from './useOptimisticSelection';
import { trackConfirmedTripSelectionPending } from './confirmed-trip-selection-persistence';
import { koreaTeamStageChipClass } from './korea-team-stage-colors';
import {
  KoreaTeamStageSettingsModal,
  KoreaTeamStageSettingsTrigger,
} from './KoreaTeamStageSettingsModal';

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
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { displaySelected, beginPending, rollback } = useOptimisticSelection(selected);
  const { scheduleSave, flushPending } = useDebouncedSelectionSave(onChange);

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

  function commit(nextIds: string[]): void {
    const nextSelected = visibleOptions.filter((option) => nextIds.includes(option.id));
    beginPending(nextIds, nextSelected);
    trackConfirmedTripSelectionPending('koreaTeamStages', tripId, nextIds);
    scheduleSave(nextIds, rollback);
  }

  function toggle(optionId: string): void {
    const next = selectedIdSet.has(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    commit(next);
  }

  return (
    <>
      <div ref={wrapRef} className="relative inline-block max-w-full" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={`flex max-w-full items-center gap-1 rounded-lg border border-transparent text-left transition hover:border-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
            compact
              ? 'min-w-[8rem] flex-nowrap overflow-x-auto px-1.5 py-1'
              : 'min-w-[12rem] flex-wrap px-2 py-1.5'
          }`}
        >
          {displaySelected.length > 0 ? (
            displaySelected.map((option) => (
              <span
                key={option.id}
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${koreaTeamStageChipClass(option.colorTone)} ${
                  compact ? 'shrink-0 whitespace-nowrap' : 'max-w-[9rem] truncate'
                }`}
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
                      onClick={() => {
                        toggle(option.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
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
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${koreaTeamStageChipClass(option.colorTone)}`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <KoreaTeamStageSettingsTrigger
                disabled={disabled}
                onClick={() => {
                  setSettingsOpen(true);
                  setOpen(false);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <KoreaTeamStageSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
