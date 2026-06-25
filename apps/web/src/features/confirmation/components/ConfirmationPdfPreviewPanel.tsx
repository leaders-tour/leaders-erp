import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useAuth } from '../../auth/context';
import { API_BASE_URL } from '../../../lib/api-base-url';
import { GRAPHQL_URL } from '../../../lib/graphql-endpoint';
import { useConfirmationAppendixData } from '../hooks/use-confirmation-appendix-data';
import type { ConfirmationDocumentSnapshot } from '../model/types';

const PDF_PROXY_BASE = GRAPHQL_URL.replace(/\/graphql$/, '');

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

function ConfirmationPdfPageViewer({ url, filename }: { url: string; filename: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [useProxy, setUseProxy] = useState(false);
  const [fatalError, setFatalError] = useState(false);
  const [pageWidth, setPageWidth] = useState(640);
  const containerRef = useRef<HTMLDivElement>(null);

  const proxyUrl = `${PDF_PROXY_BASE}/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  const effectiveUrl = useProxy ? proxyUrl : url;
  const pagesToShow = numPages ? Math.min(numPages, 2) : 2;
  const canvasDevicePixelRatio =
    typeof window !== 'undefined' ? Math.min(3, Math.max(window.devicePixelRatio || 1, 2)) : 2;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w > 0) setPageWidth(Math.floor(w));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setPageWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleLoadError = () => {
    if (!useProxy) {
      setUseProxy(true);
    } else {
      setFatalError(true);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="truncate text-xs font-medium text-slate-500">{filename}</p>
      </div>
      {fatalError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          PDF를 렌더링할 수 없습니다.
        </div>
      ) : (
        <div ref={containerRef} className="w-full min-w-0">
          <Document
            key={effectiveUrl}
            file={effectiveUrl}
            onLoadSuccess={({ numPages: total }) => setNumPages(total)}
            onLoadError={handleLoadError}
            loading={
              <div className="flex items-center justify-center rounded-2xl bg-slate-100 py-16 text-sm text-slate-400">
                PDF 로딩 중...
              </div>
            }
            className="grid gap-3"
          >
            {Array.from({ length: pagesToShow }, (_, index) => (
              <Page
                key={`confirmation-page-${index + 1}`}
                pageNumber={index + 1}
                width={pageWidth}
                devicePixelRatio={canvasDevicePixelRatio}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              />
            ))}
          </Document>
        </div>
      )}
    </div>
  );
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
  const { appendixData, loading: appendixLoading } = useConfirmationAppendixData(planVersionId);
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

  return <ConfirmationPdfPageViewer url={blobUrl} filename="확정서.pdf" />;
}
