import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEstimateSource } from '../hooks/use-estimate-source';
import { EstimateDocument } from './EstimateDocument';
import { EstimatePreviewScaler } from './EstimatePreviewScaler';

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

function EstimateFullscreenBody({ planVersionId }: { planVersionId: string }): JSX.Element {
  const { data: estimateData, loading: estimateLoading, errorMessage } = useEstimateSource({
    mode: 'version',
    versionId: planVersionId,
    draftKey: null,
    includeLocationGuides: false,
  });

  if (estimateLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-white py-16 text-sm text-slate-400">
        견적서 미리보기를 불러오는 중...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {errorMessage}
      </div>
    );
  }

  if (!estimateData) {
    return (
      <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500">
        표시할 견적서가 없습니다.
      </div>
    );
  }

  return (
    <div className="estimate-preview-frame overflow-hidden rounded-xl bg-white shadow-2xl">
      <EstimatePreviewScaler allowUpscale>
        <EstimateDocument
          data={estimateData}
          viewMode="screen-preview"
          includeGuidePages={false}
          includeStaticImagePages={false}
        />
      </EstimatePreviewScaler>
    </div>
  );
}

export function EstimateFullscreenPreview({
  open,
  onClose,
  planVersionId,
}: {
  open: boolean;
  onClose: () => void;
  planVersionId: string;
}): JSX.Element | null {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return undefined;
    setZoom(1);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/80" role="dialog" aria-modal="true">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 text-white sm:px-4">
        <h2 className="text-sm font-semibold">견적서 전체보기</h2>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20 disabled:opacity-40"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => setZoom((value) => Math.max(ZOOM_MIN, Number((value - ZOOM_STEP).toFixed(2))))}
            aria-label="축소"
          >
            −
          </button>
          <span className="min-w-[3.25rem] text-center text-xs tabular-nums text-white/90">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20 disabled:opacity-40"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => setZoom((value) => Math.min(ZOOM_MAX, Number((value + ZOOM_STEP).toFixed(2))))}
            aria-label="확대"
          >
            +
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
            onClick={() => setZoom(1)}
          >
            맞춤
          </button>
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 overflow-auto overscroll-contain px-2 py-4 sm:px-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          className="mx-auto origin-top"
          style={{
            width: `${Math.round(100 * zoom)}%`,
            maxWidth: `${Math.round(760 * zoom)}px`,
          }}
        >
          <EstimateFullscreenBody planVersionId={planVersionId} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
