import { Button, Card } from '@tour/ui';
import { ConfirmationDocument } from './ConfirmationDocument';
import { useConfirmationAppendixData } from '../hooks/use-confirmation-appendix-data';
import type { ConfirmationDocumentRow } from '../model/types';
import { getConfirmationDocumentStatusLabel } from '../utils/confirmation-document-status';
import { snapshotToDocumentData } from '../utils/format';
import { resolveConfirmationPreviewPlanVersionId } from '../utils/select-latest-confirmation-document';

interface ConfirmationLatestPreviewPanelProps {
  document: ConfirmationDocumentRow | null;
  documentsLoading?: boolean;
  hasSelectedCustomer?: boolean;
  isLatest?: boolean;
  onShowLatest?: () => void;
}

function getPreviewTitle(document: ConfirmationDocumentRow): string {
  const destination = document.snapshot.destination?.trim();
  if (destination) {
    return `${destination} 여정`;
  }
  return '확정 여정';
}

export function ConfirmationLatestPreviewPanel({
  document,
  documentsLoading = false,
  hasSelectedCustomer = false,
  isLatest = true,
  onShowLatest,
}: ConfirmationLatestPreviewPanelProps): JSX.Element {
  const snapshot = document?.snapshot;
  const planVersionId = resolveConfirmationPreviewPlanVersionId(document);
  const { appendixData, loading: appendixLoading } = useConfirmationAppendixData({
    planVersionId,
    appendixPlanStops: snapshot?.appendixPlanStops,
    overallMovementIntensityColorOverride: snapshot?.overallMovementIntensityColorOverride,
  });

  if (!hasSelectedCustomer) {
    return (
      <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        고객을 선택하면 확정서 미리보기가 표시됩니다.
      </Card>
    );
  }

  if (documentsLoading) {
    return (
      <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">확정서 미리보기</h2>
          <p className="mt-1 text-xs text-slate-600">선택한 확정서 1·2페이지를 표시합니다.</p>
        </div>
        <p className="text-sm text-slate-500">확정서를 불러오는 중...</p>
      </div>
    );
  }

  if (!document || !snapshot) {
    return (
      <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">확정서 미리보기</h2>
          <p className="mt-1 text-xs text-slate-600">선택한 확정서 1·2페이지를 표시합니다.</p>
        </div>
        <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          저장된 확정서가 없습니다.
        </Card>
      </div>
    );
  }

  const statusLabel = getConfirmationDocumentStatusLabel(document.status);
  const badge = appendixLoading
    ? '일정표 동기화 중'
    : `v${document.versionNumber} · ${statusLabel}`;

  return (
    <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="text-base font-semibold text-slate-900">확정서 미리보기</h2>
          <p className="mt-1 text-xs text-slate-600">
            {getPreviewTitle(document)} · Page1 확정서와 Page2 일정표만 표시합니다.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {!isLatest && onShowLatest ? (
            <Button type="button" variant="outline" className="h-7 px-2.5 text-[11px]" onClick={onShowLatest}>
              최신 버전 보기
            </Button>
          ) : null}
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
            {badge}
          </div>
        </div>
      </div>

      {appendixLoading ? (
        <p className="mb-3 text-xs text-slate-500">확정서 일정표를 불러오는 중...</p>
      ) : null}

      <div className="estimate-preview-frame confirmation-builder-preview-frame confirmation-builder-preview-frame--confirmation confirmation-builder-home-preview-frame">
        <ConfirmationDocument
          data={snapshotToDocumentData(snapshot)}
          appendixData={appendixData}
          appendixIncludeImagePages={false}
          viewMode="screen-preview"
        />
      </div>
    </div>
  );
}
