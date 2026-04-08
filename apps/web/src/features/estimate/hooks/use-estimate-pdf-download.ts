import { useCallback, useState } from 'react';
import { useAuth } from '../../auth/context';
import { API_BASE_URL } from '../../../lib/api-base-url';
import type { EstimateDocumentData } from '../model/types';

function getFilenameFromDisposition(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (_error) {
      return fallback;
    }
  }

  const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] ?? fallback;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || 'PDF 다운로드에 실패했습니다.';
  } catch (_error) {
    return 'PDF 다운로드에 실패했습니다.';
  }
}

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

export function useEstimatePdfDownload(): {
  downloading: boolean;
  downloadEstimatePdf: (input: { data: EstimateDocumentData }) => Promise<void>;
} {
  const { ensureAccessToken } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const authorizedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        throw new Error('인증 토큰을 확인할 수 없습니다. 다시 로그인해주세요.');
      }

      return fetch(input, {
        ...init,
        credentials: 'include',
        headers: {
          ...(init?.headers ?? {}),
          authorization: `Bearer ${accessToken}`,
        },
      });
    },
    [ensureAccessToken],
  );

  const downloadEstimatePdf = useCallback(
    async (input: { data: EstimateDocumentData }): Promise<void> => {
      setDownloading(true);
      try {
        const response = await authorizedFetch(`${API_BASE_URL}/documents/estimate/pdf`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const blob = await response.blob();
        triggerBlobDownload(
          blob,
          getFilenameFromDisposition(response.headers.get('content-disposition'), `${input.data.planTitle || 'estimate'}.pdf`),
        );
      } finally {
        setDownloading(false);
      }
    },
    [authorizedFetch],
  );

  return {
    downloading,
    downloadEstimatePdf,
  };
}
