import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTIMATE_PAGE2_BRAND, ESTIMATE_PAGE2_FOOTER_NOTICES } from '../model/constants';
import type { EstimateDocumentData, EstimatePage2Editor, EstimatePlanStopRow } from '../model/types';
import type { CSSProperties } from 'react';
import { MovementIntensityColorSelectModal } from './MovementIntensityColorSelectModal';
import {
  averageMovementIntensity,
  getMovementIntensityMeta,
  resolveMovementIntensityChipColor,
  resolveMovementIntensityForEstimateStop,
  type MovementIntensityColorSetting,
  type MovementIntensityValue,
} from '../model/movement-intensity';
import { isExternalTransferPlanStopRow } from '../../plan/plan-stop-row';
import { isLodgingSettingDay } from '../../plan/lodging-night';
import { parseScheduleDateCellDisplay, planStopsUseScheduleDateCellCalendarLayout } from '../utils/schedule-date-cell-text';

interface EstimatePage2Props {
  data: EstimateDocumentData;
  movementIntensityColors?: readonly MovementIntensityColorSetting[] | null;
  editor?: EstimatePage2Editor;
}

interface PlanStopRowContext {
  row: EstimatePlanStopRow;
  mainRowIndex: number | null;
}

function buildPlanStopRowContexts(rows: EstimatePlanStopRow[]): PlanStopRowContext[] {
  let mainRowIndex = 0;
  return rows.map((row) => {
    if (isExternalTransferPlanStopRow(row)) {
      return { row, mainRowIndex: null };
    }
    const currentMainRowIndex = mainRowIndex;
    mainRowIndex += 1;
    return { row, mainRowIndex: currentMainRowIndex };
  });
}

function fallback(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

function formatMealCellForEstimate(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) {
    return '-';
  }

  const formatted = text
    .split('\n')
    .map((line) => line.trim().replace(/^(아침|점심|저녁)\s*/, ''))
    .filter((line) => line.length > 0)
    .join('\n');

  return formatted || '-';
}

function ScheduleDateCell({
  value,
  forceHorizontalSingle = false,
}: {
  value: string;
  forceHorizontalSingle?: boolean;
}) {
  const display = parseScheduleDateCellDisplay(value, { forceHorizontalSingle });

  if (display.mode === 'horizontal-single') {
    return (
      <div className="estimate-itinerary-cell estimate-itinerary-cell--date estimate-itinerary-cell--date-horizontal estimate-itinerary-cell--date-horizontal-single">
        {display.text}
      </div>
    );
  }

  if (display.mode === 'horizontal') {
    return (
      <div className="estimate-itinerary-cell estimate-itinerary-cell--date estimate-itinerary-cell--date-horizontal">
        <div className="estimate-itinerary-cell-date-line">{display.dayLabel}</div>
        <div className="estimate-itinerary-cell-date-line">{display.calendarDate}</div>
      </div>
    );
  }

  return <div className="estimate-itinerary-cell estimate-itinerary-cell--date">{display.text}</div>;
}

function getDisplayLines(value: string | null | undefined): string[] {
  const lines = fallback(value)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.length > 0 ? lines : ['-'];
}

function padDisplayLines(lines: string[], lineCount: number): string[] {
  if (lines.length >= lineCount) {
    return lines;
  }

  return [...lines, ...Array.from({ length: lineCount - lines.length }, () => '')];
}

function formatPage2Title(value: string | null | undefined): string {
  const title = fallback(value);
  const normalized = title.replace(/\s*일정표\s*$/u, '').trim();
  return normalized || title;
}

const DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR = '#94a3b8';
const DEFAULT_PAGE2_HEADER_BG_COLOR = '#6f8ca6';

function getPage2HeaderBgColor(destinationName: string | null | undefined): string {
  const normalized = destinationName?.replace(/\s+/g, '') ?? '';

  const matches = [
    { key: '자브항', color: '#6d8aa3' },
    { key: '고비', color: '#9d7f62' },
    { key: '홉스골', color: '#1c384f' },
    { key: '중부', color: '#5d6e3e' },
  ].filter((item) => normalized.includes(item.key));

  if (matches.length !== 1) {
    return DEFAULT_PAGE2_HEADER_BG_COLOR;
  }

  return matches[0]?.color ?? DEFAULT_PAGE2_HEADER_BG_COLOR;
}

function getPairedLineCellFitStyle(lineCount: number): CSSProperties | undefined {
  if (lineCount <= 6) {
    return undefined;
  }

  if (lineCount >= 11) {
    return {
      '--itinerary-paired-line-font-size': '9.4px',
      '--itinerary-paired-line-height': '1.05',
    } as CSSProperties;
  }

  if (lineCount === 10) {
    return {
      '--itinerary-paired-line-font-size': '10px',
      '--itinerary-paired-line-height': '1.08',
    } as CSSProperties;
  }

  if (lineCount === 9) {
    return {
      '--itinerary-paired-line-font-size': '10.6px',
      '--itinerary-paired-line-height': '1.1',
    } as CSSProperties;
  }

  if (lineCount === 8) {
    return {
      '--itinerary-paired-line-font-size': '11.2px',
      '--itinerary-paired-line-height': '1.12',
    } as CSSProperties;
  }

  return {
    '--itinerary-paired-line-font-size': '11.6px',
    '--itinerary-paired-line-height': '1.14',
  } as CSSProperties;
}

function getItineraryRowLineWeight(row: EstimatePlanStopRow): number {
  return Math.max(getDisplayLines(row.timeCellText).length, getDisplayLines(row.scheduleCellText).length, 1);
}

function chunkItineraryRows(rows: PlanStopRowContext[]): PlanStopRowContext[][] {
  if (rows.length <= 8) {
    return [rows];
  }

  const weights = rows.map((entry) => getItineraryRowLineWeight(entry.row));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const pageCount = Math.max(Math.ceil(rows.length / 6), Math.ceil(totalWeight / 42));
  const targetWeight = Math.ceil(totalWeight / pageCount);
  const chunks: PlanStopRowContext[][] = [];
  let currentChunk: PlanStopRowContext[] = [];
  let currentWeight = 0;
  let currentPageStartIndex = 0;

  rows.forEach((row, index) => {
    const remainingRows = rows.length - index;
    const remainingPagesAfterThis = pageCount - chunks.length - 1;
    const maxRowsForThisPage = Math.max(1, remainingRows - remainingPagesAfterThis);
    const targetRowsForThisPage = Math.ceil((rows.length - currentPageStartIndex) / (pageCount - chunks.length));
    const weight = weights[index] ?? getItineraryRowLineWeight(row.row);
    const shouldStartNextPage =
      currentChunk.length > 0 &&
      chunks.length < pageCount - 1 &&
      (currentChunk.length >= 6 ||
        currentChunk.length >= maxRowsForThisPage ||
        (currentChunk.length >= targetRowsForThisPage && currentWeight + weight > targetWeight));

    if (shouldStartNextPage) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentWeight = 0;
      currentPageStartIndex = index;
    }

    currentChunk.push(row);
    currentWeight += weight;
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

type Page2EditableTextField = 'time' | 'schedule';

type Page2ActiveEditorState =
  | {
      kind: Page2EditableTextField;
      pageIndex: number;
      mainRowIndex: number;
    }
  | {
      kind: 'meal';
      pageIndex: number;
      mainRowIndex: number;
    }
  | null;

function autoResizeInlineTextarea(element: HTMLTextAreaElement): void {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

function toEditableTextValue(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text !== '-' ? text : '';
}

interface EstimatePage2InlineEditorProps {
  value: string;
  displayLines: string[];
  pairedLineStyle?: CSSProperties;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  ariaLabel: string;
}

function EstimatePage2InlineEditor({
  value,
  displayLines,
  pairedLineStyle,
  onFocus,
  onBlur,
  onChange,
  ariaLabel,
}: EstimatePage2InlineEditorProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cellClassName = pairedLineStyle
    ? 'estimate-itinerary-cell estimate-itinerary-cell--paired-lines estimate-page2-editable-cell'
    : 'estimate-itinerary-cell estimate-itinerary-cell--multiline estimate-page2-editable-cell';

  useEffect(() => {
    if (textareaRef.current) {
      autoResizeInlineTextarea(textareaRef.current);
    }
  }, [value]);

  return (
    <div className={cellClassName} style={pairedLineStyle}>
      <textarea
        ref={textareaRef}
        value={value}
        rows={Math.max(displayLines.length, 1)}
        onChange={(event) => {
          onChange(event.target.value);
          autoResizeInlineTextarea(event.currentTarget);
        }}
        onInput={(event) => autoResizeInlineTextarea(event.currentTarget)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="estimate-page2-inline-textarea"
        aria-label={ariaLabel}
      />
    </div>
  );
}

interface EditableItineraryTextCellProps {
  field: Page2EditableTextField;
  pageIndex: number;
  mainRowIndex: number;
  value: string;
  displayLines: string[];
  pairedLineStyle: CSSProperties;
  editor: EstimatePage2Editor;
  activeEditor: Page2ActiveEditorState;
  onActivate: (state: Page2ActiveEditorState) => void;
  onDeactivate: () => void;
}

function EditableItineraryTextCell({
  field,
  pageIndex,
  mainRowIndex,
  value,
  displayLines,
  pairedLineStyle,
  editor,
  activeEditor,
  onActivate,
  onDeactivate,
}: EditableItineraryTextCellProps): JSX.Element {
  const onChange =
    field === 'time' ? editor.onTimeCellTextChange : editor.onScheduleCellTextChange;

  if (onChange == null) {
    return (
      <div className="estimate-itinerary-cell estimate-itinerary-cell--paired-lines" style={pairedLineStyle}>
        {displayLines.map((line, lineIndex) => (
          <span className="estimate-itinerary-line" key={`${field}-line-${lineIndex + 1}`}>
            {line}
          </span>
        ))}
      </div>
    );
  }

  return (
    <EstimatePage2InlineEditor
      value={toEditableTextValue(value)}
      displayLines={displayLines}
      pairedLineStyle={pairedLineStyle}
      onFocus={() => onActivate({ kind: field, pageIndex, mainRowIndex })}
      onBlur={onDeactivate}
      onChange={(nextValue) => onChange(mainRowIndex, nextValue)}
      ariaLabel={field === 'time' ? '시간 편집' : '일정 편집'}
    />
  );
}

interface EditableItineraryMealCellProps {
  pageIndex: number;
  mainRowIndex: number;
  mealCellText: string;
  editor: EstimatePage2Editor;
  activeEditor: Page2ActiveEditorState;
  onActivate: (state: Page2ActiveEditorState) => void;
  onDeactivate: () => void;
}

function EditableItineraryMealCell({
  pageIndex,
  mainRowIndex,
  mealCellText,
  editor,
  activeEditor,
  onActivate,
  onDeactivate,
}: EditableItineraryMealCellProps): JSX.Element {
  const displayValue = formatMealCellForEstimate(mealCellText);
  const displayLines = getDisplayLines(displayValue === '-' ? '' : displayValue);
  const onMealCellTextChange = editor.onMealCellTextChange;

  if (onMealCellTextChange == null && editor.onMealCellFieldChange == null) {
    return <div className="estimate-itinerary-cell">{displayValue}</div>;
  }

  if (onMealCellTextChange != null) {
    return (
      <EstimatePage2InlineEditor
        value={toEditableTextValue(displayValue === '-' ? '' : displayValue)}
        displayLines={displayLines}
        onFocus={() => onActivate({ kind: 'meal', pageIndex, mainRowIndex })}
        onBlur={onDeactivate}
        onChange={(nextValue) => onMealCellTextChange(mainRowIndex, nextValue)}
        ariaLabel="식사 편집"
      />
    );
  }

  return (
    <button
      type="button"
      className="estimate-page2-editable-trigger"
      onClick={() => onActivate({ kind: 'meal', pageIndex, mainRowIndex })}
      aria-label="식사 편집"
    >
      <div className="estimate-itinerary-cell estimate-itinerary-cell--multiline">{displayValue}</div>
    </button>
  );
}

interface EditableItineraryLodgingCellProps {
  lodgingCellText: string;
  mainRowIndex: number;
  totalDays: number;
  editor: EstimatePage2Editor;
}

function EditableItineraryLodgingCell({
  lodgingCellText,
  mainRowIndex,
  totalDays,
  editor,
}: EditableItineraryLodgingCellProps): JSX.Element {
  const displayValue = fallback(lodgingCellText);
  const travelDayIndex = mainRowIndex + 1;
  const isLodgingSettingDisabled = !isLodgingSettingDay(travelDayIndex, totalDays);

  if (editor.onOpenLodgingSelection == null || isLodgingSettingDisabled) {
    return (
      <div className={`estimate-itinerary-cell ${isLodgingSettingDisabled ? 'text-slate-400' : ''}`}>
        {isLodgingSettingDisabled ? fallback(lodgingCellText.trim() || '숙박 없음') : displayValue}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="estimate-page2-editable-trigger estimate-page2-editable-trigger--lodging"
      onClick={() => editor.onOpenLodgingSelection?.(mainRowIndex)}
      aria-label="숙소 선택"
      title="클릭하여 숙소 선택"
    >
      <div className="estimate-itinerary-cell estimate-itinerary-cell--multiline">{displayValue}</div>
    </button>
  );
}

export function EstimatePage2({ data, movementIntensityColors, editor }: EstimatePage2Props): JSX.Element {
  const [activeEditor, setActiveEditor] = useState<Page2ActiveEditorState>(null);
  const [colorModalState, setColorModalState] = useState<
    | {
        kind: 'overall';
        pageIndex: number;
        currentOverride: string | null;
      }
    | {
        kind: 'row';
        pageIndex: number;
        mainRowIndex: number;
        rowLabel: string;
        currentOverride: string | null;
      }
    | null
  >(null);
  const paletteColors = useMemo(
    () => movementIntensityColors ?? [],
    [movementIntensityColors],
  );
  const planStopRowContexts = useMemo(
    () => buildPlanStopRowContexts(data.planStops),
    [data.planStops],
  );
  const totalDays = useMemo(
    () => planStopRowContexts.filter((entry) => entry.mainRowIndex != null).length,
    [planStopRowContexts],
  );
  const mainItineraryRows = planStopRowContexts
    .filter((entry) => entry.mainRowIndex != null)
    .map((entry) => entry.row);
  const resolvedMovementByMainRow = mainItineraryRows.map((row) =>
    resolveMovementIntensityForEstimateStop(
      {
        rowType: row.rowType,
        movementIntensity: row.movementIntensity,
        destinationCellText: row.destinationCellText,
      },
      null,
    ),
  );
  const overallMovementIntensity: MovementIntensityValue | null =
    averageMovementIntensity(resolvedMovementByMainRow) ?? data.movementIntensity ?? null;

  const overallIntensity = getMovementIntensityMeta(overallMovementIntensity, movementIntensityColors);
  const overallIntensityColor = resolveMovementIntensityChipColor({
    movementIntensity: overallMovementIntensity,
    movementIntensityColorOverride: data.overallMovementIntensityColorOverride,
    colors: movementIntensityColors,
    fallbackColor: DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR,
  });
  const isOverallChipEditable = editor != null;
  const itineraryPageChunks = chunkItineraryRows(planStopRowContexts);
  const usesCalendarDateCellLayout = useMemo(
    () => planStopsUseScheduleDateCellCalendarLayout(data.planStops),
    [data.planStops],
  );

  return (
    <div className="estimate-page2-pages">
      {itineraryPageChunks.map((chunk, pageIndex) => {
        const rowCount = Math.max(chunk.length, 1);
        const isDenseItinerary = rowCount >= 8;
        const isExtraDenseItinerary = rowCount >= 9;
        const pageStyle = {
          '--itinerary-row-count': String(rowCount),
          '--itinerary-body-grid-rows': `repeat(${rowCount}, minmax(0, 1fr))`,
          '--estimate-page2-header-bg': getPage2HeaderBgColor(data.destinationName),
          '--itinerary-row-font-size': '12px',
          '--itinerary-row-line-height': isExtraDenseItinerary ? '1.1' : isDenseItinerary ? '1.18' : '1.25',
          '--itinerary-cell-padding': isExtraDenseItinerary ? '2px 4px' : isDenseItinerary ? '3px 4px' : '4px',
          '--itinerary-cell-gap': isExtraDenseItinerary ? '2px' : isDenseItinerary ? '3px' : '4px',
          '--itinerary-table-head-height': isExtraDenseItinerary ? '22px' : '24px',
          '--itinerary-footer-margin-top': isExtraDenseItinerary ? '8px' : '10px',
          '--itinerary-footer-font-size': isExtraDenseItinerary ? '11px' : '11.5px',
          '--itinerary-footer-line-height': isExtraDenseItinerary ? '1.26' : '1.3',
          '--itinerary-footer-li-margin': isExtraDenseItinerary ? '2px' : '3px',
        } as CSSProperties;
        const pageTitle =
          itineraryPageChunks.length > 1
            ? `${formatPage2Title(data.page2Title)} (${pageIndex + 1}/${itineraryPageChunks.length})`
            : formatPage2Title(data.page2Title);

        return (
          <section
            className={`estimate-sheet estimate-sheet-page2 estimate-sheet-itinerary${pageIndex > 0 ? ' estimate-page-break' : ''}${editor ? ' estimate-sheet-page2--editable' : ''}`}
            style={pageStyle}
            key={`estimate-page2-itinerary-${pageIndex + 1}`}
          >
            {colorModalState?.pageIndex === pageIndex ? (
              <MovementIntensityColorSelectModal
                open
                rowLabel={
                  colorModalState.kind === 'overall'
                    ? '전체 이동강도'
                    : colorModalState.rowLabel
                }
                colors={paletteColors}
                currentOverride={colorModalState.currentOverride}
                onClose={() => setColorModalState(null)}
                onSelect={(color) => {
                  if (editor == null) {
                    return;
                  }
                  if (colorModalState.kind === 'overall') {
                    editor.onOverallMovementIntensityColorOverrideChange(color);
                    return;
                  }
                  editor.onMovementIntensityColorOverrideChange(colorModalState.mainRowIndex, color);
                }}
              />
            ) : null}
            <div className="estimate-itinerary-header">
              <img
                className="estimate-itinerary-header-logo"
                src="/estimate/page2-header-logo.png"
                alt={ESTIMATE_PAGE2_BRAND}
                draggable={false}
              />
              <div className="estimate-itinerary-header-row">
                <h1 className="estimate-itinerary-title">{pageTitle}</h1>
                <p className="estimate-itinerary-intensity">
                  이동강도:{' '}
                  {isOverallChipEditable ? (
                    <button
                      type="button"
                      className="estimate-movement-intensity-chip estimate-movement-intensity-chip--inline estimate-movement-intensity-chip--editable"
                      aria-label={`${overallIntensity?.label ?? '이동강도 미지정'} 색상 변경`}
                      title="클릭하여 전체 이동강도 색상 선택"
                      style={{
                        backgroundColor: overallIntensityColor,
                      }}
                      onClick={() => {
                        setColorModalState({
                          kind: 'overall',
                          pageIndex,
                          currentOverride: data.overallMovementIntensityColorOverride ?? null,
                        });
                      }}
                    />
                  ) : (
                    <span
                      className="estimate-movement-intensity-chip estimate-movement-intensity-chip--inline"
                      aria-label={overallIntensity?.label ?? '이동강도 미지정'}
                      title={overallIntensity?.label ?? '이동강도 미지정'}
                      style={{
                        backgroundColor: overallIntensityColor,
                      }}
                    />
                  )}
                </p>
              </div>
            </div>

            <div className="estimate-itinerary-table-wrap">
              <div
                className={`estimate-itinerary-table${
                  usesCalendarDateCellLayout ? ' estimate-itinerary-table--calendar-date-cells' : ''
                }`}
                role="table"
                aria-label="여행 일정표"
              >
                <div className="estimate-itinerary-table-header-cell estimate-itinerary-table-date-col" role="columnheader">
                  날짜
                </div>
                <div className="estimate-itinerary-table-header-cell" role="columnheader">
                  목적지
                </div>
                <div className="estimate-itinerary-table-header-cell" role="columnheader">
                  시간
                </div>
                <div className="estimate-itinerary-table-header-cell" role="columnheader">
                  일정
                </div>
                <div className="estimate-itinerary-table-header-cell" role="columnheader">
                  숙소
                </div>
                <div className="estimate-itinerary-table-header-cell" role="columnheader">
                  식사
                </div>
                {chunk.map(({ row, mainRowIndex }, index) => {
                  const rowMovementIntensity = isExternalTransferPlanStopRow(row)
                    ? null
                    : resolveMovementIntensityForEstimateStop(
                        {
                          rowType: row.rowType,
                          movementIntensity: row.movementIntensity,
                          destinationCellText: row.destinationCellText,
                        },
                        null,
                      );
                  const intensity = getMovementIntensityMeta(rowMovementIntensity, movementIntensityColors);
                  const intensityColor = resolveMovementIntensityChipColor({
                    movementIntensity: rowMovementIntensity,
                    movementIntensityColorOverride: row.movementIntensityColorOverride,
                    destinationMovementIntensityColorOverride: row.destinationMovementIntensityColorOverride,
                    colors: movementIntensityColors,
                    fallbackColor: DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR,
                  });
                  const isChipEditable = editor != null && mainRowIndex != null;
                  const timeLines = getDisplayLines(row.timeCellText);
                  const scheduleLines = getDisplayLines(row.scheduleCellText);
                  const pairedLineCount = Math.max(timeLines.length, scheduleLines.length);
                  const pairedLineStyle = {
                    '--itinerary-paired-line-count': String(pairedLineCount),
                    ...getPairedLineCellFitStyle(pairedLineCount),
                  } as CSSProperties;
                  const paddedTimeLines = padDisplayLines(timeLines, pairedLineCount);
                  const paddedScheduleLines = padDisplayLines(scheduleLines, pairedLineCount);

                  return (
                    <div className="estimate-itinerary-table-row" role="row" key={`itinerary-row-${pageIndex + 1}-${index + 1}`}>
                      <div className="estimate-itinerary-table-cell estimate-itinerary-table-date-col" role="cell">
                        <ScheduleDateCell
                          value={fallback(row.dateCellText)}
                          forceHorizontalSingle={isExternalTransferPlanStopRow(row)}
                        />
                      </div>
                      <div className="estimate-itinerary-table-cell" role="cell">
                        <div className="estimate-itinerary-cell">
                          {!isExternalTransferPlanStopRow(row) ? (
                            isChipEditable ? (
                              <button
                                type="button"
                                className="estimate-movement-intensity-chip estimate-movement-intensity-chip--editable"
                                aria-label={`${intensity?.label ?? '이동강도 미지정'} 색상 변경`}
                                title="클릭하여 이동강도 색상 선택"
                                style={{
                                  backgroundColor: intensityColor,
                                }}
                                onClick={() => {
                                  if (mainRowIndex == null) {
                                    return;
                                  }
                                  setColorModalState({
                                    kind: 'row',
                                    pageIndex,
                                    mainRowIndex,
                                    rowLabel: fallback(row.destinationCellText),
                                    currentOverride: row.movementIntensityColorOverride ?? null,
                                  });
                                }}
                              />
                            ) : (
                              <span
                                className="estimate-movement-intensity-chip"
                                aria-label={intensity?.label ?? '이동강도 미지정'}
                                title={intensity?.label ?? '이동강도 미지정'}
                                style={{
                                  backgroundColor: intensityColor,
                                }}
                              />
                            )
                          ) : null}
                          <span className="estimate-itinerary-cell-text">{fallback(row.destinationCellText)}</span>
                        </div>
                      </div>
                      <div className="estimate-itinerary-table-cell" role="cell">
                        {mainRowIndex != null && editor != null ? (
                          <EditableItineraryTextCell
                            field="time"
                            pageIndex={pageIndex}
                            mainRowIndex={mainRowIndex}
                            value={row.timeCellText ?? ''}
                            displayLines={paddedTimeLines}
                            pairedLineStyle={pairedLineStyle}
                            editor={editor}
                            activeEditor={activeEditor}
                            onActivate={setActiveEditor}
                            onDeactivate={() => setActiveEditor(null)}
                          />
                        ) : (
                          <div className="estimate-itinerary-cell estimate-itinerary-cell--paired-lines" style={pairedLineStyle}>
                            {paddedTimeLines.map((line, lineIndex) => (
                              <span className="estimate-itinerary-line" key={`time-line-${lineIndex + 1}`}>
                                {line}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="estimate-itinerary-table-cell" role="cell">
                        {mainRowIndex != null && editor != null ? (
                          <EditableItineraryTextCell
                            field="schedule"
                            pageIndex={pageIndex}
                            mainRowIndex={mainRowIndex}
                            value={row.scheduleCellText ?? ''}
                            displayLines={paddedScheduleLines}
                            pairedLineStyle={pairedLineStyle}
                            editor={editor}
                            activeEditor={activeEditor}
                            onActivate={setActiveEditor}
                            onDeactivate={() => setActiveEditor(null)}
                          />
                        ) : (
                          <div className="estimate-itinerary-cell estimate-itinerary-cell--paired-lines" style={pairedLineStyle}>
                            {paddedScheduleLines.map((line, lineIndex) => (
                              <span className="estimate-itinerary-line" key={`schedule-line-${lineIndex + 1}`}>
                                {line}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="estimate-itinerary-table-cell" role="cell">
                        {mainRowIndex != null && editor != null ? (
                          <EditableItineraryLodgingCell
                            lodgingCellText={row.lodgingCellText}
                            mainRowIndex={mainRowIndex}
                            totalDays={totalDays}
                            editor={editor}
                          />
                        ) : (
                          <div className="estimate-itinerary-cell">{fallback(row.lodgingCellText)}</div>
                        )}
                      </div>
                      <div className="estimate-itinerary-table-cell" role="cell">
                        {mainRowIndex != null && editor != null ? (
                          <EditableItineraryMealCell
                            pageIndex={pageIndex}
                            mainRowIndex={mainRowIndex}
                            mealCellText={row.mealCellText}
                            editor={editor}
                            activeEditor={activeEditor}
                            onActivate={setActiveEditor}
                            onDeactivate={() => setActiveEditor(null)}
                          />
                        ) : (
                          <div className="estimate-itinerary-cell">{formatMealCellForEstimate(row.mealCellText)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ul className="estimate-itinerary-footer">
              {ESTIMATE_PAGE2_FOOTER_NOTICES.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
