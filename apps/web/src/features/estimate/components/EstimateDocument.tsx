import '../styles/estimate-print.css';
import type { EstimateDocumentData, EstimatePage1Editor } from '../model/types';
import { EstimatePage1 } from './EstimatePage1';
import { EstimatePage2 } from './EstimatePage2';
import { EstimatePage3 } from './EstimatePage3';
import { EstimatePage4 } from './EstimatePage4';
import { EstimatePage5 } from './EstimatePage5';

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
      <div className="estimate-page-break">
        <EstimatePage4 />
      </div>
      <div className="estimate-page-break">
        <EstimatePage5 />
      </div>
    </article>
  );
}
