import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { DatePickerModal } from '../../../components/date-picker/DatePickerModal';
import { formatDateTriggerLabel, getCurrentLocalYear } from '../../../components/date-picker/date-picker-utils';
import { TimePickerModal } from '../../../components/date-picker/TimePickerModal';
import { formatTimeTriggerLabel } from '../../../components/date-picker/time-picker-utils';
import {
  EXTERNAL_TRANSFER_PRESET_OPTIONS,
  buildEmptyExternalTransfer,
  buildExternalTransferFromPreset,
  isExternalTransferComplete,
  syncExternalTransferWithSelectedTeams,
  type ExternalTransfer,
  type ExternalTransferTeamLike,
} from '../external-transfer';

interface DatePickerTarget {
  field: 'travelDate';
  anchorEl: HTMLButtonElement;
}

interface TimePickerTarget {
  field: 'departureTime' | 'arrivalTime';
  anchorEl: HTMLButtonElement;
}

interface TriggerButtonProps {
  value: string;
  placeholder: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export interface ExternalTransferModalProps {
  open: boolean;
  transportGroups: ExternalTransferTeamLike[];
  initialValue?: ExternalTransfer | null;
  onClose: () => void;
  onSubmit: (value: ExternalTransfer) => void;
}

function TriggerButton({ value, placeholder, onClick }: TriggerButtonProps): JSX.Element {
  const label = value.trim().length > 0 ? value : placeholder;
  const isFilled = value.trim().length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
        isFilled
          ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
          : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100'
      }`}
      aria-haspopup="dialog"
    >
      <span>{label}</span>
      <span className="text-xs text-slate-400">선택</span>
    </button>
  );
}

function toggleSelection(values: number[], teamOrderIndex: number): number[] {
  if (values.includes(teamOrderIndex)) {
    return values.filter((value) => value !== teamOrderIndex);
  }

  return [...values, teamOrderIndex].sort((left, right) => left - right);
}

function toInitialDraft(initialValue: ExternalTransfer | null | undefined, transportGroups: ExternalTransferTeamLike[]): ExternalTransfer | null {
  if (initialValue) {
    return syncExternalTransferWithSelectedTeams(initialValue, transportGroups);
  }

  return null;
}

export function ExternalTransferModal({
  open,
  transportGroups,
  initialValue = null,
  onClose,
  onSubmit,
}: ExternalTransferModalProps): JSX.Element | null {
  const [draft, setDraft] = useState<ExternalTransfer | null>(null);
  const [unitPriceText, setUnitPriceText] = useState<string>('0');
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      setUnitPriceText('0');
      setDatePickerTarget(null);
      setTimePickerTarget(null);
      return;
    }

    const initialDraft = toInitialDraft(initialValue, transportGroups);
    setDraft(initialDraft);
    setUnitPriceText(initialDraft ? String(initialDraft.unitPriceKrw) : '0');
  }, [initialValue, open, transportGroups]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const activePresetCode = draft?.presetCode ?? null;
  const hasValidUnitPrice = Number.isInteger(Number(unitPriceText)) && Number(unitPriceText) >= 0;
  const isFormValid = Boolean(
    draft &&
      isExternalTransferComplete({
        ...draft,
        unitPriceKrw: hasValidUnitPrice ? Number(unitPriceText) : Number.NaN,
      }),
  );
  const timePickerValue = timePickerTarget && draft ? draft[timePickerTarget.field] : '';
  const timePickerAllowedMinutes = draft?.presetCode === 'CUSTOM' ? undefined : [0, 30];
  const title = initialValue ? '외부 이동 수정' : '외부 이동 추가';
  const selectedTeamCount = draft?.selectedTeamOrderIndexes.length ?? 0;
  const summaryText = useMemo(() => {
    if (!draft) {
      return 'preset 또는 수동입력을 먼저 선택하세요.';
    }

    return `${draft.direction === 'PICKUP' ? '픽업' : '드랍'} · ${selectedTeamCount}팀 · 팀당 ${
      hasValidUnitPrice ? Number(unitPriceText).toLocaleString('ko-KR') : '-'
    }원`;
  }, [draft, hasValidUnitPrice, selectedTeamCount, unitPriceText]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">preset을 고르면 팀 기준으로 날짜와 시간이 미리 채워집니다.</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {EXTERNAL_TRANSFER_PRESET_OPTIONS.map((option) => {
                const isSelected = activePresetCode === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      const defaultTeamOrderIndex = draft?.selectedTeamOrderIndexes[0] ?? (transportGroups[0] ? 0 : null);
                      const nextDraft =
                        option.code === 'CUSTOM'
                          ? {
                              ...buildEmptyExternalTransfer(),
                              direction: draft?.direction ?? 'PICKUP',
                              presetCode: 'CUSTOM' as const,
                            }
                          : buildExternalTransferFromPreset(option.code, defaultTeamOrderIndex, transportGroups);
                      setDraft(nextDraft);
                      setUnitPriceText(String(nextDraft.unitPriceKrw));
                    }}
                    className={`rounded-3xl border px-4 py-4 text-left transition ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className={`mt-2 text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>{option.description}</div>
                  </button>
                );
              })}
            </div>

            {!draft ? (
              <div className="mt-6 flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                상단에서 항목을 선택하면 입력 폼이 열립니다.
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{summaryText}</div>

                <div className="mt-5 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="grid content-start gap-4">
                    <div className="grid gap-2">
                      <span className="text-xs font-medium text-slate-600">구분</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(['PICKUP', 'DROP'] as const).map((direction) => {
                          const isSelected = draft.direction === direction;
                          return (
                            <button
                              key={direction}
                              type="button"
                              onClick={() => setDraft((current) => (current ? { ...current, direction } : current))}
                              disabled={draft.presetCode !== 'CUSTOM'}
                              className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              } ${draft.presetCode !== 'CUSTOM' ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              {direction === 'PICKUP' ? '픽업' : '드랍'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span className="text-xs font-medium text-slate-600">적용 팀</span>
                      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                        {transportGroups.length === 0 ? (
                          <div className="text-sm text-slate-500">먼저 팀 이동 정보를 입력해주세요.</div>
                        ) : (
                          transportGroups.map((group, index) => {
                            const isSelected = draft.selectedTeamOrderIndexes.includes(index);
                            return (
                              <label
                                key={`${group.teamName}-${index}`}
                                className={`flex cursor-pointer items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                                  isSelected
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span>
                                  {group.teamName || `${index + 1}번 팀`}
                                  <span className={`ml-2 text-xs ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                                    {group.flightInDate && group.flightOutDate ? `${group.flightInDate} ~ ${group.flightOutDate}` : '항공 일정 없음'}
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const nextSelectedTeamOrderIndexes = toggleSelection(draft.selectedTeamOrderIndexes, index);
                                    const nextDraft = syncExternalTransferWithSelectedTeams(
                                      { ...draft, selectedTeamOrderIndexes: nextSelectedTeamOrderIndexes },
                                      transportGroups,
                                    );
                                    setDraft(nextDraft);
                                    setUnitPriceText(String(nextDraft.unitPriceKrw));
                                  }}
                                />
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <label className="grid gap-1 text-sm">
                      <span className="text-xs font-medium text-slate-600">팀당 금액</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={unitPriceText}
                        onChange={(event) => setUnitPriceText(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">날짜</span>
                        <TriggerButton
                          value={formatDateTriggerLabel(draft.travelDate)}
                          placeholder="날짜 선택"
                          onClick={(event) => setDatePickerTarget({ field: 'travelDate', anchorEl: event.currentTarget })}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">출발시간</span>
                        <TriggerButton
                          value={formatTimeTriggerLabel(draft.departureTime)}
                          placeholder="출발시간 선택"
                          onClick={(event) => setTimePickerTarget({ field: 'departureTime', anchorEl: event.currentTarget })}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">도착시간</span>
                        <TriggerButton
                          value={formatTimeTriggerLabel(draft.arrivalTime)}
                          placeholder="도착시간 선택"
                          onClick={(event) => setTimePickerTarget({ field: 'arrivalTime', anchorEl: event.currentTarget })}
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">출발장소</span>
                        <input
                          type="text"
                          value={draft.departurePlace}
                          onChange={(event) => setDraft((current) => (current ? { ...current, departurePlace: event.target.value } : current))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="출발장소 입력"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">도착장소</span>
                        <input
                          type="text"
                          value={draft.arrivalPlace}
                          onChange={(event) => setDraft((current) => (current ? { ...current, arrivalPlace: event.target.value } : current))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="도착장소 입력"
                        />
                      </label>
                    </div>

                    {draft.presetCode !== 'CUSTOM' ? (
                      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                        선택 팀의 첫 번째 항공 일정 기준으로 자동 계산됩니다. 여러 팀이 같은 외부 이동을 공유하지 않으면 항목을 분리해서 추가하세요.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>
                    취소
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!isFormValid}
                    onClick={() => {
                      if (!draft || !hasValidUnitPrice) {
                        return;
                      }

                      onSubmit({
                        ...draft,
                        unitPriceKrw: Number(unitPriceText),
                      });
                    }}
                  >
                    완료
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <DatePickerModal
        open={Boolean(datePickerTarget && draft)}
        value={draft?.travelDate ?? ''}
        anchorEl={datePickerTarget?.anchorEl ?? null}
        defaultYear={getCurrentLocalYear()}
        title="이동 날짜 선택"
        onClose={() => setDatePickerTarget(null)}
        onChange={(nextIsoDate) => {
          setDraft((current) => (current ? { ...current, travelDate: nextIsoDate } : current));
          setDatePickerTarget(null);
        }}
      />

      <TimePickerModal
        open={Boolean(timePickerTarget && draft)}
        value={timePickerValue}
        anchorEl={timePickerTarget?.anchorEl ?? null}
        title={timePickerTarget?.field === 'arrivalTime' ? '도착시간 선택' : '출발시간 선택'}
        allowedMinutes={timePickerAllowedMinutes}
        onClose={() => setTimePickerTarget(null)}
        onChange={(nextTime) => {
          if (!timePickerTarget) {
            return;
          }

          setDraft((current) => (current ? { ...current, [timePickerTarget.field]: nextTime } : current));
          setTimePickerTarget(null);
        }}
      />
    </>
  );
}
