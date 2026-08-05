import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ConfirmationDocumentSnapshot } from '../model/types';
import { ConfirmationPdfPreviewPanel } from './ConfirmationPdfPreviewPanel';
import { ConfirmationPdfShareButton } from './ConfirmationPdfShareButton';

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

export function ConfirmationFullscreenPreview({
  open,
  onClose,
  confirmationDocumentId,
  snapshot,
  planVersionId,
}: {
  open: boolean;
  onClose: () => void;
  confirmationDocumentId: string;
  snapshot: ConfirmationDocumentSnapshot;
  planVersionId?: string | null;
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
        <h2 className="text-sm font-semibold">확정서 전체보기</h2>
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
          <ConfirmationPdfShareButton
            confirmationDocumentId={confirmationDocumentId}
            snapshot={snapshot}
            planVersionId={planVersionId}
            variant="dark"
          />
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
          <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
            <ConfirmationPdfPreviewPanel
              confirmationDocumentId={confirmationDocumentId}
              snapshot={snapshot}
              planVersionId={planVersionId}
              previewAllowUpscale
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
