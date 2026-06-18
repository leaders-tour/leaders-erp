import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@tour/ui';
import { ConfirmationDocument } from '../features/confirmation/components/ConfirmationDocument';
import type { EstimateDocumentData } from '../features/estimate/model/types';
import type { MovementIntensityColorSetting } from '../features/estimate/model/movement-intensity';
import type { ConfirmationDocumentSnapshot } from '../features/confirmation/model/types';
import { snapshotToDocumentData } from '../features/confirmation/utils/format';
import { API_BASE_URL } from '../lib/api-base-url';

interface ConfirmationRenderSessionData {
  snapshot: ConfirmationDocumentSnapshot;
  appendixData: EstimateDocumentData | null;
  movementIntensityColors?: MovementIntensityColorSetting[] | null;
}

interface RenderSessionResponse {
  data: ConfirmationRenderSessionData;
}

async function fetchRenderSession(token: string): Promise<ConfirmationRenderSessionData> {
  const response = await fetch(`${API_BASE_URL}/documents/confirmation/render-sessions/${encodeURIComponent(token)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'PDF 렌더 데이터를 불러오지 못했습니다.';
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message || message;
    } catch (_error) {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as RenderSessionResponse;
  return payload.data;
}

async function waitForDocumentAssets(): Promise<void> {
  if ('fonts' in document && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const images = Array.from(
    document.querySelectorAll('.confirmation-document img, .estimate-document img'),
  ) as HTMLImageElement[];

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export function ConfirmationPdfRenderPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [sessionData, setSessionData] = useState<ConfirmationRenderSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [page1LayoutReady, setPage1LayoutReady] = useState(false);
  const token = searchParams.get('token');

  const handlePage1LayoutReady = useCallback(() => {
    setPage1LayoutReady(true);
  }, []);

  const renderState = loading
    ? 'loading'
    : errorMessage
      ? 'error'
      : sessionData && layoutReady && page1LayoutReady
        ? 'ready'
        : sessionData
          ? 'layout-pending'
          : 'idle';

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setSessionData(null);
      setErrorMessage('렌더 토큰이 없습니다.');
      setLoading(false);
      setLayoutReady(false);
      setPage1LayoutReady(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setErrorMessage(null);
    setLayoutReady(false);
    setPage1LayoutReady(false);

    void fetchRenderSession(token)
      .then((nextData) => {
        if (cancelled) {
          return;
        }
        setSessionData(nextData);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setSessionData(null);
        setErrorMessage(error instanceof Error ? error.message : 'PDF 렌더 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    if (!sessionData) {
      setLayoutReady(false);
      setPage1LayoutReady(false);
      return () => {
        cancelled = true;
      };
    }

    setLayoutReady(false);
    void waitForDocumentAssets()
      .then(() => {
        if (!cancelled) {
          setLayoutReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLayoutReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionData]);

  const previewData = sessionData ? snapshotToDocumentData(sessionData.snapshot) : null;

  return (
    <section
      className="confirmation-print-root"
      data-confirmation-render-state={renderState}
      data-confirmation-layout-ready={layoutReady ? 'true' : 'false'}
      data-confirmation-error-message={errorMessage ?? ''}
    >
      {loading ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">문서 데이터를 준비 중입니다...</Card>
      ) : null}
      {!loading && errorMessage ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{errorMessage}</Card>
      ) : null}
      {!loading && !errorMessage && previewData ? (
        <ConfirmationDocument
          data={previewData}
          appendixData={sessionData?.appendixData ?? null}
          appendixMovementIntensityColors={sessionData?.movementIntensityColors ?? null}
          viewMode="output"
          onPage1LayoutReady={handlePage1LayoutReady}
        />
      ) : null}
    </section>
  );
}
