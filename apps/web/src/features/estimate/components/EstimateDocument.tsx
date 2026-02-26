import type { EstimateDocumentData } from '../model/types';
import { EstimatePage1 } from './EstimatePage1';
import { EstimatePage2 } from './EstimatePage2';

interface EstimateDocumentProps {
  data: EstimateDocumentData;
}

export function EstimateDocument({ data }: EstimateDocumentProps): JSX.Element {
  return (
    <article className="estimate-document">
      <EstimatePage1 data={data} />
      <div className="estimate-page-break">
        <EstimatePage2 data={data} />
      </div>
    </article>
  );
}
