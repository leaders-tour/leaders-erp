import { ESTIMATE_PAGE2_BRAND, ESTIMATE_PAGE2_FOOTER_NOTICES } from '../model/constants';
import type { EstimateDocumentData } from '../model/types';
import type { CSSProperties } from 'react';
import { getMovementIntensityMeta, type MovementIntensityValue } from '../model/movement-intensity';
import { isExternalTransferPlanStopRow } from '../../plan/plan-stop-row';

interface EstimatePage2Props {
  data: EstimateDocumentData;
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

function formatPage2Title(value: string | null | undefined): string {
  const title = fallback(value);
  const normalized = title.replace(/\s*일정표\s*$/u, '').trim();
  return normalized || title;
}

function getMovementIntensityChipColor(value: MovementIntensityValue | null | undefined): string | null {
  switch (value) {
    case 'LEVEL_1':
      return '#8bb058';
    case 'LEVEL_2':
      return '#ffcd4a';
    case 'LEVEL_3':
      return '#fd9f28';
    case 'LEVEL_4':
      return '#fc5230';
    case 'LEVEL_5':
      return '#111111';
    default:
      return null;
  }
}

const DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR = '#111111';

export function EstimatePage2({ data }: EstimatePage2Props): JSX.Element {
  const rowCount = Math.max(data.planStops.length, 1);
  const tableStyle = {
    '--itinerary-row-count': String(rowCount),
  } as CSSProperties;
  const overallIntensity = getMovementIntensityMeta(data.movementIntensity);
  const overallIntensityColor =
    getMovementIntensityChipColor(data.movementIntensity) ?? DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR;

  return (
    <section className="estimate-sheet estimate-sheet-page2 estimate-sheet-itinerary">
      <div className="estimate-itinerary-header">
        <img
          className="estimate-itinerary-header-logo"
          src="/estimate/page2-header-logo.png"
          alt={ESTIMATE_PAGE2_BRAND}
          draggable={false}
        />
        <div className="estimate-itinerary-header-row">
          <h1 className="estimate-itinerary-title">{formatPage2Title(data.page2Title)}</h1>
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
        <table className="estimate-table estimate-itinerary-table" style={tableStyle}>
          <thead>
            <tr>
              <th className="estimate-itinerary-table-date-col">날짜</th>
              <th>목적지</th>
              <th>시간</th>
              <th>일정</th>
              <th>숙소</th>
              <th>식사</th>
            </tr>
          </thead>
          <tbody>
            {data.planStops.map((row, index) => (
              (() => {
                const rowMovementIntensity = isExternalTransferPlanStopRow(row)
                  ? null
                  : (row.movementIntensity ?? data.movementIntensity ?? null);
                const intensity = getMovementIntensityMeta(rowMovementIntensity);
                const intensityColor = getMovementIntensityChipColor(rowMovementIntensity) ?? DEFAULT_MOVEMENT_INTENSITY_CHIP_COLOR;

                return (
                  <tr key={`itinerary-row-${index + 1}`}>
                    <td>
                      <div className="estimate-itinerary-cell estimate-itinerary-cell--date">
                        {formatVerticalDateText(fallback(row.dateCellText))}
                      </div>
                    </td>
                    <td>
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
                    </td>
                    <td>
                      <div className="estimate-itinerary-cell">{fallback(row.timeCellText)}</div>
                    </td>
                    <td>
                      <div className="estimate-itinerary-cell">{fallback(row.scheduleCellText)}</div>
                    </td>
                    <td>
                      <div className="estimate-itinerary-cell">{fallback(row.lodgingCellText)}</div>
                    </td>
                    <td>
                      <div className="estimate-itinerary-cell">{formatMealCellForEstimate(row.mealCellText)}</div>
                    </td>
                  </tr>
                );
              })()
            ))}
          </tbody>
        </table>
      </div>

      <ul className="estimate-itinerary-footer">
        {ESTIMATE_PAGE2_FOOTER_NOTICES.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
    </section>
  );
}
