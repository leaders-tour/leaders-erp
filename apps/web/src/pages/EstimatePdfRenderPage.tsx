import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@tour/ui';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import type { EstimateDocumentData } from '../features/estimate/model/types';
import { API_BASE_URL } from '../lib/api-base-url';

interface RenderSessionResponse {
  data: EstimateDocumentData;
}

async function fetchRenderSession(token: string): Promise<EstimateDocumentData> {
  const response = await fetch(`${API_BASE_URL}/documents/estimate/render-sessions/${encodeURIComponent(token)}`, {
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

export function EstimatePdfRenderPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<EstimateDocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const token = searchParams.get('token');
  const includeStaticImagePages = searchParams.get('staticPages') !== 'none';
  const renderState = loading ? 'loading' : errorMessage ? 'error' : data ? 'ready' : 'idle';

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setData(null);
      setErrorMessage('렌더 토큰이 없습니다.');
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setErrorMessage(null);

    void fetchRenderSession(token)
      .then((nextData) => {
        if (cancelled) {
          return;
        }
        setData(nextData);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setData(null);
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

  return (
    <section
      className="estimate-print-root"
      data-estimate-render-state={renderState}
      data-estimate-error-message={errorMessage ?? ''}
    >
      {loading ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">문서 데이터를 준비 중입니다...</Card>
      ) : null}
      {!loading && errorMessage ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{errorMessage}</Card>
      ) : null}
      {!loading && !errorMessage && data ? <EstimateDocument data={data} includeStaticImagePages={includeStaticImagePages} /> : null}
    </section>
  );
}
