import '../../estimate/styles/estimate-print.css';
import { EstimateImagePage } from '../../estimate/components/EstimateImagePage';
import { EstimatePage2 } from '../../estimate/components/EstimatePage2';
import { useMovementIntensityColorSettings } from '../../app-settings/hooks';
import type { EstimateDocumentData, EstimatePage2Editor } from '../../estimate/model/types';
import type { MovementIntensityColorSetting } from '../../estimate/model/movement-intensity';
import { resolveEstimateDocumentClassName } from '../../estimate/utils/resolve-estimate-document-class-name';
import {
  CONFIRMATION_MOVEMENT_INTENSITY_PAGE_SRC,
  CONFIRMATION_NOTICE_PAGE_SRC,
  DEFAULT_CONFIRMATION_APPENDIX_INCLUDE_IMAGE_PAGES,
} from '../model/constants';

interface ConfirmationAppendixPagesProps {
  data: EstimateDocumentData;
  viewMode?: 'screen-preview' | 'output';
  movementIntensityColors?: readonly MovementIntensityColorSetting[] | null;
  page2Editor?: EstimatePage2Editor;
  /** false면 Page2 일정표만 렌더하고 이동강도·안내 이미지 페이지는 생략 */
  includeImagePages?: boolean;
}

export function ConfirmationAppendixPages({
  data,
  viewMode = 'output',
  movementIntensityColors: movementIntensityColorsOverride,
  page2Editor,
  includeImagePages = DEFAULT_CONFIRMATION_APPENDIX_INCLUDE_IMAGE_PAGES,
}: ConfirmationAppendixPagesProps): JSX.Element {
  const { colors: configuredMovementIntensityColors } = useMovementIntensityColorSettings();
  const movementIntensityColors = movementIntensityColorsOverride ?? configuredMovementIntensityColors;
  const estimateViewMode = viewMode === 'screen-preview' ? 'screen-preview' : 'output';

  return (
    <article className={resolveEstimateDocumentClassName(estimateViewMode)}>
      <div className="estimate-page-break">
        <EstimatePage2
          data={data}
          movementIntensityColors={movementIntensityColors}
          editor={viewMode === 'screen-preview' ? page2Editor : undefined}
        />
      </div>
      {includeImagePages ? (
        <>
          <div className="estimate-page-break">
            <EstimateImagePage
              imageSrc={CONFIRMATION_MOVEMENT_INTENSITY_PAGE_SRC}
              ariaLabel="확정서 이동강도 안내"
            />
          </div>
          <div className="estimate-page-break">
            <EstimateImagePage imageSrc={CONFIRMATION_NOTICE_PAGE_SRC} ariaLabel="확정서 안내사항" />
          </div>
        </>
      ) : null}
    </article>
  );
}
