import '../styles/estimate-print.css';
import { ESTIMATE_IMAGE_PAGE_SRCS } from '../model/constants';
import type { EstimateDocumentData, EstimatePage1Editor } from '../model/types';
import { EstimatePage1 } from './EstimatePage1';
import { EstimateImagePage } from './EstimateImagePage';
import { EstimatePage2 } from './EstimatePage2';
import { EstimatePage3 } from './EstimatePage3';

interface EstimateDocumentProps {
  data: EstimateDocumentData;
  viewMode?: 'screen-preview' | 'print';
  page1Editor?: EstimatePage1Editor;
}

export function EstimateDocument({ data, viewMode = 'print', page1Editor }: EstimateDocumentProps): JSX.Element {
  return (
    <article className={`estimate-document ${viewMode === 'screen-preview' ? 'estimate-document--preview' : ''}`}>
      <EstimatePage1 data={data} editor={viewMode === 'screen-preview' ? page1Editor : undefined} />
      <div className="estimate-page-break">
        <EstimatePage2 data={data} />
      </div>
      <div className="estimate-page-break">
        <EstimatePage3 data={data} />
      </div>
      {ESTIMATE_IMAGE_PAGE_SRCS.map((imageSrc, index) => (
        <div key={imageSrc} className="estimate-page-break">
          <EstimateImagePage imageSrc={imageSrc} ariaLabel={`견적서 이미지 페이지 ${index + 4}`} />
        </div>
      ))}
    </article>
  );
}
