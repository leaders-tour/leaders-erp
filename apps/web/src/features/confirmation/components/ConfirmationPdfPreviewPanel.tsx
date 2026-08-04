import { ConfirmationDocument } from './ConfirmationDocument';
import { useConfirmationAppendixData } from '../hooks/use-confirmation-appendix-data';
import type { ConfirmationDocumentSnapshot } from '../model/types';
import { snapshotToDocumentData } from '../utils/format';

export function ConfirmationPdfPreviewPanel({
  snapshot,
  planVersionId,
  previewBaseWidth,
  previewAllowUpscale,
}: {
  confirmationDocumentId: string;
  snapshot: ConfirmationDocumentSnapshot;
  planVersionId?: string | null;
  isDraft?: boolean;
  previewBaseWidth?: number;
  previewAllowUpscale?: boolean;
}) {
  const { appendixData, loading: appendixLoading } = useConfirmationAppendixData({
    planVersionId: planVersionId ?? snapshot.sourcePlanVersionId,
    appendixPlanStops: snapshot.appendixPlanStops,
    overallMovementIntensityColorOverride: snapshot.overallMovementIntensityColorOverride,
    includeLocationGuides: false,
  });

  if (appendixLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 py-16 text-sm text-slate-400">
        확정서 미리보기를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="estimate-preview-frame confirmation-builder-preview-frame confirmation-builder-preview-frame--confirmation">
      <ConfirmationDocument
        data={snapshotToDocumentData(snapshot)}
        appendixData={appendixData}
        appendixIncludeImagePages={false}
        viewMode="screen-preview"
        previewBaseWidth={previewBaseWidth}
        previewAllowUpscale={previewAllowUpscale}
      />
    </div>
  );
}
