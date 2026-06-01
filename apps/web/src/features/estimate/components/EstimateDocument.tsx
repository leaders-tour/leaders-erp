import { useMemo, type ReactNode } from 'react';
import '../styles/estimate-print.css';
import { ESTIMATE_GUIDE_FILLER_IMAGE_SRCS, ESTIMATE_IMAGE_PAGE_SRCS } from '../model/constants';
import type { EstimateDocumentData, EstimateGuideBlock, EstimatePage1Editor } from '../model/types';
import {
  chunkEstimateGuidePages,
  chunkGuidePagesBySplits,
  normalizeEstimateGuideImagesPerPage,
} from '../utils/guide-layout';
import { EstimatePage1 } from './EstimatePage1';
import { EstimateImagePage } from './EstimateImagePage';
import { EstimatePage2 } from './EstimatePage2';
import { EstimatePage3 } from './EstimatePage3';
import { useMovementIntensityColorSettings } from '../../app-settings/hooks';

interface EstimateDocumentProps {
  data: EstimateDocumentData;
  viewMode?: 'screen-preview' | 'print';
  page1Editor?: EstimatePage1Editor;
  /** 미리보기에서 첫 안내 페이지(문서 3페이지) 우측 상단에 띄울 컨트롤 본문 */
  screenPreviewGuideOverlay?: ReactNode;
  includeStaticImagePages?: boolean;
}

function appendGuideFillersToLastChunk(chunks: EstimateGuideBlock[][]): EstimateGuideBlock[][] {
  if (chunks.length === 0) {
    return chunks;
  }

  const lastChunk = chunks[chunks.length - 1] ?? [];
  const fillerCount = lastChunk.length === 1 ? 2 : lastChunk.length === 2 ? 1 : 0;
  if (fillerCount === 0) {
    return chunks;
  }

  const fillers = ESTIMATE_GUIDE_FILLER_IMAGE_SRCS.slice(0, fillerCount).map((src, index) => ({
    locationId: `estimate-guide-filler-${index + 1}`,
    locationName: '',
    title: '',
    description: '',
    imageUrls: [src],
  }));

  return chunks.map((chunk, index) => (index === chunks.length - 1 ? [...chunk, ...fillers] : chunk));
}

function hasPrimaryGuideImage(block: EstimateGuideBlock): boolean {
  const url = block.imageUrls[0];
  return typeof url === 'string' && url.trim().length > 0;
}

export function EstimateDocument({
  data,
  viewMode = 'print',
  page1Editor,
  screenPreviewGuideOverlay,
  includeStaticImagePages = true,
}: EstimateDocumentProps): JSX.Element {
  const { colors: settingsMovementIntensityColors } = useMovementIntensityColorSettings();
  const movementIntensityColors = data.movementIntensityColors ?? settingsMovementIntensityColors;
  const guideChunks = useMemo(() => {
    const guideBlocks = data.page3Blocks.filter(hasPrimaryGuideImage);
    if (guideBlocks.length === 0) {
      return [];
    }
    const splits = data.estimateGuidePageSplits;
    const chunks = Array.isArray(splits) && splits.length > 0 && splits.every((n) => Number.isInteger(n) && n >= 1)
      ? chunkGuidePagesBySplits(guideBlocks, splits)
      : chunkEstimateGuidePages(
          guideBlocks,
          normalizeEstimateGuideImagesPerPage(data.estimateGuideImagesPerPage),
        );

    return appendGuideFillersToLastChunk(chunks);
  }, [data.estimateGuidePageSplits, data.estimateGuideImagesPerPage, data.page3Blocks]);

  return (
    <article className={`estimate-document ${viewMode === 'screen-preview' ? 'estimate-document--preview' : ''}`}>
      <EstimatePage1 data={data} editor={viewMode === 'screen-preview' ? page1Editor : undefined} />
      <div className="estimate-page-break">
        <EstimatePage2 data={data} movementIntensityColors={movementIntensityColors} />
      </div>
      {guideChunks.map((chunk, index) => {
        const isFirstGuidePage = index === 0;
        const showGuideOverlay =
          viewMode === 'screen-preview' &&
          isFirstGuidePage &&
          screenPreviewGuideOverlay != null;

        return (
          <div
            key={`estimate-guide-page-${index + 1}`}
            className={`estimate-page-break${showGuideOverlay ? ' relative isolate' : ''}`}
            data-estimate-document-page={isFirstGuidePage ? '3' : undefined}
          >
            {showGuideOverlay ? (
              <div className="pointer-events-none absolute left-2 right-2 top-2 z-20 flex justify-end sm:left-auto sm:right-3 sm:top-3">
                <div className="pointer-events-auto w-full max-w-[min(100%,16.5rem)] rounded-xl border border-slate-200/90 bg-white/95 p-2.5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur-md sm:max-w-[min(100%,17.5rem)] sm:p-3 supports-[backdrop-filter]:bg-white/80">
                  {screenPreviewGuideOverlay}
                </div>
              </div>
            ) : null}
            <EstimatePage3 blocks={chunk} />
          </div>
        );
      })}
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
