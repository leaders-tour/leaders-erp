import { useCallback, useState } from 'react';
import { useAuth } from '../../auth/context';
import { API_BASE_URL } from '../../../lib/api-base-url';
import type { EstimateDocumentData } from '../model/types';

const PDF_JOB_POLL_INTERVAL_MS = 2_000;
const PDF_JOB_MAX_WAIT_MS = 5 * 60_000;

type EstimatePdfJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type EstimatePdfDownloadPhase = 'idle' | 'queued' | 'rendering' | 'downloading';

interface EstimatePdfJobResponse {
  jobId: string;
  status: EstimatePdfJobStatus;
}

interface EstimatePdfJobStatusResponse extends EstimatePdfJobResponse {
  errorMessage?: string;
  filename: string;
  ready: boolean;
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function getEstimatePdfDownloadLabel(phase: EstimatePdfDownloadPhase): string {
  switch (phase) {
    case 'queued':
      return 'PDF 생성 요청 중...';
    case 'rendering':
      return 'PDF 생성 중...';
    case 'downloading':
      return 'PDF 다운로드 중...';
    case 'idle':
    default:
      return 'PDF 다운로드';
  }
}

export function useEstimatePdfDownload(): {
  downloading: boolean;
  phase: EstimatePdfDownloadPhase;
  downloadEstimatePdf: (input: { data: EstimateDocumentData }) => Promise<void>;
} {
  const { ensureAccessToken } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [phase, setPhase] = useState<EstimatePdfDownloadPhase>('idle');

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

  const pollEstimatePdfJob = useCallback(
    async (jobId: string): Promise<EstimatePdfJobStatusResponse> => {
      const deadline = Date.now() + PDF_JOB_MAX_WAIT_MS;

      while (Date.now() < deadline) {
        const response = await authorizedFetch(`${API_BASE_URL}/documents/estimate/pdf-jobs/${encodeURIComponent(jobId)}`);
        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const payload = (await response.json()) as EstimatePdfJobStatusResponse;
        if (payload.status === 'succeeded') {
          return payload;
        }
        if (payload.status === 'failed') {
          throw new Error(payload.errorMessage || 'PDF 생성에 실패했습니다.');
        }

        setPhase(payload.status === 'queued' ? 'queued' : 'rendering');
        await sleep(PDF_JOB_POLL_INTERVAL_MS);
      }

      throw new Error('PDF 생성 대기 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    },
    [authorizedFetch],
  );

  const downloadEstimatePdf = useCallback(
    async (input: { data: EstimateDocumentData }): Promise<void> => {
      setDownloading(true);
      setPhase('queued');
      try {
        const response = await authorizedFetch(`${API_BASE_URL}/documents/estimate/pdf-jobs`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const payload = (await response.json()) as EstimatePdfJobResponse;
        const job = await pollEstimatePdfJob(payload.jobId);

        setPhase('downloading');
        const downloadResponse = await authorizedFetch(`${API_BASE_URL}/documents/estimate/pdf-jobs/${encodeURIComponent(job.jobId)}/download`);
        if (!downloadResponse.ok) {
          throw new Error(await getErrorMessage(downloadResponse));
        }

        const blob = await downloadResponse.blob();
        triggerBlobDownload(
          blob,
          getFilenameFromDisposition(
            downloadResponse.headers.get('content-disposition'),
            job.filename || `${input.data.planTitle || 'estimate'}.pdf`,
          ),
        );
      } finally {
        setDownloading(false);
        setPhase('idle');
      }
    },
    [authorizedFetch, pollEstimatePdfJob],
  );

  return {
    downloading,
    phase,
    downloadEstimatePdf,
  };
}
