import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { GRAPHQL_URL } from '../../lib/graphql-endpoint';

const PDF_PROXY_BASE = GRAPHQL_URL.replace(/\/graphql$/, '');

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPageViewerProps {
  url: string;
  filename: string;
}

export function PdfPageViewer({ url, filename }: PdfPageViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [useProxy, setUseProxy] = useState(false);
  const [fatalError, setFatalError] = useState(false);
  const [pageWidth, setPageWidth] = useState(640);
  const containerRef = useRef<HTMLDivElement>(null);

  const proxyUrl = `${PDF_PROXY_BASE}/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  const effectiveUrl = useProxy ? proxyUrl : url;
  const pagesToShow = numPages ? Math.min(numPages, 2) : 2;

  const canvasDevicePixelRatio =
    typeof window !== 'undefined'
      ? Math.min(3, Math.max(window.devicePixelRatio || 1, 2))
      : 2;

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
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-3 shrink-0 text-xs text-blue-600 hover:underline"
        >
          전체 열기 ↗
        </a>
      </div>
      {fatalError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <p className="font-medium">PDF를 렌더링할 수 없습니다.</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            새 탭에서 열기 ↗
          </a>
        </div>
      ) : (
        <div ref={containerRef} className="w-full min-w-0">
          <Document
            key={effectiveUrl}
            file={effectiveUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={handleLoadError}
            loading={
              <div className="flex items-center justify-center rounded-2xl bg-slate-100 py-16 text-sm text-slate-400">
                PDF 로딩 중...
              </div>
            }
            className="grid gap-3"
          >
            {Array.from({ length: pagesToShow }, (_, i) => (
              <div
                key={i + 1}
                className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
              >
                <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
                  {i + 1}페이지
                </p>
                <div className="flex justify-center overflow-x-auto bg-white">
                  <Page
                    pageNumber={i + 1}
                    width={pageWidth}
                    devicePixelRatio={canvasDevicePixelRatio}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </div>
              </div>
            ))}
          </Document>
        </div>
      )}
    </div>
  );
}
