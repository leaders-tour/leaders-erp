import { useMemo } from 'react';
import '../styles/estimate-print.css';
import { ESTIMATE_IMAGE_PAGE_SRCS } from '../model/constants';
import type { EstimateDocumentData, EstimatePage1Editor } from '../model/types';
import {
  chunkEstimateGuidePages,
  chunkGuidePagesBySplits,
  normalizeEstimateGuideImagesPerPage,
} from '../utils/guide-layout';
import { EstimatePage1 } from './EstimatePage1';
import { EstimateImagePage } from './EstimateImagePage';
import { EstimatePage2 } from './EstimatePage2';
import { EstimatePage3 } from './EstimatePage3';

interface EstimateDocumentProps {
  data: EstimateDocumentData;
  viewMode?: 'screen-preview' | 'print';
  page1Editor?: EstimatePage1Editor;
  includeStaticImagePages?: boolean;
}

export function EstimateDocument({
  data,
  viewMode = 'print',
  page1Editor,
  includeStaticImagePages = true,
}: EstimateDocumentProps): JSX.Element {
  const guideChunks = useMemo(() => {
    const splits = data.estimateGuidePageSplits;
    if (Array.isArray(splits) && splits.length > 0 && splits.every((n) => Number.isInteger(n) && n >= 1)) {
      return chunkGuidePagesBySplits(data.page3Blocks, splits);
    }
    const guidePerPage = normalizeEstimateGuideImagesPerPage(data.estimateGuideImagesPerPage);
    return chunkEstimateGuidePages(data.page3Blocks, guidePerPage);
  }, [data.estimateGuidePageSplits, data.estimateGuideImagesPerPage, data.page3Blocks]);

  return (
    <article className={`estimate-document ${viewMode === 'screen-preview' ? 'estimate-document--preview' : ''}`}>
      <EstimatePage1 data={data} editor={viewMode === 'screen-preview' ? page1Editor : undefined} />
      <div className="estimate-page-break">
        <EstimatePage2 data={data} />
      </div>
      {guideChunks.map((chunk, index) => (
        <div key={`estimate-guide-page-${index + 1}`} className="estimate-page-break">
          <EstimatePage3 blocks={chunk} />
        </div>
      ))}
      {includeStaticImagePages
        ? ESTIMATE_IMAGE_PAGE_SRCS.map((imageSrc, index) => (
            <div key={imageSrc} className="estimate-page-break">
              <EstimateImagePage
                imageSrc={imageSrc}
                ariaLabel={`견적서 이미지 페이지 ${index + 3 + guideChunks.length}`}
              />
            </div>
          ))
        : null}
    </article>
  );
}
