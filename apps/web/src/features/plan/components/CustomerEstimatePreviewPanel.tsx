import { Card } from '@tour/ui';
import { useState } from 'react';
import { EstimateDocument } from '../../estimate/components/EstimateDocument';
import { EstimatePreviewScaler } from '../../estimate/components/EstimatePreviewScaler';
import { useEstimateSource } from '../../estimate/hooks/use-estimate-source';

interface CustomerEstimatePreviewPanelProps {
  versionId: string | null;
  versionNumber?: number | null;
}

function EstimatePlaceholder({
  message,
  isError = false,
  onRetry,
}: {
  message: string;
  isError?: boolean;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div
      className={`flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-16 text-center text-sm ${
        isError
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      <div className="h-48 w-36 rounded-md border border-slate-200 bg-white shadow-sm" aria-hidden />
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

function CustomerEstimatePreviewBody({
  versionId,
  versionNumber,
  onRetry,
}: {
  versionId: string;
  versionNumber?: number | null;
  onRetry: () => void;
}): JSX.Element {
  const { data, loading, errorMessage, version } = useEstimateSource({
    mode: 'version',
    versionId,
    draftKey: null,
    includeLocationGuides: false,
  });

  const labelVersion = versionNumber ?? version?.versionNumber ?? null;

  if (loading) {
    return (
      <EstimatePlaceholder
        message={
          labelVersion != null
            ? `견적서를 불러오는 중… v${labelVersion}`
            : '견적서를 불러오는 중…'
        }
      />
    );
  }

  if (errorMessage) {
    return <EstimatePlaceholder isError message={errorMessage} onRetry={onRetry} />;
  }

  if (!data) {
    return <EstimatePlaceholder message="미리보기 데이터를 준비할 수 없습니다." />;
  }

  return (
    <div className="estimate-preview-frame">
      <EstimatePreviewScaler>
        <EstimateDocument
          data={data}
          viewMode="screen-preview"
          includeGuidePages={false}
          includeStaticImagePages={false}
        />
      </EstimatePreviewScaler>
    </div>
  );
}

export function CustomerEstimatePreviewPanel({
  versionId,
  versionNumber,
}: CustomerEstimatePreviewPanelProps): JSX.Element {
  const [retryToken, setRetryToken] = useState(0);

  return (
    <Card className="w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">견적서 미리보기</h2>
          <p className="mt-1 text-xs text-slate-500">
            {versionId
              ? versionNumber != null
                ? `선택된 버전 v${versionNumber}`
                : '선택된 버전'
              : '버전을 선택하면 견적서가 표시됩니다.'}
          </p>
        </div>
        {versionNumber != null ? (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            v{versionNumber}
          </span>
        ) : null}
      </div>

      {versionId ? (
        <CustomerEstimatePreviewBody
          key={`${versionId}:${retryToken}`}
          versionId={versionId}
          versionNumber={versionNumber}
          onRetry={() => setRetryToken((current) => current + 1)}
        />
      ) : (
        <EstimatePlaceholder message="미리볼 견적서가 없습니다." />
      )}
    </Card>
  );
}
