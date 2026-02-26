import type { EstimateDocumentData } from '../model/types';
import { EstimatePage1 } from './EstimatePage1';

interface EstimateDocumentProps {
  data: EstimateDocumentData;
}

export function EstimateDocument({ data }: EstimateDocumentProps): JSX.Element {
  return (
    <article className="estimate-document">
      <EstimatePage1 data={data} />
    </article>
  );
}
