import { Button, Card } from '@tour/ui';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmationPreviewPanel } from '../features/confirmation/components/ConfirmationPreviewPanel';
import { useAuth } from '../features/auth/context';
import { useEstimateSource } from '../features/estimate/hooks/use-estimate-source';
import { toSecurityDepositScope } from '../features/estimate/utils/format';
import {
  buildEffectivePricing,
  sliceEffectiveTotalsForUi,
} from '../features/pricing/manual-pricing';
import { customerFacingTotalsFromSnapshot } from '../features/pricing/customer-pricing-snapshot';
import {
  teamPricingsForSummaryDisplay,
  teamPricingSummarySignatureFromParts,
} from '../features/pricing/team-pricing-summary-display';
import { countMainPlanStopRows } from '../features/plan/plan-stop-row';
import {
  useConfirmedTrip,
  useConfirmedTripNotes,
  useCreateConfirmedTripNote,
  useUpdateConfirmedTripNote,
  useDeleteConfirmedTripNote,
  useUpdateConfirmedTrip,
  useCancelConfirmedTrip,
  type ConfirmedTripNoteRow,
  getTripStartDate,
  getTripEndDate,
  getTripLeaderName,
  getTripHeadcount,
  getTripDestination,
  getTripPickupDate,
  getTripDropDate,
  getTripExternalTransfers,
  getTripTransportGroupsForExternalTransfers,
  sortTripAssignments,
} from '../features/confirmed-trip/hooks';
import { listExternalTransferDetailRows } from '../features/plan/external-transfer';
import {
  formatPickupDropDisplay,
  formatTransportPickupDropLines,
  type TransportGroupLike,
} from '../features/plan/pickup-drop';
import { markConfirmedTripRecentlyReturned } from '../features/confirmed-trip/recent-return';
import { LodgingSection } from '../features/confirmed-trip/LodgingSection';
import { ConfirmedTripScheduleSection } from '../features/confirmed-trip/ConfirmedTripScheduleSection';
import { KoreaTeamStageMultiSelect } from '../features/confirmed-trip/KoreaTeamStageMultiSelect';
import { PostTripTaskMultiSelect } from '../features/confirmed-trip/PostTripTaskMultiSelect';
import { RecruitmentStatusToggle } from '../features/confirmed-trip/RecruitmentStatusToggle';
import { usePlanVersions, useUpdateUser, useUploadUserAttachment } from '../features/plan/hooks';
import { toVariantLabel } from '../features/plan/variant-label';
import { API_BASE_URL } from '../lib/api-base-url';
import { GRAPHQL_URL } from '../lib/graphql-endpoint';

/** pdf-proxy 엔드포인트 base (GRAPHQL_URL과 동일 서버) */
const PDF_PROXY_BASE = GRAPHQL_URL.replace(/\/graphql$/, '');

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface AttachmentItem {
  filename: string;
  url: string;
  type: string;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0] ?? '';
}

function parseNullableInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function PdfPageViewer({ url, filename }: { url: string; filename: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [useProxy, setUseProxy] = useState(false);
  const [fatalError, setFatalError] = useState(false);
  const [pageWidth, setPageWidth] = useState(640);
  const containerRef = useRef<HTMLDivElement>(null);

  const proxyUrl = `${PDF_PROXY_BASE}/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  const effectiveUrl = useProxy ? proxyUrl : url;
  const pagesToShow = numPages ? Math.min(numPages, 2) : 2;

  /** Hi-DPI: 캔버스 내부 해상도를 올려 Retina 등에서 뭉개짐 완화 */
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
        <p className="text-xs font-medium text-slate-500 truncate">{filename}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-blue-600 hover:underline ml-3"
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

type PdfJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

interface PdfJobResponse {
  jobId: string;
  status: PdfJobStatus;
}
interface PdfJobStatusResponse extends PdfJobResponse {
  ready: boolean;
  errorMessage?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function PlanPdfPreviewPanel({ planVersionId }: { planVersionId: string }) {
  const { data: estimateData, loading: estimateLoading } = useEstimateSource({
    mode: 'version',
    versionId: planVersionId,
    draftKey: null,
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
    if (!estimateData) return;
    let cancelled = false;
    setGenerating(true);
    setError(false);

    void (async () => {
      try {
        const jobRes = await authorizedFetch(`${API_BASE_URL}/documents/estimate/pdf-jobs`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ data: estimateData }),
        });
        if (!jobRes.ok || cancelled) return;
        const { jobId } = (await jobRes.json()) as PdfJobResponse;

        while (!cancelled) {
          const statusRes = await authorizedFetch(
            `${API_BASE_URL}/documents/estimate/pdf-jobs/${encodeURIComponent(jobId)}`,
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
          `${API_BASE_URL}/documents/estimate/pdf-jobs/${encodeURIComponent(jobId)}/download`,
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
  }, [estimateData, authorizedFetch]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (estimateLoading || generating) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 py-16 text-sm text-slate-400">
        견적서 PDF 생성 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        견적서 PDF를 생성할 수 없습니다.
      </div>
    );
  }

  if (!blobUrl) return null;

  return <PdfPageViewer url={blobUrl} filename="견적서.pdf" />;
}

function AttachmentsCard({ attachments }: { attachments: AttachmentItem[] }) {
  const [preview, setPreview] = useState<AttachmentItem | null>(null);

  const images = attachments.filter((a) => a.type === 'image');
  const pdfs = attachments.filter((a) => a.type === 'pdf');

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">첨부파일</h2>

      {/* 이미지 그리드 */}
      {images.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
            이미지 ({images.length})
          </p>
          <div className="flex flex-wrap gap-3">
            {images.map((att) => (
              <button
                key={att.url}
                onClick={() => setPreview(preview?.url === att.url ? null : att)}
                className="relative overflow-hidden rounded-xl border border-slate-200 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                title={att.filename}
              >
                <img
                  src={att.url}
                  alt={att.filename}
                  className="h-28 w-28 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                {preview?.url === att.url && (
                  <div className="absolute inset-0 bg-blue-500/20 ring-2 ring-blue-500 rounded-xl" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF 목록 */}
      {pdfs.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
            PDF ({pdfs.length})
          </p>
          <ul className="grid gap-1.5">
            {pdfs.map((att) => (
              <li key={att.url}>
                <button
                  onClick={() => setPreview(preview?.url === att.url ? null : att)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-sm text-left transition-colors
                    ${
                      preview?.url === att.url
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-100 hover:border-slate-300 text-slate-700'
                    }`}
                >
                  <span className="text-base shrink-0">📄</span>
                  <span className="flex-1 truncate font-medium">{att.filename}</span>
                  <span className="text-xs text-slate-400">
                    {preview?.url === att.url ? '▲ 닫기' : '▼ 미리보기'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 인라인 미리보기 */}
      {preview && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
            <p className="truncate text-xs font-medium text-slate-600">{preview.filename}</p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                새 탭으로 열기 ↗
              </a>
              <button
                onClick={() => setPreview(null)}
                className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          </div>
          {preview.type === 'image' ? (
            <div className="flex justify-center p-4 bg-slate-100">
              <img
                src={preview.url}
                alt={preview.filename}
                className="max-h-[600px] max-w-full rounded-lg object-contain shadow"
              />
            </div>
          ) : (
            <iframe src={preview.url} title={preview.filename} className="h-[700px] w-full" />
          )}
        </div>
      )}
    </Card>
  );
}

const currencyFormatter = new Intl.NumberFormat('ko-KR');
function formatKrw(value: number): string {
  return `${currencyFormatter.format(value)}원`;
}

interface AmountCardTeamPricing {
  teamOrderIndex: number;
  teamName: string;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitKrw: number;
  securityDepositScope: string;
}

function amountCardTeamPricingSignature(row: AmountCardTeamPricing): string {
  return teamPricingSummarySignatureFromParts({
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw: row.depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    securityNone: row.securityDepositScope === '-',
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityDepositUnitKrw: row.securityDepositUnitKrw,
    securityScopeWhenPresent: row.securityDepositScope === '-' ? '' : row.securityDepositScope,
  });
}

function formatSecurityDepositForCard(
  row: Pick<
    AmountCardTeamPricing,
    'securityDepositAmountKrw' | 'securityDepositUnitKrw' | 'securityDepositScope'
  >,
): string {
  if (row.securityDepositScope !== '-') {
    return `${formatKrw(row.securityDepositUnitKrw)} (${row.securityDepositScope})`;
  }
  return formatKrw(row.securityDepositAmountKrw);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR');
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR');
}

const CONFIRMED_TRIP_NOTES_EXPANDED_STORAGE_KEY = 'confirmedTripNotes.expanded';

function readConfirmedTripNotesExpandedPreference(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(CONFIRMED_TRIP_NOTES_EXPANDED_STORAGE_KEY) !== 'false';
}

function ConfirmedTripNotesCard({ tripId }: { tripId: string }): JSX.Element {
  const { employee } = useAuth();
  const { notes, loading, refetch } = useConfirmedTripNotes(tripId);
  const { createConfirmedTripNote, loading: creating } = useCreateConfirmedTripNote();
  const { updateConfirmedTripNote, loading: updating } = useUpdateConfirmedTripNote();
  const { deleteConfirmedTripNote, loading: deleting } = useDeleteConfirmedTripNote();
  const [content, setContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(readConfirmedTripNotesExpandedPreference);
  const currentEmployeeInitial = employee?.name?.trim().slice(0, 1) || '?';
  const displayNotes = [...notes].reverse();

  const handleToggleExpanded = () => {
    setIsExpanded((current) => {
      const next = !current;
      window.localStorage.setItem(CONFIRMED_TRIP_NOTES_EXPANDED_STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleCreate = async () => {
    const nextContent = content.trim();
    if (!nextContent) {
      setErrorMessage('노트 내용을 입력해주세요.');
      return;
    }

    setErrorMessage(null);
    try {
      await createConfirmedTripNote({ confirmedTripId: tripId, content: nextContent });
      setContent('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '노트 저장에 실패했습니다.');
    }
  };

  const startEdit = (note: ConfirmedTripNoteRow) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setErrorMessage(null);
  };

  const handleUpdate = async (noteId: string) => {
    const nextContent = editingContent.trim();
    if (!nextContent) {
      setErrorMessage('노트 내용을 입력해주세요.');
      return;
    }

    setErrorMessage(null);
    try {
      await updateConfirmedTripNote(noteId, nextContent);
      setEditingNoteId(null);
      setEditingContent('');
      await refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '노트 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('이 노트를 삭제하시겠습니까?')) return;

    setErrorMessage(null);
    try {
      await deleteConfirmedTripNote(noteId);
      await refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '노트 삭제에 실패했습니다.');
    }
  };

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm">
      <div className="flex items-center justify-between gap-3 rounded-t-3xl bg-slate-700 px-5 py-3.5 text-white">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">댓글</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-slate-50">
            {notes.length}개
          </span>
          <button
            type="button"
            onClick={handleToggleExpanded}
            aria-expanded={isExpanded}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-slate-50 transition hover:bg-white/25"
          >
            {isExpanded ? '접기' : '펼치기'}
          </button>
        </div>
      </div>

      {isExpanded ? (
      <div className="grid gap-4 bg-slate-50 px-4 py-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
            {currentEmployeeInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <span className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 border-b border-l border-slate-200 bg-white" />
              <textarea
                rows={3}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="댓글을 입력하세요."
                className="min-h-20 w-full resize-y border-0 bg-transparent p-0 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
              />
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                <p className="truncate text-xs text-slate-500">{employee?.name ?? '-'}</p>
                <Button type="button" variant="primary" disabled={creating} onClick={handleCreate}>
                  {creating ? '등록 중...' : '등록'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        ) : null}

        {loading ? <p className="text-sm text-slate-500">노트를 불러오는 중...</p> : null}

        <div className="relative grid gap-3 pl-2">
          {notes.length > 0 ? <span className="absolute bottom-2 left-[1.125rem] top-2 w-px bg-slate-200" /> : null}

          {!loading && notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              아직 작성된 노트가 없습니다.
            </div>
          ) : null}

          {displayNotes.map((note) => {
            const isAuthor = employee?.id === note.createdByEmployeeId;
            const isEditing = editingNoteId === note.id;
            const authorInitial = note.createdByName.trim().slice(0, 1) || '?';
            return (
              <div key={note.id} className="relative flex gap-3">
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-slate-50 ${
                    isAuthor ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {authorInitial}
                </div>
                <div
                  className={`min-w-0 flex-1 rounded-2xl border p-3 shadow-sm ${
                    isAuthor ? 'border-blue-100 bg-blue-50/80' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{note.createdByName}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(note.createdAt)}</p>
                    </div>
                    {isAuthor ? (
                      <div className="flex shrink-0 gap-2">
                        {isEditing ? null : (
                          <button
                            type="button"
                            className="text-xs font-medium text-blue-700 hover:underline"
                            onClick={() => startEdit(note)}
                          >
                            수정
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-xs font-medium text-rose-600 hover:underline disabled:text-rose-300"
                          disabled={deleting}
                          onClick={() => handleDelete(note.id)}
                        >
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="grid gap-2">
                      <textarea
                        rows={3}
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingContent('');
                          }}
                        >
                          취소
                        </Button>
                        <Button type="button" variant="primary" disabled={updating} onClick={() => handleUpdate(note.id)}>
                          {updating ? '저장 중...' : '저장'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{note.content}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      ) : null}
    </Card>
  );
}

/** 인라인 수정 가능 필드 옆 표시용 (글쓰기/수정) */
function InlineWriteIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function ConfirmedTripDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const handleGoBack = useCallback(() => {
    if (tripId) markConfirmedTripRecentlyReturned(tripId);
    navigate(-1);
  }, [navigate, tripId]);
  useEffect(() => {
    if (!tripId) return;
    const onPopState = () => {
      queueMicrotask(() => {
        const normPath = window.location.pathname.replace(/\/+$/, '') || '/';
        if (normPath === '/confirmed-trips') {
          markConfirmedTripRecentlyReturned(tripId);
        }
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [tripId]);
  const { trip, loading } = useConfirmedTrip(tripId);
  const { versions: planVersions, loading: planVersionsLoading } = usePlanVersions(trip?.planId ?? undefined);
  const sortedPlanVersions = useMemo(
    () => [...planVersions].sort((a, b) => b.versionNumber - a.versionNumber),
    [planVersions],
  );
  const { updateConfirmedTrip } = useUpdateConfirmedTrip();
  const { cancelConfirmedTrip, loading: cancelling } = useCancelConfirmedTrip();

  // 픽드랍 — 독립 상태
  const [pickupDateEdit, setPickupDateEdit] = useState<string>('');
  const [dropDateEdit, setDropDateEdit] = useState<string>('');
  const [pickupDropEditing, setPickupDropEditing] = useState(false);
  const [pickupDropSaving, setPickupDropSaving] = useState(false);

  const [reservationDateEditing, setReservationDateEditing] = useState(false);
  const [reservationDateDraft, setReservationDateDraft] = useState('');
  const [reservationDateSaving, setReservationDateSaving] = useState(false);

  const [openChatUrlEditing, setOpenChatUrlEditing] = useState(false);
  const [openChatUrlDraft, setOpenChatUrlDraft] = useState('');
  const [openChatUrlSaving, setOpenChatUrlSaving] = useState(false);
  const [recruitmentSaving, setRecruitmentSaving] = useState(false);

  const { updateUser } = useUpdateUser();
  const { uploadUserAttachment, loading: uploadingUserAttachment } = useUploadUserAttachment();

  const [migrationEditChoiceOpen, setMigrationEditChoiceOpen] = useState(false);
  const [planTripEditChoiceOpen, setPlanTripEditChoiceOpen] = useState(false);
  const [selectedSwitchVersionId, setSelectedSwitchVersionId] = useState<string | null>(null);
  const [planVersionSwitchSaving, setPlanVersionSwitchSaving] = useState(false);
  const [directEditOpen, setDirectEditOpen] = useState(false);
  const [directEditSaving, setDirectEditSaving] = useState(false);
  const [mTravelStart, setMTravelStart] = useState('');
  const [mTravelEnd, setMTravelEnd] = useState('');
  const [mPickup, setMPickup] = useState('');
  const [mDrop, setMDrop] = useState('');
  const [mDestination, setMDestination] = useState('');
  const [mPaxCount, setMPaxCount] = useState('');
  const [mRentalGear, setMRentalGear] = useState(false);
  const [mRentalDrone, setMRentalDrone] = useState(false);
  const [mRentalStarlink, setMRentalStarlink] = useState(false);
  const [mRentalPowerbank, setMRentalPowerbank] = useState(false);
  const [mRecruiting, setMRecruiting] = useState(false);
  const [mDeposit, setMDeposit] = useState('');
  const [mBalance, setMBalance] = useState('');
  const [mTotal, setMTotal] = useState('');
  const [mSecurityDeposit, setMSecurityDeposit] = useState('');
  const [mGroupTotal, setMGroupTotal] = useState('');
  const [mOpenChatUrl, setMOpenChatUrl] = useState('');
  const [mAttachments, setMAttachments] = useState<AttachmentItem[]>([]);

  const planVersionForPricing = trip?.planVersion ?? null;
  const planVersionPricingRaw = planVersionForPricing?.pricing ?? null;
  const effectivePlanPricing = useMemo(() => {
    if (!planVersionForPricing || !planVersionPricingRaw) return null;
    const counted = countMainPlanStopRows(planVersionForPricing.planStops ?? []);
    const totalDays =
      counted > 0
        ? counted
        : planVersionForPricing.totalDays > 0
          ? planVersionForPricing.totalDays
          : 1;
    return buildEffectivePricing(
      planVersionPricingRaw,
      { headcountTotal: planVersionForPricing.meta?.headcountTotal ?? 0, totalDays },
      planVersionPricingRaw.manualPricing ?? null,
      planVersionPricingRaw.savedManualDepositAmountKrw ?? undefined,
    );
  }, [planVersionForPricing, planVersionPricingRaw]);

  const effectiveTotalsForCard = useMemo(() => {
    const snap = planVersionPricingRaw?.manualPricing?.customerPricingSnapshot ?? null;
    if (snap) {
      return customerFacingTotalsFromSnapshot(snap);
    }
    return effectivePlanPricing ? sliceEffectiveTotalsForUi(effectivePlanPricing) : null;
  }, [planVersionPricingRaw?.manualPricing?.customerPricingSnapshot, effectivePlanPricing]);

  const amountCardTeamPricings = useMemo<AmountCardTeamPricing[]>(() => {
    const snapRows = planVersionPricingRaw?.manualPricing?.customerPricingSnapshot?.teamPricings ?? [];
    if (snapRows.length > 0) {
      return snapRows.map((row) => ({
        teamOrderIndex: row.teamOrderIndex,
        teamName: row.teamName,
        totalAmountKrw: row.totalAmountKrw,
        depositAmountKrw: row.depositAmountKrw,
        balanceAmountKrw: row.balanceAmountKrw,
        securityDepositAmountKrw: row.securityDepositAmountKrw,
        securityDepositUnitKrw: row.securityDepositUnitKrw,
        securityDepositScope: row.securityDepositScope,
      }));
    }

    return (effectivePlanPricing?.teamPricings ?? []).map((row) => ({
      teamOrderIndex: row.teamOrderIndex,
      teamName: row.teamName,
      totalAmountKrw: row.totalAmountKrw,
      depositAmountKrw: row.depositAmountKrw,
      balanceAmountKrw: row.balanceAmountKrw,
      securityDepositAmountKrw: row.securityDepositAmountKrw,
      securityDepositUnitKrw: row.securityDepositUnitPriceKrw,
      securityDepositScope: toSecurityDepositScope(row.securityDepositMode),
    }));
  }, [planVersionPricingRaw?.manualPricing?.customerPricingSnapshot?.teamPricings, effectivePlanPricing?.teamPricings]);

  const amountCardTeamPricingsForDisplay = useMemo(() => {
    if (planVersionPricingRaw?.manualPricing?.expandTeamPricingSummaryRows === true) {
      return amountCardTeamPricings;
    }
    return teamPricingsForSummaryDisplay(amountCardTeamPricings, amountCardTeamPricingSignature);
  }, [amountCardTeamPricings, planVersionPricingRaw?.manualPricing?.expandTeamPricingSummaryRows]);

  const amountCardShowTeamPrefix = amountCardTeamPricingsForDisplay.length > 1;

  const externalPickDropRowsPickup = useMemo(() => {
    if (!trip) return [];
    return listExternalTransferDetailRows(
      getTripExternalTransfers(trip),
      getTripTransportGroupsForExternalTransfers(trip),
      'PICKUP',
    );
  }, [trip]);

  const externalPickDropRowsDrop = useMemo(() => {
    if (!trip) return [];
    return listExternalTransferDetailRows(
      getTripExternalTransfers(trip),
      getTripTransportGroupsForExternalTransfers(trip),
      'DROP',
    );
  }, [trip]);

  const basicPickupDisplay = useMemo(() => {
    if (!trip) return '-';
    const meta = trip.planVersion?.meta;
    const groups = meta?.transportGroups ?? [];
    if (groups.length > 0) {
      const asLike: TransportGroupLike[] = groups.map((g) => ({
        teamName: g.teamName,
        headcount: g.headcount,
        flightInDate: g.flightInDate,
        flightInTime: g.flightInTime,
        flightOutDate: g.flightOutDate,
        flightOutTime: g.flightOutTime,
        pickupDate: g.pickupDate,
        pickupTime: g.pickupTime,
        pickupPlaceType: g.pickupPlaceType ?? undefined,
        pickupPlaceCustomText: g.pickupPlaceCustomText,
        dropDate: g.dropDate,
        dropTime: g.dropTime,
        dropPlaceType: g.dropPlaceType ?? undefined,
        dropPlaceCustomText: g.dropPlaceCustomText,
      }));
      return formatTransportPickupDropLines(asLike, 'pickup');
    }
    if (meta) {
      return formatPickupDropDisplay(
        meta.pickupDate,
        meta.pickupTime,
        meta.pickupPlaceType,
        meta.pickupPlaceCustomText,
      );
    }
    const d = getTripPickupDate(trip);
    return d ? formatDate(d) : '-';
  }, [trip]);

  const basicDropDisplay = useMemo(() => {
    if (!trip) return '-';
    const meta = trip.planVersion?.meta;
    const groups = meta?.transportGroups ?? [];
    if (groups.length > 0) {
      const asLike: TransportGroupLike[] = groups.map((g) => ({
        teamName: g.teamName,
        headcount: g.headcount,
        flightInDate: g.flightInDate,
        flightInTime: g.flightInTime,
        flightOutDate: g.flightOutDate,
        flightOutTime: g.flightOutTime,
        pickupDate: g.pickupDate,
        pickupTime: g.pickupTime,
        pickupPlaceType: g.pickupPlaceType ?? undefined,
        pickupPlaceCustomText: g.pickupPlaceCustomText,
        dropDate: g.dropDate,
        dropTime: g.dropTime,
        dropPlaceType: g.dropPlaceType ?? undefined,
        dropPlaceCustomText: g.dropPlaceCustomText,
      }));
      return formatTransportPickupDropLines(asLike, 'drop');
    }
    if (meta) {
      return formatPickupDropDisplay(
        meta.dropDate,
        meta.dropTime,
        meta.dropPlaceType,
        meta.dropPlaceCustomText,
      );
    }
    const d = getTripDropDate(trip);
    return d ? formatDate(d) : '-';
  }, [trip]);

  if (!tripId) {
    return (
      <section className="grid gap-4 py-8">
        <Button variant="outline" type="button" className="w-fit" onClick={handleGoBack}>
          ← 뒤로가기
        </Button>
        <p className="text-sm text-slate-600">잘못된 접근입니다.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="grid gap-4 py-8">
        <Button variant="outline" type="button" className="w-fit" onClick={handleGoBack}>
          ← 뒤로가기
        </Button>
        <p className="text-sm text-slate-600">불러오는 중...</p>
      </section>
    );
  }

  if (!trip) {
    return (
      <section className="grid gap-4 py-8">
        <Button variant="outline" type="button" className="w-fit" onClick={handleGoBack}>
          ← 뒤로가기
        </Button>
        <p className="text-sm text-slate-600">확정 건을 찾을 수 없습니다.</p>
      </section>
    );
  }

  const meta = trip.planVersion?.meta ?? null;
  const pricing = trip.planVersion?.pricing ?? null;

  const travelStartDate = trip.planVersion?.meta?.travelStartDate ?? trip.travelStart ?? null;
  const totalDays = (() => {
    if (trip.planVersion?.totalDays) return trip.planVersion.totalDays;
    const s = trip.planVersion?.meta?.travelStartDate ?? trip.travelStart;
    const e = trip.planVersion?.meta?.travelEndDate ?? trip.travelEnd;
    if (s && e) {
      const diff = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000);
      // travelEnd는 마지막 일차 날짜(일정 빌더와 동일) → 포함 일수 = 차이 + 1
      return diff > 0 ? diff + 1 : null;
    }
    return null;
  })();

  const handleCancel = async () => {
    if (!window.confirm('정말 이 확정 건을 취소하시겠습니까?')) return;
    try {
      await cancelConfirmedTrip(tripId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '취소에 실패했습니다.');
    }
  };

  const startPickupDropEdit = () => {
    const toDateInputValue = (iso: string | null) => {
      if (!iso) return '';
      return iso.split('T')[0] ?? '';
    };
    setPickupDateEdit(toDateInputValue(getTripPickupDate(trip)));
    setDropDateEdit(toDateInputValue(getTripDropDate(trip)));
    setPickupDropEditing(true);
  };

  const handlePickupDropSave = async () => {
    setPickupDropSaving(true);
    try {
      await updateConfirmedTrip(tripId, {
        pickupDate: pickupDateEdit || null,
        dropDate: dropDateEdit || null,
      });
      setPickupDropEditing(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setPickupDropSaving(false);
    }
  };

  const handleReservationDateSave = async () => {
    if (!reservationDateDraft.trim()) {
      setReservationDateEditing(false);
      return;
    }
    const prev = toDateInputValue(trip.confirmedAt);
    if (reservationDateDraft === prev) {
      setReservationDateEditing(false);
      return;
    }
    setReservationDateSaving(true);
    try {
      await updateConfirmedTrip(tripId, {
        confirmedAt: `${reservationDateDraft}T00:00:00.000Z`,
      });
      setReservationDateEditing(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setReservationDateSaving(false);
    }
  };

  const handleOpenChatUrlSave = async () => {
    const next = openChatUrlDraft.trim() || null;
    const prev = trip.openChatUrl?.trim() || null;
    if (next === prev) {
      setOpenChatUrlEditing(false);
      return;
    }
    if (next) {
      try {
        const u = new URL(next);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          window.alert('http(s) URL만 입력할 수 있습니다.');
          return;
        }
      } catch {
        window.alert('올바른 URL 형식이 아닙니다.');
        return;
      }
    }
    setOpenChatUrlSaving(true);
    try {
      await updateConfirmedTrip(tripId, { openChatUrl: next });
      setOpenChatUrlEditing(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setOpenChatUrlSaving(false);
    }
  };

  const pdfAttachments = (trip.user.attachments ?? []).filter((a) => a.type === 'pdf');
  const publishedConfirmation = trip.latestPublishedConfirmationDocument ?? null;
  const isPlanTrip = !!(trip.planId && trip.planVersionId);
  const hasPdf = pdfAttachments.length > 0;
  const showRightPanel = !!publishedConfirmation || isPlanTrip || hasPdf;

  const openPlanTripEditChoice = () => {
    setSelectedSwitchVersionId(null);
    setPlanTripEditChoiceOpen(true);
  };

  const closePlanTripEditChoice = () => {
    setPlanTripEditChoiceOpen(false);
    setSelectedSwitchVersionId(null);
  };

  const handleApplyPlanVersionSwitch = async () => {
    if (!selectedSwitchVersionId || selectedSwitchVersionId === trip.planVersionId) return;
    if (
      !window.confirm(
        '선택한 견적 버전으로 연결만 바뀝니다. 기사·숙소·가이드·운영 일정·오픈채팅·예약일 등 확정 건에 입력한 운영 정보는 그대로 유지됩니다. 진행할까요?',
      )
    ) {
      return;
    }
    setPlanVersionSwitchSaving(true);
    try {
      await updateConfirmedTrip(trip.id, { planVersionId: selectedSwitchVersionId });
      closePlanTripEditChoice();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setPlanVersionSwitchSaving(false);
    }
  };

  const handleOpenItineraryBuilderForNewVersion = () => {
    if (
      !window.confirm(
        '확정 견적의 일정을 바꾸려면 일정 빌더에서 새 버전을 만듭니다. 저장 시 이 확정 건이 가리키는 견적 버전만 바뀌며, 기존에 입력한 숙소·운영 배정은 그대로 둡니다. 계속할까요?',
      )
    ) {
      return;
    }
    closePlanTripEditChoice();
    const params = new URLSearchParams({
      userId: trip.userId,
      planId: trip.planId!,
      parentVersionId: trip.planVersionId!,
      confirmedTripId: trip.id,
      changeNote: '확정 일정 수정',
    });
    navigate(`/itinerary-builder?${params.toString()}`);
  };

  const openDirectEditModal = () => {
    setMTravelStart(toDateInputValue(getTripStartDate(trip)));
    setMTravelEnd(toDateInputValue(getTripEndDate(trip)));
    setMPickup(toDateInputValue(getTripPickupDate(trip)));
    setMDrop(toDateInputValue(getTripDropDate(trip)));
    setMDestination(getTripDestination(trip) || '');
    setMPaxCount(getTripHeadcount(trip) != null ? String(getTripHeadcount(trip)) : '');
    setMRentalGear(trip.rentalGear);
    setMRentalDrone(trip.rentalDrone);
    setMRentalStarlink(trip.rentalStarlink);
    setMRentalPowerbank(trip.rentalPowerbank);
    setMRecruiting(trip.isRecruitingOpen);
    setMDeposit(trip.depositAmountKrw != null ? String(trip.depositAmountKrw) : '');
    setMBalance(trip.balanceAmountKrw != null ? String(trip.balanceAmountKrw) : '');
    setMTotal(trip.totalAmountKrw != null ? String(trip.totalAmountKrw) : '');
    setMSecurityDeposit(
      trip.securityDepositAmountKrw != null ? String(trip.securityDepositAmountKrw) : '',
    );
    setMGroupTotal(trip.groupTotalAmountKrw != null ? String(trip.groupTotalAmountKrw) : '');
    setMOpenChatUrl(trip.openChatUrl ?? '');
    setMAttachments((trip.user.attachments ?? []).map((a) => ({ ...a })));
    setDirectEditOpen(true);
  };

  const handleDirectEditSave = async () => {
    setDirectEditSaving(true);
    try {
      await updateConfirmedTrip(tripId, {
        travelStart: mTravelStart.trim() || null,
        travelEnd: mTravelEnd.trim() || null,
        pickupDate: mPickup.trim() || null,
        dropDate: mDrop.trim() || null,
        destination: mDestination.trim() || null,
        paxCount: parseNullableInt(mPaxCount),
        rentalGear: mRentalGear,
        rentalDrone: mRentalDrone,
        rentalStarlink: mRentalStarlink,
        rentalPowerbank: mRentalPowerbank,
        isRecruitingOpen: mRecruiting,
        depositAmountKrw: parseNullableInt(mDeposit),
        balanceAmountKrw: parseNullableInt(mBalance),
        totalAmountKrw: parseNullableInt(mTotal),
        securityDepositAmountKrw: parseNullableInt(mSecurityDeposit),
        groupTotalAmountKrw: parseNullableInt(mGroupTotal),
        openChatUrl: mOpenChatUrl.trim() || null,
      });

      await updateUser(
        trip.user.id,
        {
          attachments: mAttachments.map((a) => ({
            filename: a.filename,
            url: a.url,
            type: (a.type === 'pdf' ? 'pdf' : 'image') as 'pdf' | 'image',
          })),
        },
        { refetchConfirmedTripId: tripId },
      );
      setDirectEditOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setDirectEditSaving(false);
    }
  };

  return (
    <section className="grid gap-6">
      <div>
        <Button variant="outline" type="button" className="w-fit" onClick={handleGoBack}>
          ← 뒤로가기
        </Button>
      </div>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {getTripLeaderName(trip)}
          </h1>
          {trip.plan && trip.planVersion ? (
            <p className="mt-1 text-sm text-slate-600">
              {trip.plan.title} · v{trip.planVersion.versionNumber} · {trip.plan.regionSet.name}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">노션 마이그레이션 데이터</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              markConfirmedTripRecentlyReturned(trip.id);
              navigate('/confirmed-trips');
            }}
          >
            목록으로
          </Button>
          {trip.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              onClick={() => navigate(`/confirmed-trips/${trip.id}/confirmation-builder`)}
            >
              {publishedConfirmation ? '확정서 수정' : '확정서 만들기'}
            </Button>
          ) : null}
          {trip.planId && trip.planVersionId ? (
            <Button
              variant="outline"
              onClick={() => navigate(`/plans/${trip.planId}/versions/${trip.planVersionId}`)}
            >
              견적서 상세
            </Button>
          ) : null}
          {trip.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              onClick={() => {
                if (isPlanTrip) {
                  openPlanTripEditChoice();
                  return;
                }
                setMigrationEditChoiceOpen(true);
              }}
            >
              수정
            </Button>
          ) : null}
          {trip.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              disabled={cancelling}
              onClick={handleCancel}
            >
              확정 취소
            </Button>
          ) : null}
        </div>
      </header>

      <div className={showRightPanel ? 'grid grid-cols-2 gap-6 items-start' : 'grid gap-6'}>
        <div className="grid gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">여행 정보</h2>
              <div className="grid gap-3 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">대표자</span>
                    <p className="font-medium">{getTripLeaderName(trip)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">여행지</span>
                    <p className="font-medium">{getTripDestination(trip)}</p>
                  </div>
                </div>
                <div>
                  <span className="block text-slate-500">예약일</span>
                  {trip.status === 'ACTIVE' ? (
                    reservationDateEditing ? (
                      <input
                        type="date"
                        className="mt-1 block max-w-[11rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-800"
                        value={reservationDateDraft}
                        disabled={reservationDateSaving}
                        onChange={(e) => setReservationDateDraft(e.target.value)}
                        onBlur={() => {
                          void handleReservationDateSave();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === 'Escape') {
                            setReservationDateEditing(false);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div className="mt-0.5 flex w-max max-w-full items-center gap-0">
                        <button
                          type="button"
                          className="text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                          onClick={() => {
                            setReservationDateDraft(toDateInputValue(trip.confirmedAt));
                            setReservationDateEditing(true);
                          }}
                        >
                          {formatDate(trip.confirmedAt)}
                        </button>
                        <button
                          type="button"
                          className="-ml-0.5 inline-flex shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          aria-label="예약일 수정"
                          onClick={() => {
                            setReservationDateDraft(toDateInputValue(trip.confirmedAt));
                            setReservationDateEditing(true);
                          }}
                        >
                          <InlineWriteIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="mt-0.5 font-medium">{formatDate(trip.confirmedAt)}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">여행기간</span>
                    <p className="font-medium">
                      {(() => {
                        const s = getTripStartDate(trip);
                        const e = getTripEndDate(trip);
                        return s && e ? `${formatDate(s)} ~ ${formatDate(e)}` : '-';
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">인원</span>
                    <p className="font-medium">
                      {meta
                        ? `${meta.headcountTotal}명 (남 ${meta.headcountMale} / 여 ${meta.headcountFemale})`
                        : getTripHeadcount(trip) != null
                          ? `${getTripHeadcount(trip)}명`
                          : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="block text-slate-500">모집 상태</span>
                  <div className="mt-1">
                    <RecruitmentStatusToggle
                      open={trip.isRecruitingOpen}
                      disabled={trip.status !== 'ACTIVE'}
                      saving={recruitmentSaving}
                      onToggle={async (nextOpen) => {
                        setRecruitmentSaving(true);
                        try {
                          await updateConfirmedTrip(trip.id, {
                            isRecruitingOpen: nextOpen,
                          });
                        } catch (error) {
                          window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
                        } finally {
                          setRecruitmentSaving(false);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">차량</span>
                    <p className="font-medium">
                      {meta?.vehicleType ?? trip.assignedVehicle ?? '-'}
                    </p>
                  </div>
                  {trip.planVersion ? (
                    <div>
                      <span className="text-slate-500">일수</span>
                      <p className="font-medium">{trip.planVersion.totalDays}일</p>
                    </div>
                  ) : null}
                </div>
                {meta?.documentNumber ? (
                  <div>
                    <span className="text-slate-500">문서번호</span>
                    <p className="font-medium">{meta.documentNumber}</p>
                  </div>
                ) : null}
                <div>
                  <span className="block text-slate-500">한국팀 진행단계</span>
                  <div className="mt-1">
                    <KoreaTeamStageMultiSelect
                      selected={trip.koreaTeamStages}
                      disabled={trip.status !== 'ACTIVE'}
                      onChange={async (optionIds) => {
                        await updateConfirmedTrip(trip.id, {
                          koreaTeamStageOptionIds: optionIds,
                        });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-slate-500">종료 후 안내</span>
                  <div className="mt-1">
                    <PostTripTaskMultiSelect
                      selected={trip.postTripTasks}
                      disabled={trip.status !== 'ACTIVE'}
                      onChange={async (optionIds) => {
                        await updateConfirmedTrip(trip.id, {
                          postTripTaskOptionIds: optionIds,
                        });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-slate-500">오픈채팅 링크</span>
                  {trip.status === 'ACTIVE' ? (
                    openChatUrlEditing ? (
                      <input
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="https://open.kakao.com/..."
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-800"
                        value={openChatUrlDraft}
                        disabled={openChatUrlSaving}
                        onChange={(e) => setOpenChatUrlDraft(e.target.value)}
                        onBlur={() => {
                          void handleOpenChatUrlSave();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === 'Escape') {
                            setOpenChatUrlEditing(false);
                            setOpenChatUrlDraft(trip.openChatUrl ?? '');
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        {trip.openChatUrl ? (
                          <>
                            <span className="inline-flex max-w-full flex-wrap items-baseline gap-0">
                              <button
                                type="button"
                                className="max-w-full break-all text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                                onClick={() => {
                                  setOpenChatUrlDraft(trip.openChatUrl ?? '');
                                  setOpenChatUrlEditing(true);
                                }}
                              >
                                {trip.openChatUrl}
                              </button>
                              <button
                                type="button"
                                className="-ml-0.5 inline-flex shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                aria-label="오픈채팅 링크 수정"
                                onClick={() => {
                                  setOpenChatUrlDraft(trip.openChatUrl ?? '');
                                  setOpenChatUrlEditing(true);
                                }}
                              >
                                <InlineWriteIcon className="h-4 w-4" />
                              </button>
                            </span>
                            <a
                              href={trip.openChatUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-sm font-medium text-emerald-700 underline decoration-emerald-700/30 hover:decoration-emerald-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              새 탭에서 열기
                            </a>
                          </>
                        ) : (
                          <span className="inline-flex items-baseline gap-0">
                            <button
                              type="button"
                              className="font-medium text-slate-900 underline-offset-2 hover:underline"
                              onClick={() => {
                                setOpenChatUrlDraft('');
                                setOpenChatUrlEditing(true);
                              }}
                            >
                              등록하기
                            </button>
                            <button
                              type="button"
                              className="-ml-0.5 inline-flex shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              aria-label="오픈채팅 링크 수정"
                              onClick={() => {
                                setOpenChatUrlDraft('');
                                setOpenChatUrlEditing(true);
                              }}
                            >
                              <InlineWriteIcon className="h-4 w-4" />
                            </button>
                          </span>
                        )}
                      </div>
                    )
                  ) : (
                    <p className="mt-0.5 font-medium">
                      {trip.openChatUrl ? (
                        <a
                          href={trip.openChatUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:decoration-emerald-700 break-all"
                        >
                          {trip.openChatUrl}
                        </a>
                      ) : (
                        '-'
                      )}
                    </p>
                  )}
                </div>
                {meta?.specialNote ? (
                  <div>
                    <span className="text-slate-500">특이사항</span>
                    <p className="whitespace-pre-wrap font-medium">{meta.specialNote}</p>
                  </div>
                ) : null}
                {meta?.includeRentalItems ? (
                  <div>
                    <span className="text-slate-500">대여물품</span>
                    <p className="whitespace-pre-wrap font-medium">{meta.rentalItemsText}</p>
                  </div>
                ) : null}
                {meta?.remark ? (
                  <div>
                    <span className="text-slate-500">비고</span>
                    <p className="whitespace-pre-wrap font-medium">{meta.remark}</p>
                  </div>
                ) : null}
                {/* 노션 마이그레이션 데이터 전용 대여 정보 */}
                {!meta &&
                (trip.rentalGear ||
                  trip.rentalDrone ||
                  trip.rentalStarlink ||
                  trip.rentalPowerbank) ? (
                  <div>
                    <span className="text-slate-500">대여 항목</span>
                    <p className="font-medium">
                      {[
                        trip.rentalGear && '물품',
                        trip.rentalDrone && '드론',
                        trip.rentalStarlink && '스타링크',
                        trip.rentalPowerbank && '파워뱅크',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">금액 정보</h2>
              {pricing ? (
                amountCardTeamPricingsForDisplay.length > 0 ? (
                  <div className="grid gap-3 text-sm text-slate-700">
                    {amountCardTeamPricingsForDisplay.map((row) => {
                      const label =
                        amountCardShowTeamPrefix || amountCardTeamPricings.length === 1
                          ? row.teamName
                          : '공통';
                      return (
                        <div
                          key={`amount-card-team-${row.teamOrderIndex}`}
                          className="grid gap-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
                        >
                          <p className="text-xs font-semibold text-slate-500">{label}</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            <div>
                              <span className="text-slate-500">총액</span>
                              <p className="text-lg font-semibold text-slate-900">
                                {formatKrw(row.totalAmountKrw)}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">보증금</span>
                              <p className="font-medium">{formatSecurityDepositForCard(row)}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">예약금</span>
                              <p className="font-medium">{formatKrw(row.depositAmountKrw)}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">잔금</span>
                              <p className="font-medium">{formatKrw(row.balanceAmountKrw)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3 text-sm text-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">총액</span>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatKrw(
                            effectiveTotalsForCard?.totalAmountKrw ?? pricing.totalAmountKrw,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">보증금</span>
                        <p className="font-medium">
                          {effectiveTotalsForCard &&
                          toSecurityDepositScope(effectiveTotalsForCard.securityDepositMode) !== '-'
                            ? `${formatKrw(effectiveTotalsForCard.securityDepositUnitPriceKrw)} (${toSecurityDepositScope(
                                effectiveTotalsForCard.securityDepositMode,
                              )})`
                            : formatKrw(
                                effectiveTotalsForCard?.securityDepositAmountKrw ??
                                  pricing.securityDepositAmountKrw,
                              )}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">예약금</span>
                        <p className="font-medium">
                          {formatKrw(
                            effectiveTotalsForCard?.depositAmountKrw ?? pricing.depositAmountKrw,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">잔금</span>
                        <p className="font-medium">
                          {formatKrw(
                            effectiveTotalsForCard?.balanceAmountKrw ?? pricing.balanceAmountKrw,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : trip.totalAmountKrw != null ? (
                <div className="grid gap-3 text-sm text-slate-700">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">총액</span>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatKrw(trip.totalAmountKrw)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">보증금</span>
                      <p className="font-medium">
                        {trip.securityDepositAmountKrw != null
                          ? formatKrw(trip.securityDepositAmountKrw)
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">예약금</span>
                      <p className="font-medium">
                        {trip.depositAmountKrw != null ? formatKrw(trip.depositAmountKrw) : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">잔금</span>
                      <p className="font-medium">
                        {trip.balanceAmountKrw != null ? formatKrw(trip.balanceAmountKrw) : '-'}
                      </p>
                    </div>
                  </div>
                  {trip.groupTotalAmountKrw != null ? (
                    <div>
                      <span className="text-slate-500">팀별총액</span>
                      <p className="font-medium">{formatKrw(trip.groupTotalAmountKrw)}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">가격 정보 없음</p>
              )}
            </Card>
          </div>

          <ConfirmedTripNotesCard tripId={trip.id} />

          {/* 픽드랍 일정 — 독립 카드 */}
          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">픽드랍 일정</h2>
              {trip.status === 'ACTIVE' && !pickupDropEditing && (
                <button
                  type="button"
                  onClick={() => {
                    if (trip.planId && trip.planVersionId) {
                      openPlanTripEditChoice();
                      return;
                    }
                    startPickupDropEdit();
                  }}
                  className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  {trip.planId && trip.planVersionId ? '일정에서 수정' : '편집'}
                </button>
              )}
              {trip.status === 'ACTIVE' && pickupDropEditing && !(trip.planId && trip.planVersionId) && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPickupDropEditing(false)}
                    disabled={pickupDropSaving}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handlePickupDropSave}
                    disabled={pickupDropSaving}
                    className="rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    {pickupDropSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              )}
            </div>
            {pickupDropEditing && !(trip.planId && trip.planVersionId) ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500">픽업 날짜</span>
                  <input
                    type="date"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={pickupDateEdit}
                    onChange={(e) => setPickupDateEdit(e.target.value)}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500">드랍 날짜</span>
                  <input
                    type="date"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={dropDateEdit}
                    onChange={(e) => setDropDateEdit(e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-3 grid gap-5 text-sm text-slate-800">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  <div className="grid min-w-0 gap-2">
                    <span className="text-xs font-medium text-slate-500">픽업</span>
                    <p className="break-words whitespace-pre-wrap font-medium text-slate-900">
                      {basicPickupDisplay}
                    </p>
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <span className="text-xs font-medium text-slate-500">드랍</span>
                    <p className="break-words whitespace-pre-wrap font-medium text-slate-900">
                      {basicDropDisplay}
                    </p>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-medium text-slate-500">실투어 외 픽드랍</span>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="text-xs font-medium text-slate-400">실투어 외 픽업</span>
                      {externalPickDropRowsPickup.length === 0 ? (
                        <p className="font-medium text-slate-400">-</p>
                      ) : (
                        <ul className="grid gap-2">
                          {externalPickDropRowsPickup.map((row) => (
                            <li
                              key={row.key}
                              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                            >
                              <p className="font-semibold text-slate-900">{row.teamLabel}</p>
                              <p className="mt-1 text-slate-700">
                                <span className="text-slate-500">날짜</span>{' '}
                                {row.dateIso ? formatDate(`${row.dateIso}T12:00:00.000Z`) : '-'}
                              </p>
                              <p className="mt-0.5 text-slate-700">
                                출발 {row.departureTime} {row.departurePlace}
                              </p>
                              <p className="text-slate-700">
                                도착 {row.arrivalTime} {row.arrivalPlace}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-medium text-slate-400">실투어 외 드랍</span>
                      {externalPickDropRowsDrop.length === 0 ? (
                        <p className="font-medium text-slate-400">-</p>
                      ) : (
                        <ul className="grid gap-2">
                          {externalPickDropRowsDrop.map((row) => (
                            <li
                              key={row.key}
                              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                            >
                              <p className="font-semibold text-slate-900">{row.teamLabel}</p>
                              <p className="mt-1 text-slate-700">
                                <span className="text-slate-500">날짜</span>{' '}
                                {row.dateIso ? formatDate(`${row.dateIso}T12:00:00.000Z`) : '-'}
                              </p>
                              <p className="mt-0.5 text-slate-700">
                                출발 {row.departureTime} {row.departurePlace}
                              </p>
                              <p className="text-slate-700">
                                도착 {row.arrivalTime} {row.arrivalPlace}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                {trip.planId && trip.planVersionId ? (
                  <p className="text-xs leading-relaxed text-slate-500">
                    픽업·드랍·실투어 외 픽드랍은 연결된 견적 버전 메타를 반영합니다. 변경은「일정에서 수정」에서 일정
                    빌더 새 버전 또는 기존 버전 연결로 진행하세요.
                  </p>
                ) : null}
              </div>
            )}
          </Card>

          {/* 운영 일정 (낙타·노마딕·직접입력) */}
          {trip ? (
            <ConfirmedTripScheduleSection
              tripId={trip.id}
              tripActive={trip.status === 'ACTIVE'}
              defaultDateIso={
                (getTripStartDate(trip) ?? trip.travelStart)?.slice(0, 10) ??
                new Date().toISOString().slice(0, 10)
              }
            />
          ) : null}

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">운영정보 (가이드/기사/숙소)</h2>
              <div className="flex gap-2">
                {trip.status === 'ACTIVE' ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate(`/confirmed-trips/${tripId}/assign`, {
                        state: { fromConfirmedTripDetail: true },
                      })
                    }
                  >
                    배정하기
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
              {/* 가이드 */}
              <div>
                <p className="mb-2 text-xs text-slate-400">가이드</p>
                {sortTripAssignments(trip.guideAssignments).length === 0 ? (
                  <p className="font-medium text-slate-400">-</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {sortTripAssignments(trip.guideAssignments).map((a) => (
                      <div key={a.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                          {a.guide.profileImageUrl ? (
                            <img
                              src={a.guide.profileImageUrl}
                              alt={a.guide.nameKo}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl text-slate-300">
                              👤
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight text-slate-800">
                            {a.guide.nameKo || a.nameSnapshot || '-'}
                          </p>
                          {a.guide.nameMn && (
                            <p className="text-xs text-slate-400">{a.guide.nameMn}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              {a.guide.level}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 기사 */}
              <div>
                <p className="mb-2 text-xs text-slate-400">기사</p>
                {sortTripAssignments(trip.driverAssignments).length === 0 ? (
                  <p className="font-medium text-slate-400">-</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {sortTripAssignments(trip.driverAssignments).map((a) => (
                      <div key={a.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                          {a.driver.profileImageUrl ? (
                            <img
                              src={a.driver.profileImageUrl}
                              alt={a.driver.nameMn}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl text-slate-300">
                              🚗
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight text-slate-800">{a.driver.nameMn}</p>
                          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {a.driver.vehicleType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(trip.assignedVehicle ?? meta?.vehicleType) ? (
                <div>
                  <span className="text-slate-500">배차 차량</span>
                  <p className="font-medium">{trip.assignedVehicle ?? meta?.vehicleType}</p>
                </div>
              ) : null}
              {trip.accommodationNote ? (
                <div className="sm:col-span-2">
                  <span className="text-slate-500">숙소 확정 메모</span>
                  <p className="whitespace-pre-wrap font-medium">{trip.accommodationNote}</p>
                </div>
              ) : null}
              {trip.operationNote ? (
                <div className="sm:col-span-2">
                  <span className="text-slate-500">운영 비고</span>
                  <p className="whitespace-pre-wrap font-medium">{trip.operationNote}</p>
                </div>
              ) : null}
            </div>
            {/* 구분선 + 숙소 */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <LodgingSection
                tripId={tripId}
                hasPlan={!!(trip.planId && trip.planVersionId)}
                totalDays={totalDays}
                travelStartDate={travelStartDate}
                embedded
              />
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">관리 정보</h2>
            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <span className="text-slate-500">고객</span>
                <p className="font-medium">{trip.user.name}</p>
              </div>
              <div>
                <span className="text-slate-500">담당자</span>
                <p className="font-medium">{trip.user.ownerEmployee?.name ?? '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">확정자</span>
                <p className="font-medium">{trip.confirmedByEmployee?.name ?? '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">상태</span>
                <p className="font-medium">{trip.status === 'ACTIVE' ? '확정' : '취소됨'}</p>
              </div>
            </div>
          </Card>

          {(trip.user.attachments ?? []).length > 0 ? (
            <AttachmentsCard attachments={trip.user.attachments ?? []} />
          ) : null}
        </div>
        {/* end left column */}

        {showRightPanel && (
          <div className="sticky top-6 grid gap-4 self-start">
            <h2 className="text-sm font-semibold text-slate-700">
              {publishedConfirmation ? '확정서 미리보기' : 'PDF 미리보기'}
            </h2>
            {publishedConfirmation ? (
              <ConfirmationPreviewPanel snapshot={publishedConfirmation.snapshot} />
            ) : isPlanTrip ? (
              <PlanPdfPreviewPanel planVersionId={trip.planVersionId!} />
            ) : hasPdf ? (
              <div className="grid gap-8">
                {pdfAttachments.map((att) => (
                  <PdfPageViewer key={att.url} url={att.url} filename={att.filename} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {/* end outer grid */}

      {planTripEditChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">수정 방법 선택</h3>
            <p className="mt-2 text-sm text-slate-600">
              견적 버전 연결만 바꿉니다. 이 확정 건에 입력한 기사·숙소·가이드·운영 일정 등 운영 정보는 유지됩니다.
            </p>

            <div className="mt-5 grid gap-6">
              <section className="grid gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  기존 버전으로 교체
                </h4>
                {planVersionsLoading ? (
                  <p className="text-sm text-slate-500">버전 목록을 불러오는 중...</p>
                ) : sortedPlanVersions.length === 0 ? (
                  <p className="text-sm text-slate-500">표시할 버전이 없습니다.</p>
                ) : (
                  <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {sortedPlanVersions.map((v) => {
                      const isCurrent = v.id === trip.planVersionId;
                      return (
                        <li key={v.id} className="flex gap-3 p-3 text-sm">
                          <input
                            type="radio"
                            name="plan-version-switch"
                            className="mt-1"
                            checked={selectedSwitchVersionId === v.id}
                            disabled={isCurrent}
                            onChange={() => setSelectedSwitchVersionId(v.id)}
                            aria-label={`버전 ${v.versionNumber} 선택`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-900">v{v.versionNumber}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {toVariantLabel(v.variantType)}
                              </span>
                              <span className="text-xs text-slate-500">{v.totalDays}일</span>
                              {isCurrent ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                  현재 연결됨
                                </span>
                              ) : null}
                            </div>
                            {v.changeNote ? (
                              <p className="mt-1 text-xs text-slate-600">{v.changeNote}</p>
                            ) : null}
                            <p className="mt-1 text-xs text-slate-400">
                              생성 {new Date(v.createdAt).toLocaleString('ko-KR')}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Button
                  variant="primary"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    planVersionSwitchSaving ||
                    !selectedSwitchVersionId ||
                    selectedSwitchVersionId === trip.planVersionId
                  }
                  onClick={handleApplyPlanVersionSwitch}
                >
                  {planVersionSwitchSaving ? '저장 중...' : '선택한 버전으로 연결'}
                </Button>
              </section>

              <section className="grid gap-3 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  새 버전 생성
                </h4>
                <Button
                  variant="outline"
                  className="flex h-auto w-full flex-col items-start justify-start gap-1 whitespace-normal px-4 py-3 text-left text-sm font-medium leading-snug"
                  onClick={handleOpenItineraryBuilderForNewVersion}
                >
                  일정 빌더에서 새 버전 만들기
                  <span className="text-xs font-normal text-slate-500">
                    일정 빌더에서 새 버전을 저장하면 이 확정 건의 연결 견적 버전이 바뀔 수 있습니다.
                  </span>
                </Button>
              </section>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                onClick={closePlanTripEditChoice}
                disabled={planVersionSwitchSaving}
              >
                닫기
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {migrationEditChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">수정 방법 선택</h3>
            <p className="mt-2 text-sm text-slate-600">
              플랜(견적)이 붙어 있지 않은 확정 건입니다.
            </p>
            <div className="mt-5 grid gap-3">
              <Button
                variant="outline"
                className="flex h-auto w-full flex-col items-start justify-start gap-1 whitespace-normal px-4 py-3 text-left text-sm font-medium leading-snug"
                onClick={() => {
                  setMigrationEditChoiceOpen(false);
                  openDirectEditModal();
                }}
              >
                이 화면에서만 수정
                <span className="text-xs font-normal text-slate-500">
                  일정·금액·첨부 등 기존 입력란만 고칩니다.
                </span>
              </Button>
              <Button
                variant="primary"
                className="flex h-auto w-full flex-col items-start justify-start gap-1 whitespace-normal px-4 py-3 text-left text-sm font-medium leading-snug bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setMigrationEditChoiceOpen(false);
                  const params = new URLSearchParams({
                    userId: trip.userId,
                    confirmedTripId: trip.id,
                    changeNote: '노션 확정 건 신규 견적 연결',
                  });
                  navigate(`/itinerary-builder?${params.toString()}`);
                }}
              >
                새 견적 작성
                <span className="text-xs font-normal text-white/90">
                  일정 빌더에서 견적을 저장하면 이 확정 건에 플랜이 붙습니다.
                </span>
              </Button>
            </div>
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setMigrationEditChoiceOpen(false)}>
                닫기
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {directEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
          <Card className="my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900">확정 건 수정</h3>
            <p className="mt-1 text-xs text-slate-500">
              노션·직접 등록 확정 건의 여행 일정·금액·고객 첨부를 수정합니다.
            </p>

            <div className="mt-5 grid gap-5 text-sm">
              <section className="grid gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  여행
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-slate-500">여행 시작</span>
                    <input
                      type="date"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mTravelStart}
                      onChange={(e) => setMTravelStart(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-slate-500">여행 종료</span>
                    <input
                      type="date"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mTravelEnd}
                      onChange={(e) => setMTravelEnd(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-slate-500">픽업일</span>
                    <input
                      type="date"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mPickup}
                      onChange={(e) => setMPickup(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-slate-500">드랍일</span>
                    <input
                      type="date"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mDrop}
                      onChange={(e) => setMDrop(e.target.value)}
                    />
                  </label>
                </div>
                <label className="grid gap-1">
                  <span className="text-slate-500">여행지</span>
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2"
                    value={mDestination}
                    onChange={(e) => setMDestination(e.target.value)}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-slate-500">인원</span>
                  <input
                    type="number"
                    min={1}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                    value={mPaxCount}
                    onChange={(e) => setMPaxCount(e.target.value)}
                  />
                </label>
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-slate-500">오픈채팅방 링크 (선택)</span>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="https://open.kakao.com/..."
                    className="rounded-xl border border-slate-200 px-3 py-2"
                    value={mOpenChatUrl}
                    onChange={(e) => setMOpenChatUrl(e.target.value)}
                  />
                  <span className="text-xs text-slate-400">
                    비우고 저장하면 링크가 제거됩니다.
                  </span>
                </label>
              </section>

              <section className="grid gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  대여 물품
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mRentalGear}
                      onChange={(e) => setMRentalGear(e.target.checked)}
                    />
                    <span className="text-slate-700">대여 물품</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mRentalDrone}
                      onChange={(e) => setMRentalDrone(e.target.checked)}
                    />
                    <span className="text-slate-700">드론</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mRentalStarlink}
                      onChange={(e) => setMRentalStarlink(e.target.checked)}
                    />
                    <span className="text-slate-700">스타링크</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mRentalPowerbank}
                      onChange={(e) => setMRentalPowerbank(e.target.checked)}
                    />
                    <span className="text-slate-700">파워뱅크</span>
                  </label>
                </div>
              </section>

              <section className="grid gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  모집 상태
                </h4>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mRecruiting}
                    onChange={(e) => setMRecruiting(e.target.checked)}
                  />
                  <span className="text-slate-700">모집중</span>
                </label>
              </section>

              <section className="grid gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  금액 (원)
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-slate-500">총액</span>
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mTotal}
                      onChange={(e) => setMTotal(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-slate-500">예약금</span>
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mDeposit}
                      onChange={(e) => setMDeposit(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-slate-500">잔금</span>
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mBalance}
                      onChange={(e) => setMBalance(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-slate-500">보증금</span>
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mSecurityDeposit}
                      onChange={(e) => setMSecurityDeposit(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-slate-500">팀별 총액</span>
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={mGroupTotal}
                      onChange={(e) => setMGroupTotal(e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="grid gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  첨부
                </h4>
                <label className="grid gap-1">
                  <span className="text-slate-500">파일 추가 (PDF 또는 이미지)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={uploadingUserAttachment || directEditSaving}
                    className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      try {
                        const uploaded = await uploadUserAttachment(trip.user.id, file);
                        setMAttachments((prev) => [...prev, uploaded]);
                      } catch (error) {
                        window.alert(
                          error instanceof Error ? error.message : '업로드에 실패했습니다.',
                        );
                      }
                    }}
                  />
                </label>
                {mAttachments.length === 0 ? (
                  <p className="text-xs text-slate-400">첨부 없음</p>
                ) : (
                  <ul className="grid gap-2">
                    {mAttachments.map((item) => (
                      <li
                        key={item.url}
                        className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{item.filename}</p>
                          <p className="text-slate-400">{item.type}</p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-rose-600 hover:underline"
                          onClick={() =>
                            setMAttachments((prev) => prev.filter((x) => x.url !== item.url))
                          }
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                onClick={() => setDirectEditOpen(false)}
                disabled={directEditSaving}
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleDirectEditSave()}
                disabled={directEditSaving}
              >
                {directEditSaving ? '저장 중…' : '저장'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
