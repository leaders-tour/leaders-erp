import { ESTIMATE_PAGE2_BRAND, ESTIMATE_PAGE2_FOOTER_NOTICES } from '../model/constants';
import type { EstimateDocumentData } from '../model/types';
import type { CSSProperties } from 'react';
import { getMovementIntensityMeta } from '../model/movement-intensity';

interface EstimatePage2Props {
  data: EstimateDocumentData;
}

function fallback(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

export function EstimatePage2({ data }: EstimatePage2Props): JSX.Element {
  const rowCount = Math.max(data.planStops.length, 1);
  const tableStyle = {
    '--itinerary-row-count': String(rowCount),
  } as CSSProperties;
  const overallIntensity = getMovementIntensityMeta(data.movementIntensity);

  return (
    <section className="estimate-sheet estimate-sheet-page2 estimate-sheet-itinerary">
      <h1 className="estimate-itinerary-title">{fallback(data.page2Title)}</h1>
      <p className="estimate-itinerary-brand">{ESTIMATE_PAGE2_BRAND}</p>
      <p className="estimate-itinerary-intensity">
        이동강도:{' '}
        {overallIntensity ? (
          <span
            className="estimate-movement-intensity-badge estimate-movement-intensity-badge--inline"
            style={{
              backgroundColor: overallIntensity.backgroundColor,
              borderColor: overallIntensity.borderColor,
              color: overallIntensity.textColor,
            }}
          >
            {overallIntensity.label}
          </span>
        ) : (
          '-'
        )}
      </p>

      <div className="estimate-itinerary-table-wrap">
        <table className="estimate-table estimate-itinerary-table" style={tableStyle}>
          <thead>
            <tr>
              <th>날짜</th>
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
                const intensity = getMovementIntensityMeta(row.movementIntensity);

                return (
                  <tr key={`itinerary-row-${index + 1}`}>
                    <td>
                      <div className="estimate-itinerary-cell">{fallback(row.dateCellText)}</div>
                    </td>
                    <td>
                      <div className="estimate-itinerary-cell">
                        {intensity ? (
                          <span
                            className="estimate-movement-intensity-badge"
                            style={{
                              backgroundColor: intensity.backgroundColor,
                              borderColor: intensity.borderColor,
                              color: intensity.textColor,
                            }}
                          >
                            {intensity.label}
                          </span>
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
                      <div className="estimate-itinerary-cell">{fallback(row.mealCellText)}</div>
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
