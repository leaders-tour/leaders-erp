export type SharePdfResult = 'shared' | 'cancelled' | 'unsupported';

export type PreparedPdfShare = {
  file: File;
  blob: Blob;
  filename: string;
  title?: string;
  text?: string;
};

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function canShareFile(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** 모바일 네이티브 파일 공유 가능 여부 (보안 컨텍스트 포함) */
export function canNativeSharePdf(): boolean {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    return false;
  }
  if (typeof File === 'undefined') {
    return false;
  }
  try {
    const probe = new File([new Uint8Array(0)], 'probe.pdf', { type: 'application/pdf' });
    return canShareFile(probe);
  } catch {
    return false;
  }
}

export function preparePdfShare(options: {
  blob: Blob;
  filename: string;
  title?: string;
  text?: string;
}): PreparedPdfShare {
  const pdfBlob =
    options.blob.type === 'application/pdf'
      ? options.blob
      : new Blob([options.blob], { type: 'application/pdf' });
  const file = new File([pdfBlob], options.filename, { type: 'application/pdf' });
  return {
    file,
    blob: pdfBlob,
    filename: options.filename,
    title: options.title,
    text: options.text,
  };
}

/**
 * 반드시 새 사용자 탭(클릭) 안에서 호출.
 * PDF 생성 등 긴 await 이후에 바로 호출하면 iOS에서 NotAllowedError가 납니다.
 */
export async function sharePreparedPdf(prepared: PreparedPdfShare): Promise<SharePdfResult> {
  if (!canShareFile(prepared.file) || !window.isSecureContext) {
    return 'unsupported';
  }

  try {
    await navigator.share({
      files: [prepared.file],
      title: prepared.title,
      text: prepared.text,
    });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

/** 공유 미지원 시 사용자가 직접 탭할 때만 호출 (자동 이동 금지) */
export function downloadPreparedPdf(prepared: PreparedPdfShare): void {
  triggerBlobDownload(prepared.blob, prepared.filename);
}

/**
 * @deprecated 자동 폴백 다운로드는 iOS에서 PDF 전체화면 이동을 유발합니다.
 * 2단계 공유 UI(prepare → 탭으로 share)를 사용하세요.
 */
export async function shareOrDownloadPdf(options: {
  blob: Blob;
  filename: string;
  title?: string;
  text?: string;
}): Promise<SharePdfResult | 'downloaded'> {
  const prepared = preparePdfShare(options);
  const result = await sharePreparedPdf(prepared);
  if (result === 'unsupported') {
    downloadPreparedPdf(prepared);
    return 'downloaded';
  }
  return result;
}
