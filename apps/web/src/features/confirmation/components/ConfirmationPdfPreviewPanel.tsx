import { useCallback, useEffect, useState } from 'react';
import { PdfPageViewer } from '../../../components/pdf/PdfPageViewer';
import { useAuth } from '../../auth/context';
import { API_BASE_URL } from '../../../lib/api-base-url';
import { useConfirmationAppendixData } from '../hooks/use-confirmation-appendix-data';
import type { ConfirmationDocumentSnapshot } from '../model/types';

interface PdfJobResponse {
  jobId: string;
}

interface PdfJobStatusResponse {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  errorMessage?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function ConfirmationPdfPreviewPanel({
  confirmationDocumentId,
  snapshot,
  planVersionId,
  isDraft = false,
}: {
  confirmationDocumentId: string;
  snapshot: ConfirmationDocumentSnapshot;
  planVersionId?: string | null;
  isDraft?: boolean;
}) {
  const { appendixData, loading: appendixLoading } = useConfirmationAppendixData({
    planVersionId: planVersionId ?? snapshot.sourcePlanVersionId,
    appendixPlanStops: snapshot.appendixPlanStops,
    overallMovementIntensityColorOverride: snapshot.overallMovementIntensityColorOverride,
  });
  const { ensureAccessToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const authorizedFetch = useCallback(
    async (input: string, init?: RequestInit) => {
      const token = await ensureAccessToken();
      return fetch(input, {
        ...init,
        credentials: 'include',
        headers: {
          ...(init?.headers ?? {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [ensureAccessToken],
  );

  useEffect(() => {
    if (appendixLoading) return;

    let cancelled = false;
    setGenerating(true);
    setError(false);
    setBlobUrl(null);

    void (async () => {
      try {
        const jobRes = await authorizedFetch(`${API_BASE_URL}/documents/confirmation/pdf-jobs`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            snapshot,
            appendixData,
            isDraft,
          }),
        });
        if (!jobRes.ok || cancelled) return;
        const { jobId } = (await jobRes.json()) as PdfJobResponse;

        while (!cancelled) {
          const statusRes = await authorizedFetch(
            `${API_BASE_URL}/documents/confirmation/pdf-jobs/${encodeURIComponent(jobId)}`,
          );
          const status = (await statusRes.json()) as PdfJobStatusResponse;
          if (status.status === 'succeeded') break;
          if (status.status === 'failed') {
            if (!cancelled) setError(true);
            return;
          }
          await sleep(2_000);
        }
        if (cancelled) return;

        const dlRes = await authorizedFetch(
          `${API_BASE_URL}/documents/confirmation/pdf-jobs/${encodeURIComponent(jobId)}/download`,
        );
        if (!dlRes.ok || cancelled) return;
        const blob = await dlRes.blob();
        if (!cancelled) setBlobUrl(URL.createObjectURL(blob));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appendixData, appendixLoading, authorizedFetch, confirmationDocumentId, isDraft, snapshot]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (appendixLoading || generating) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 py-16 text-sm text-slate-400">
        확정서 PDF 생성 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        확정서 PDF를 생성할 수 없습니다.
      </div>
    );
  }

  if (!blobUrl) return null;

  return <PdfPageViewer url={blobUrl} filename="확정서.pdf" />;
}
