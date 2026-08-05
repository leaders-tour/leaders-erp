import { createPortal } from 'react-dom';
import {
  canNativeSharePdf,
  downloadPreparedPdf,
  sharePreparedPdf,
  type PreparedPdfShare,
} from '../lib/share-pdf';

export function PdfShareReadySheet({
  open,
  prepared,
  documentLabel,
  regenerating = false,
  onClose,
  onRegenerate,
}: {
  open: boolean;
  prepared: PreparedPdfShare | null;
  documentLabel: string;
  regenerating?: boolean;
  onClose: () => void;
  onRegenerate?: () => void;
}): JSX.Element | null {
  if (!open || !prepared || typeof document === 'undefined') {
    return null;
  }

  const canShare = canNativeSharePdf();

  const handleShareClick = async (): Promise<void> => {
    const result = await sharePreparedPdf(prepared);
    if (result === 'shared' || result === 'cancelled') {
      onClose();
      return;
    }
    window.alert(
      '이 환경에서는 네이티브 공유를 사용할 수 없습니다. HTTPS(또는 로컬 보안 접속)에서 다시 시도해주세요.',
    );
  };

  const handleDownloadClick = (): void => {
    downloadPreparedPdf(prepared);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-5">
        <h3 className="text-base font-semibold text-slate-900">{documentLabel} 준비 완료</h3>
        <p className="mt-1 text-sm text-slate-600">
          {canShare
            ? '아래 버튼을 누르면 공유 시트가 열립니다. 같은 문서는 다시 만들지 않고 재사용합니다.'
            : '네이티브 공유는 HTTPS 보안 접속에서만 사용할 수 있습니다. PDF를 열거나 저장한 뒤 공유해주세요.'}
        </p>
        <p className="mt-2 truncate text-xs text-slate-400">{prepared.filename}</p>

        <div className="mt-4 grid gap-2">
          {canShare ? (
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={regenerating}
              onClick={() => void handleShareClick()}
            >
              공유하기
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            disabled={regenerating}
            onClick={handleDownloadClick}
          >
            PDF 저장/열기
          </button>
          {onRegenerate ? (
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={regenerating}
              onClick={onRegenerate}
            >
              {regenerating ? 'PDF 다시 만드는 중...' : 'PDF 다시 만들기'}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
