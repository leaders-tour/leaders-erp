import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import type { PlanStopRowType } from '../plan-stop-row';
import {
  parseMealCellText,
  toMealCellText,
  type MealSlot,
} from '../special-meals';
import type { ConfirmationAppendixPlanStopRow } from '../../confirmation/model/types';

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  element.style.height = 'auto';
  element.style.height = `${Math.max(element.scrollHeight, 72)}px`;
}

function resolveTextareaRows(value: string): number {
  const lineCount = value.split('\n').length;
  return Math.max(3, lineCount);
}

function AutoResizeTextarea({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  className: string;
}): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      autoResizeTextarea(ref.current);
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      rows={resolveTextareaRows(value)}
      onChange={(event) => onChange?.(event.target.value)}
      onInput={(event) => autoResizeTextarea(event.currentTarget)}
      className={className}
    />
  );
}

export interface ConfirmationScheduleEditorRowMeta {
  rowType: PlanStopRowType;
}

interface ConfirmationScheduleEditorProps {
  rows: ConfirmationAppendixPlanStopRow[];
  rowMeta?: ConfirmationScheduleEditorRowMeta[];
  onChange: (rows: ConfirmationAppendixPlanStopRow[]) => void;
  onRestore?: () => void;
  restoreDisabled?: boolean;
  embedded?: boolean;
}

function RestoreScheduleConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">일정표 원상복구</h3>
        <p className="mt-2 text-sm text-slate-600">
          확정서 일정표를 연결 견적의 기존 일정으로 되돌립니다. 지금까지 수정한 일정표 내용은
          모두 사라집니다.
        </p>
        <p className="mt-1 text-xs text-slate-500">이 작업은 되돌릴 수 없습니다.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            기존 일정으로 초기화
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ConfirmationScheduleEditor({
  rows,
  rowMeta,
  onChange,
  onRestore,
  restoreDisabled = false,
  embedded = false,
}: ConfirmationScheduleEditorProps): JSX.Element {
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  const updateCell = (
    rowIndex: number,
    field: keyof ConfirmationAppendixPlanStopRow,
    value: string,
  ): void => {
    onChange(
      rows.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
    );
  };

  const updateMealCellField = (rowIndex: number, field: MealSlot, value: string): void => {
    const mealFields = parseMealCellText(rows[rowIndex]?.mealCellText);
    const nextMealFields = { ...mealFields, [field]: value };
    updateCell(rowIndex, 'mealCellText', toMealCellText(nextMealFields));
  };

  const table = (
    <div className="confirmation-schedule-editor-table-wrap overflow-auto">
      <Table className="confirmation-schedule-editor-table min-w-[1280px] w-full text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <Th className="w-[110px]">날짜</Th>
            <Th className="w-[240px]">목적지</Th>
            <Th className="w-[180px]">시간</Th>
            <Th className="w-[280px]">일정</Th>
            <Th className="w-[220px]">숙소</Th>
            <Th className="w-[220px]">식사</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const isExternalRow = rowMeta?.[rowIndex]?.rowType === 'EXTERNAL_TRANSFER';
            const mealFields = parseMealCellText(row.mealCellText);
            const cellClassName = `confirmation-schedule-editor-cell w-full resize-none overflow-hidden rounded-xl border border-slate-200 px-3 py-2 text-sm leading-5 whitespace-pre-wrap ${
              isExternalRow ? 'bg-slate-50 text-slate-500' : 'bg-white'
            }`;
            const mealCellWrapperClassName =
              'grid gap-2 rounded-xl border border-slate-200 bg-white p-2';
            const mealLabelClassName = 'text-xs text-slate-500';
            const mealInputClassName =
              'min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-slate-400';
            const mealXButtonClassName =
              'rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50';

            return (
              <tr
                key={`confirmation-schedule-row-${rowIndex + 1}`}
                className={`border-t border-slate-200 align-top ${isExternalRow ? 'bg-slate-50/60' : ''}`}
              >
                <Td>
                  <AutoResizeTextarea
                    value={row.dateCellText}
                    readOnly={isExternalRow}
                    disabled={isExternalRow}
                    onChange={(value) => updateCell(rowIndex, 'dateCellText', value)}
                    className={cellClassName}
                  />
                </Td>
                <Td>
                  <AutoResizeTextarea
                    value={row.destinationCellText}
                    readOnly={isExternalRow}
                    disabled={isExternalRow}
                    onChange={(value) => updateCell(rowIndex, 'destinationCellText', value)}
                    className={cellClassName}
                  />
                </Td>
                <Td>
                  <AutoResizeTextarea
                    value={row.timeCellText}
                    readOnly={isExternalRow}
                    disabled={isExternalRow}
                    onChange={(value) => updateCell(rowIndex, 'timeCellText', value)}
                    className={cellClassName}
                  />
                </Td>
                <Td>
                  <AutoResizeTextarea
                    value={row.scheduleCellText}
                    readOnly={isExternalRow}
                    disabled={isExternalRow}
                    onChange={(value) => updateCell(rowIndex, 'scheduleCellText', value)}
                    className={cellClassName}
                  />
                </Td>
                <Td>
                  {isExternalRow ? (
                    <div className="confirmation-schedule-editor-readonly min-h-[72px] rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm leading-5 whitespace-pre-wrap text-slate-500">
                      {row.lodgingCellText || '-'}
                    </div>
                  ) : (
                    <AutoResizeTextarea
                      value={row.lodgingCellText}
                      onChange={(value) => updateCell(rowIndex, 'lodgingCellText', value)}
                      className={cellClassName}
                    />
                  )}
                </Td>
                <Td>
                  {isExternalRow ? (
                    <div className="confirmation-schedule-editor-readonly min-h-[72px] rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm leading-5 whitespace-pre-wrap text-slate-500">
                      {row.mealCellText || '-'}
                    </div>
                  ) : (
                    <div className={mealCellWrapperClassName}>
                      {(
                        [
                          ['breakfast', '아침', mealFields.breakfast],
                          ['lunch', '점심', mealFields.lunch],
                          ['dinner', '저녁', mealFields.dinner],
                        ] as const
                      ).map(([field, label, mealValue]) => (
                        <div
                          key={field}
                          className="grid grid-cols-[40px_minmax(0,1fr)_32px] items-center gap-2 text-sm"
                        >
                          <span className={mealLabelClassName}>{label}</span>
                          <input
                            type="text"
                            value={mealValue}
                            onChange={(event) =>
                              updateMealCellField(rowIndex, field, event.target.value)
                            }
                            className={mealInputClassName}
                            placeholder={`${label} 식사 입력`}
                          />
                          <button
                            type="button"
                            onClick={() => updateMealCellField(rowIndex, field, 'X')}
                            className={mealXButtonClassName}
                            aria-label={`${label} 식사를 없음으로 표시`}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );

  if (embedded) {
    return table;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">일정표 편집기</h2>
            <p className="mt-1 text-xs text-slate-600">
              숙소·식사 칸을 포함해 확정서에 표시될 일정표 문구를 수정할 수 있습니다. 식사 칸은
              아침/점심/저녁 3칸 입력으로 편집됩니다.
            </p>
          </div>
          {onRestore ? (
            <Button
              type="button"
              variant="outline"
              disabled={restoreDisabled}
              onClick={() => setRestoreModalOpen(true)}
            >
              기존 일정으로 초기화
            </Button>
          ) : null}
        </div>
      </div>
      {table}
      <RestoreScheduleConfirmModal
        open={restoreModalOpen}
        onCancel={() => setRestoreModalOpen(false)}
        onConfirm={() => {
          onRestore?.();
          setRestoreModalOpen(false);
        }}
      />
    </section>
  );
}
