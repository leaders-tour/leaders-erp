import { Card } from '@tour/ui';
import type { ReactNode } from 'react';
import type { EstimateDocumentData, EstimatePage1Editor, EstimatePage2Editor } from '../model/types';
import { EstimateDocument } from './EstimateDocument';
import { EstimatePreviewScaler } from './EstimatePreviewScaler';

interface BuilderEstimatePreviewPanelProps {
  title: string;
  description: string;
  badge: string;
  data: EstimateDocumentData | null;
  loading?: boolean;
  loadingMessage?: string;
  page1Editor?: EstimatePage1Editor;
  page2Editor?: EstimatePage2Editor;
  validUntilEditor?: {
    value: string;
    onChange: (value: string) => void;
  };
  screenPreviewGuideOverlay?: ReactNode;
}

export function BuilderEstimatePreviewPanel({
  title,
  description,
  badge,
  data,
  loading = false,
  loadingMessage = '미리보기 데이터를 준비 중입니다...',
  page1Editor,
  page2Editor,
  validUntilEditor,
  screenPreviewGuideOverlay,
}: BuilderEstimatePreviewPanelProps): JSX.Element {
  return (
    <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 pr-2 sm:max-w-[min(100%,calc(100%-11rem))]">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-600">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
            {badge}
          </div>
        </div>
      </div>

      {data ? (
        <div className="estimate-preview-frame">
          <EstimatePreviewScaler>
            <EstimateDocument
              data={data}
              viewMode="screen-preview"
              guideSplitRemainderStrategy="chunk-per-page"
              page1Editor={page1Editor}
              page2Editor={page2Editor}
              validUntilEditor={validUntilEditor}
              screenPreviewGuideOverlay={screenPreviewGuideOverlay}
            />
          </EstimatePreviewScaler>
        </div>
      ) : (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {loading ? loadingMessage : '미리보기 데이터를 준비할 수 없습니다.'}
        </Card>
      )}
    </div>
  );
}
