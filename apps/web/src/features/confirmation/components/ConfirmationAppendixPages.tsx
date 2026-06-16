import '../../estimate/styles/estimate-print.css';
import { EstimateImagePage } from '../../estimate/components/EstimateImagePage';
import { EstimatePage2 } from '../../estimate/components/EstimatePage2';
import { useMovementIntensityColorSettings } from '../../app-settings/hooks';
import type { EstimateDocumentData } from '../../estimate/model/types';
import type { MovementIntensityColorSetting } from '../../estimate/model/movement-intensity';
import { resolveEstimateDocumentClassName } from '../../estimate/utils/resolve-estimate-document-class-name';
import {
  CONFIRMATION_MOVEMENT_INTENSITY_PAGE_SRC,
  CONFIRMATION_NOTICE_PAGE_SRC,
} from '../model/constants';

interface ConfirmationAppendixPagesProps {
  data: EstimateDocumentData;
  viewMode?: 'screen-preview' | 'output';
  movementIntensityColors?: readonly MovementIntensityColorSetting[] | null;
}

export function ConfirmationAppendixPages({
  data,
  viewMode = 'output',
  movementIntensityColors: movementIntensityColorsOverride,
}: ConfirmationAppendixPagesProps): JSX.Element {
  const { colors: configuredMovementIntensityColors } = useMovementIntensityColorSettings();
  const movementIntensityColors = movementIntensityColorsOverride ?? configuredMovementIntensityColors;
  const estimateViewMode = viewMode === 'screen-preview' ? 'screen-preview' : 'output';

  return (
    <article className={resolveEstimateDocumentClassName(estimateViewMode)}>
      <div className="estimate-page-break">
        <EstimatePage2 data={data} movementIntensityColors={movementIntensityColors} />
      </div>
      <div className="estimate-page-break">
        <EstimateImagePage
          imageSrc={CONFIRMATION_MOVEMENT_INTENSITY_PAGE_SRC}
          ariaLabel="확정서 이동강도 안내"
        />
      </div>
      <div className="estimate-page-break">
        <EstimateImagePage imageSrc={CONFIRMATION_NOTICE_PAGE_SRC} ariaLabel="확정서 안내사항" />
      </div>
    </article>
  );
}
