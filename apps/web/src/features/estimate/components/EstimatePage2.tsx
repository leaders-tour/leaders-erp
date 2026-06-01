import { ESTIMATE_PAGE2_BRAND, ESTIMATE_PAGE2_FOOTER_NOTICES } from '../model/constants';
import type { EstimateDocumentData, EstimatePlanStopRow } from '../model/types';
import type { CSSProperties } from 'react';
import {
  averageMovementIntensity,
  getMovementIntensityColor,
  getMovementIntensityMeta,
  resolveMovementIntensityForEstimateStop,
  type MovementIntensityColorSetting,
  type MovementIntensityValue,
} from '../model/movement-intensity';
import { isExternalTransferPlanStopRow } from '../../plan/plan-stop-row';

interface EstimatePage2Props {
  data: EstimateDocumentData;
  movementIntensityColors?: readonly MovementIntensityColorSetting[] | null;
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

function formatVerticalDateText(value: string): string {
  return Array.from(value.replace(/\s+/g, '')).join('\n');
}

function countDisplayLines(value: string): number {
  return value.split('\n').filter((line) => line.trim().length > 0).length || 1;
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

function getScheduleCellFitStyle(lineCount: number): CSSProperties | undefined {
  if (lineCount <= 6) {
    return undefined;
  }

  if (lineCount >= 11) {
    return {
      '--itinerary-schedule-font-size': '8px',
      '--itinerary-schedule-line-height': '0.98',
    } as CSSProperties;
  }

  if (lineCount === 10) {
    return {
      '--itinerary-schedule-font-size': '8.8px',
      '--itinerary-schedule-line-height': '1',
    } as CSSProperties;
  }

  if (lineCount === 9) {
    return {
      '--itinerary-schedule-font-size': '9.6px',
      '--itinerary-schedule-line-height': '1.02',
    } as CSSProperties;
  }

  if (lineCount === 8) {
    return {
      '--itinerary-schedule-font-size': '10.4px',
      '--itinerary-schedule-line-height': '1.03',
    } as CSSProperties;
  }

  return {
    '--itinerary-schedule-font-size': '11px',
    '--itinerary-schedule-line-height': '1.05',
  } as CSSProperties;
}

function chunkItineraryRows(rows: EstimatePlanStopRow[]): EstimatePlanStopRow[][] {
  if (rows.length <= 9) {
    return [rows];
  }

  const pageCount = Math.ceil(rows.length / 6);
  const basePageSize = Math.ceil(rows.length / pageCount);
  const chunks: EstimatePlanStopRow[][] = [];

  for (let index = 0; index < rows.length; index += basePageSize) {
    chunks.push(rows.slice(index, index + basePageSize));
  }

  return chunks;
}

export function EstimatePage2({ data, movementIntensityColors }: EstimatePage2Props): JSX.Element {
  const mainItineraryRows = data.planStops.filter((row) => !isExternalTransferPlanStopRow(row));
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
  const overallIntensityColor =
    getMovementIntensityColor(overallMovementIntensity, movementIntensityColors) ?? DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR;
  const itineraryPageChunks = chunkItineraryRows(data.planStops);

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
            className={`estimate-sheet estimate-sheet-page2 estimate-sheet-itinerary${pageIndex > 0 ? ' estimate-page-break' : ''}`}
            style={pageStyle}
            key={`estimate-page2-itinerary-${pageIndex + 1}`}
          >
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
                  <span
                    className="estimate-movement-intensity-chip estimate-movement-intensity-chip--inline"
                    aria-label={overallIntensity?.label ?? '이동강도 미지정'}
                    title={overallIntensity?.label ?? '이동강도 미지정'}
                    style={{
                      backgroundColor: overallIntensityColor,
                    }}
                  />
                </p>
              </div>
            </div>

            <div className="estimate-itinerary-table-wrap">
              <div className="estimate-itinerary-table" role="table" aria-label="여행 일정표">
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
                {chunk.map((row, index) => {
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
            const intensityColor =
              getMovementIntensityColor(rowMovementIntensity, movementIntensityColors) ?? DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR;
            const scheduleCellText = fallback(row.scheduleCellText);
            const scheduleFitStyle = getScheduleCellFitStyle(countDisplayLines(scheduleCellText));

            return (
              <div className="estimate-itinerary-table-row" role="row" key={`itinerary-row-${pageIndex + 1}-${index + 1}`}>
                <div className="estimate-itinerary-table-cell estimate-itinerary-table-date-col" role="cell">
                  <div className="estimate-itinerary-cell estimate-itinerary-cell--date">
                    {formatVerticalDateText(fallback(row.dateCellText))}
                  </div>
                </div>
                <div className="estimate-itinerary-table-cell" role="cell">
                  <div className="estimate-itinerary-cell">
                    {!isExternalTransferPlanStopRow(row) ? (
                      <span
                        className="estimate-movement-intensity-chip"
                        aria-label={intensity?.label ?? '이동강도 미지정'}
                        title={intensity?.label ?? '이동강도 미지정'}
                        style={{
                          backgroundColor: intensityColor,
                        }}
                      />
                    ) : null}
                    <span className="estimate-itinerary-cell-text">{fallback(row.destinationCellText)}</span>
                  </div>
                </div>
                <div className="estimate-itinerary-table-cell" role="cell">
                  <div className="estimate-itinerary-cell">{fallback(row.timeCellText)}</div>
                </div>
                <div className="estimate-itinerary-table-cell" role="cell">
                  <div className="estimate-itinerary-cell estimate-itinerary-cell--schedule" style={scheduleFitStyle}>
                    {scheduleCellText}
                  </div>
                </div>
                <div className="estimate-itinerary-table-cell" role="cell">
                  <div className="estimate-itinerary-cell">{fallback(row.lodgingCellText)}</div>
                </div>
                <div className="estimate-itinerary-table-cell" role="cell">
                  <div className="estimate-itinerary-cell">{formatMealCellForEstimate(row.mealCellText)}</div>
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
