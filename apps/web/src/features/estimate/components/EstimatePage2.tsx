import {
  ESTIMATE_PAGE2_BRAND,
  ESTIMATE_PAGE2_FOOTER_NOTICES,
  ESTIMATE_PAGE2_INTENSITY_TEXT,
} from '../model/constants';
import type { EstimateDocumentData } from '../model/types';

interface EstimatePage2Props {
  data: EstimateDocumentData;
}

function fallback(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

export function EstimatePage2({ data }: EstimatePage2Props): JSX.Element {
  return (
    <section className="estimate-sheet estimate-sheet-itinerary">
      <h1 className="estimate-itinerary-title">{fallback(data.page2Title)}</h1>
      <p className="estimate-itinerary-brand">{ESTIMATE_PAGE2_BRAND}</p>
      <p className="estimate-itinerary-intensity">{ESTIMATE_PAGE2_INTENSITY_TEXT}</p>

      <table className="estimate-table estimate-itinerary-table">
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
            <tr key={`itinerary-row-${index + 1}`}>
              <td className="pre-line">{fallback(row.dateCellText)}</td>
              <td className="pre-line">{fallback(row.destinationCellText)}</td>
              <td className="pre-line">{fallback(row.timeCellText)}</td>
              <td className="pre-line">{fallback(row.scheduleCellText)}</td>
              <td className="pre-line">{fallback(row.lodgingCellText)}</td>
              <td className="pre-line">{fallback(row.mealCellText)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="estimate-itinerary-footer">
        {ESTIMATE_PAGE2_FOOTER_NOTICES.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
    </section>
  );
}
