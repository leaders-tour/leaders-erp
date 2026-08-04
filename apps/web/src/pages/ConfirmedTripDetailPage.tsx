import { Button, Card } from '@tour/ui';
import { formatVehicleAssignmentsForDisplay, normalizeVehicleAssignments } from '@tour/validation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmationFullscreenPreview } from '../features/confirmation/components/ConfirmationFullscreenPreview';
import { ConfirmationPdfPreviewPanel } from '../features/confirmation/components/ConfirmationPdfPreviewPanel';
import { EstimateFullscreenPreview } from '../features/estimate/components/EstimateFullscreenPreview';
import { useConfirmationDocuments, useSaveConfirmationDocumentMemo } from '../features/confirmation/hooks/use-confirmation-document';
import { ConfirmationDocumentMemoCell } from '../features/confirmation/components/ConfirmationDocumentMemoCell';
import type { ConfirmationDocumentRow } from '../features/confirmation/model/types';
import {
  buildConfirmationBuilderPath,
  buildConfirmationBuilderPathFromDocument,
  CONFIRMATION_FRESH_SOURCE_TOOLTIP,
  resolveConfirmationBuilderRowActionLabel,
} from '../features/confirmation/utils/confirmation-builder-source';
import { LinkifiedText } from '../components/LinkifiedText';
import { PdfPageViewer } from '../components/pdf/PdfPageViewer';
import { TooltipHelpIcon } from '../components/TooltipHelpIcon';
import { useAuth } from '../features/auth/context';
import { useEstimateSource } from '../features/estimate/hooks/use-estimate-source';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { EstimatePreviewScaler } from '../features/estimate/components/EstimatePreviewScaler';
import { toSecurityDepositScope } from '../features/estimate/utils/format';
import {
  buildEffectivePricing,
} from '../features/pricing/manual-pricing';
import { publishedTotalsFromPlanVersionPricing } from '../features/pricing/published-pricing-totals';
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
  useSetConfirmedTripKoreaTeamStages,
  useSetConfirmedTripPostTripTasks,
  useCancelConfirmedTrip,
  type ConfirmedTripNoteRow,
  getTripStartDate,
  getTripEndDate,
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
  formatTransportFlightLines,
  formatTransportPickupDropLines,
  type TransportGroupLike,
} from '../features/plan/pickup-drop';
import { markConfirmedTripRecentlyReturned } from '../features/confirmed-trip/recent-return';
import { LodgingSection } from '../features/confirmed-trip/LodgingSection';
import { ConfirmedTripSectionCard } from '../features/confirmed-trip/ConfirmedTripSectionCard';
import { ConfirmedTripTravelerInfoSection } from '../features/confirmed-trip/ConfirmedTripTravelerInfoSection';
import {
  TripDocumentPreviewRemote,
  type TripDocumentPreviewRemoteTarget,
} from '../features/confirmed-trip/TripDocumentPreviewRemote';
import { useContractPaymentReceipts, useContractSubmissions } from '../features/contract/hooks';
import { ConfirmedTripLeaderName } from '../features/confirmed-trip/ConfirmedTripLeaderName';
import { ConfirmedTripScheduleSection } from '../features/confirmed-trip/ConfirmedTripScheduleSection';
import { UserDisplayName } from '../features/plan/components/UserDisplayName';
import { KoreaTeamStageMultiSelect } from '../features/confirmed-trip/KoreaTeamStageMultiSelect';
import { PostTripTaskMultiSelect } from '../features/confirmed-trip/PostTripTaskMultiSelect';
import { usePlanVersions, useUpdateUser, useUploadUserAttachment } from '../features/plan/hooks';
import { toVariantLabel } from '../features/plan/variant-label';

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

function getConfirmationStatusLabel(status: ConfirmationDocumentRow['status']): string {
  switch (status) {
    case 'DRAFT':
      return '임시저장';
    case 'PUBLISHED':
      return '발행';
    case 'ARCHIVED':
      return '보관됨';
    default:
      return status;
  }
}

function PlanEstimatePreviewPanel({ planVersionId }: { planVersionId: string }) {
  const { data: estimateData, loading: estimateLoading, errorMessage } = useEstimateSource({
    mode: 'version',
    versionId: planVersionId,
    draftKey: null,
    includeLocationGuides: false,
  });

  if (estimateLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 py-16 text-sm text-slate-400">
        견적서 미리보기를 불러오는 중...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {errorMessage}
      </div>
    );
  }

  if (!estimateData) return null;

  return (
    <div className="estimate-preview-frame">
      <EstimatePreviewScaler>
        <EstimateDocument
          data={estimateData}
          viewMode="screen-preview"
          includeGuidePages={false}
          includeStaticImagePages={false}
        />
      </EstimatePreviewScaler>
    </div>
  );
}

function AttachmentsCard({ attachments }: { attachments: AttachmentItem[] }) {
  const [preview, setPreview] = useState<AttachmentItem | null>(null);

  const images = attachments.filter((a) => a.type === 'image');
  const pdfs = attachments.filter((a) => a.type === 'pdf');

  return (
    <Card className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-3xl md:p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 md:mb-4">첨부파일</h2>

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
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                      <LinkifiedText text={note.content} />
                    </p>
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
  const contractDocumentNumber = trip?.planVersion?.meta?.documentNumber ?? null;
  const { submissions: contractSubmissions, loading: contractSubmissionsLoading, refetch: refetchContractSubmissions } =
    useContractSubmissions(contractDocumentNumber);
  const { receipts: contractReceipts, loading: contractReceiptsLoading } =
    useContractPaymentReceipts(contractDocumentNumber);
  const {
    documents: confirmationDocuments,
    loading: confirmationDocumentsLoading,
  } = useConfirmationDocuments(tripId);
  const { saveMemo, loading: memoSaving } = useSaveConfirmationDocumentMemo({ confirmedTripId: tripId });
  const [savingMemoDocumentId, setSavingMemoDocumentId] = useState<string | null>(null);
  const [confirmationFullscreenOpen, setConfirmationFullscreenOpen] = useState(false);
  const [estimateFullscreenOpen, setEstimateFullscreenOpen] = useState(false);
  const { versions: planVersions, loading: planVersionsLoading } = usePlanVersions(trip?.planId ?? undefined);
  const sortedPlanVersions = useMemo(
    () => [...planVersions].sort((a, b) => b.versionNumber - a.versionNumber),
    [planVersions],
  );
  const { updateConfirmedTrip } = useUpdateConfirmedTrip();
  const { setKoreaTeamStages } = useSetConfirmedTripKoreaTeamStages();
  const { setPostTripTasks } = useSetConfirmedTripPostTripTasks();
  const { cancelConfirmedTrip, loading: cancelling } = useCancelConfirmedTrip();
  const estimatePreviewRef = useRef<HTMLElement>(null);
  const confirmationPreviewRef = useRef<HTMLElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const jumpToPreviewSection = useCallback((target: TripDocumentPreviewRemoteTarget) => {
    const sectionRef = target === 'estimate' ? estimatePreviewRef : confirmationPreviewRef;
    const container = previewScrollRef.current;
    const section = sectionRef.current;
    if (!container || !section) return;

    const nextTop =
      container.scrollTop + section.getBoundingClientRect().top - container.getBoundingClientRect().top;

    container.scrollTo({
      top: nextTop,
      behavior: 'smooth',
    });
  }, []);

  const handleSaveConfirmationMemo = useCallback(
    async (documentId: string, content: string) => {
      setSavingMemoDocumentId(documentId);
      try {
        await saveMemo(documentId, content);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : '메모 저장에 실패했습니다.');
      } finally {
        setSavingMemoDocumentId((current) => (current === documentId ? null : current));
      }
    },
    [saveMemo],
  );

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

  /** 연결 planVersion 저장 pricing / customerPricingSnapshot 기준 (live 재계산 아님) */
  const publishedTotalsForCard = useMemo(() => {
    return planVersionPricingRaw ? publishedTotalsFromPlanVersionPricing(planVersionPricingRaw) : null;
  }, [planVersionPricingRaw]);

  const amountCardTeamPricings = useMemo<AmountCardTeamPricing[]>(() => {
    const snapRows = planVersionPricingRaw?.manualPricing?.customerPricingSnapshot?.teamPricings ?? [];
    if (snapRows.length > 0) {
      return snapRows.map((row) => ({
        teamOrderIndex: row.teamOrderIndex,
        teamName: row.teamName,
        baseAmountKrw: row.baseAmountKrw ?? 0,
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
      baseAmountKrw: row.baseAmountKrw,
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

  const flightDisplay = useMemo(() => {
    if (!trip) return '-';
    const groups = trip.planVersion?.meta?.transportGroups ?? [];
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
      const inLines = formatTransportFlightLines(asLike, 'IN');
      const outLines = formatTransportFlightLines(asLike, 'OUT');
      const parts = [
        inLines !== '항공권 미정' ? `IN ${inLines}` : null,
        outLines !== '항공권 미정' ? `OUT ${outLines}` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join('\n') : '-';
    }
    const snap = trip.latestPublishedConfirmationDocument?.snapshot;
    if (snap?.flightInText?.trim() || snap?.flightOutText?.trim()) {
      return [
        snap.flightInText?.trim() ? `IN ${snap.flightInText.trim()}` : null,
        snap.flightOutText?.trim() ? `OUT ${snap.flightOutText.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }
    return '-';
  }, [trip]);

  const equipmentRentalLabels = useMemo(() => {
    if (!trip) return [];
    return [
      !trip.planVersion?.meta && trip.rentalGear ? '물품' : null,
      trip.rentalDrone ? '드론' : null,
      trip.rentalStarlink ? '스타링크' : null,
      trip.rentalPowerbank ? '파워뱅크' : null,
    ].filter((label): label is string => Boolean(label));
  }, [trip]);

  const participatedEventText = useMemo(() => {
    if (!trip) return null;
    const events = trip.planVersion?.meta?.events ?? [];
    if (events.length > 0) {
      return events.map((event) => event.name).join(' / ');
    }
    const fromConfirmation = trip.latestPublishedConfirmationDocument?.snapshot?.eventNames?.trim();
    if (fromConfirmation) return fromConfirmation;
    return null;
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
  const showRightPanel = isPlanTrip || hasPdf || !!publishedConfirmation;
  const showPreviewRemote = isPlanTrip && !!publishedConfirmation;

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

  const headerActionClassName = 'h-8 px-2.5 text-xs md:h-10 md:px-4 md:text-sm';

  return (
    <section className="grid gap-4 md:gap-6">
      <div>
        <Button
          variant="outline"
          type="button"
          className={`w-fit ${headerActionClassName}`}
          onClick={handleGoBack}
        >
          ← 뒤로가기
        </Button>
      </div>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            <ConfirmedTripLeaderName trip={trip} />
          </h1>
          {trip.plan && trip.planVersion ? (
            <p className="mt-1 text-xs text-slate-600 md:text-sm">
              {trip.plan.title} · v{trip.planVersion.versionNumber} · {trip.plan.regionSet.name}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600 md:text-sm">노션 마이그레이션 데이터</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          <Button
            variant="outline"
            className={headerActionClassName}
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
              className={headerActionClassName}
              onClick={() =>
                navigate(
                  publishedConfirmation
                    ? buildConfirmationBuilderPath(trip.id, 'version', {
                        fromDocumentId: publishedConfirmation.id,
                      })
                    : buildConfirmationBuilderPath(trip.id, 'fresh'),
                )
              }
            >
              {publishedConfirmation ? '확정서 수정' : '확정서 만들기'}
            </Button>
          ) : null}
          {trip.planId && trip.planVersionId ? (
            <Button
              variant="outline"
              className={headerActionClassName}
              onClick={() => navigate(`/plans/${trip.planId}/versions/${trip.planVersionId}`)}
            >
              견적서 상세
            </Button>
          ) : null}
          {trip.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              className={headerActionClassName}
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
              className={`${headerActionClassName} border-red-300 text-red-600 hover:bg-red-50`}
              disabled={cancelling}
              onClick={handleCancel}
            >
              확정 취소
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 md:gap-6">
        <ConfirmedTripSectionCard
          title="메모"
          description="비고는 견적서에 노출되며, 댓글은 손님에게 노출되지 않습니다."
        >
          <div className="grid gap-4">
            <div>
              <span className="block text-xs text-slate-500">비고 (견적서 노출)</span>
              <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">
                {meta?.remark?.trim() ? meta.remark : '-'}
              </p>
            </div>
            <ConfirmedTripNotesCard tripId={trip.id} />
          </div>
        </ConfirmedTripSectionCard>

        <div
          className={
            showRightPanel
              ? 'grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-6'
              : 'grid gap-4 md:gap-6'
          }
        >
        {showRightPanel ? (
          <div className="order-1 flex min-w-0 max-w-full flex-col gap-3 self-start overflow-hidden lg:order-2 lg:sticky lg:top-6 lg:max-h-[calc(100vh-2rem)]">
            {showPreviewRemote ? (
              <TripDocumentPreviewRemote onJump={jumpToPreviewSection} />
            ) : null}

            <div ref={previewScrollRef} className="min-h-0 lg:flex-1 lg:overflow-y-auto">
              <div className="grid min-w-0 max-w-full gap-5 pr-0 md:gap-8 lg:pr-1">
                {publishedConfirmation ? (
                  <section ref={confirmationPreviewRef}>
                    <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
                      <h2 className="text-xs font-semibold text-slate-700 md:text-sm">확정서 미리보기</h2>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 md:text-xs"
                        onClick={() => setConfirmationFullscreenOpen(true)}
                      >
                        전체보기
                      </button>
                    </div>
                    <ConfirmationPdfPreviewPanel
                      confirmationDocumentId={publishedConfirmation.id}
                      snapshot={publishedConfirmation.snapshot}
                      planVersionId={trip.planVersionId}
                    />
                  </section>
                ) : null}

                {isPlanTrip ? (
                  <section ref={estimatePreviewRef}>
                    <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
                      <h2 className="text-xs font-semibold text-slate-700 md:text-sm">견적서 미리보기</h2>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 md:text-xs"
                        onClick={() => setEstimateFullscreenOpen(true)}
                      >
                        전체보기
                      </button>
                    </div>
                    <PlanEstimatePreviewPanel planVersionId={trip.planVersionId!} />
                  </section>
                ) : null}

                {!isPlanTrip && hasPdf ? (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold text-slate-700 md:mb-3 md:text-sm">
                      PDF 미리보기
                    </h2>
                    <div className="grid gap-5 md:gap-8">
                      {pdfAttachments.map((att) => (
                        <PdfPageViewer key={att.url} url={att.url} filename={att.filename} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={`grid min-w-0 max-w-full gap-4 overflow-hidden md:gap-6 ${
            showRightPanel ? 'order-2 lg:order-1' : ''
          }`}
        >
          <ConfirmedTripTravelerInfoSection
            documentNumber={contractDocumentNumber}
            headcountTotal={meta?.headcountTotal ?? getTripHeadcount(trip)}
            isRecruitingOpen={trip.isRecruitingOpen}
            recruitmentDisabled={trip.status !== 'ACTIVE'}
            recruitmentSaving={recruitmentSaving}
            onRecruitmentToggle={async (nextOpen) => {
              setRecruitmentSaving(true);
              try {
                await updateConfirmedTrip(trip.id, { isRecruitingOpen: nextOpen });
              } catch (error) {
                window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
              } finally {
                setRecruitmentSaving(false);
              }
            }}
            submissions={contractSubmissions}
            receipts={contractReceipts}
            submissionsLoading={contractSubmissionsLoading}
            receiptsLoading={contractReceiptsLoading}
            onSubmissionsUpdated={async () => {
              await refetchContractSubmissions();
            }}
          />

          <ConfirmedTripSectionCard title="확정절차 3단계">
            <div className="grid gap-4 text-sm text-slate-700">
              <div>
                <span className="block text-xs text-slate-500">확정 단계</span>
                <div className="mt-1 grid gap-3">
                  <KoreaTeamStageMultiSelect
                    tripId={trip.id}
                    selected={trip.koreaTeamStages}
                    disabled={trip.status !== 'ACTIVE'}
                    onChange={(optionIds) => {
                      void setKoreaTeamStages(trip.id, optionIds);
                    }}
                  />
                  <div>
                    <span className="mb-1 block text-xs text-slate-400">종료 후 안내</span>
                    <PostTripTaskMultiSelect
                      tripId={trip.id}
                      selected={trip.postTripTasks}
                      disabled={trip.status !== 'ACTIVE'}
                      onChange={(optionIds) => {
                        void setPostTripTasks(trip.id, optionIds);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <span className="block text-xs text-slate-500">오픈채팅 링크</span>
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
                        className="break-all text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:decoration-emerald-700"
                      >
                        {trip.openChatUrl}
                      </a>
                    ) : (
                      '-'
                    )}
                  </p>
                )}
              </div>
            </div>
          </ConfirmedTripSectionCard>

          <ConfirmedTripSectionCard title="투어 기본정보">
            <div className="grid gap-5 text-sm text-slate-700">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-slate-500">투어 기간</span>
                  <p className="mt-1 font-medium">
                    {(() => {
                      const s = getTripStartDate(trip);
                      const e = getTripEndDate(trip);
                      return s && e ? `${formatDate(s)} ~ ${formatDate(e)}` : '-';
                    })()}
                    {trip.planVersion ? ` (${trip.planVersion.totalDays}일)` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">여행 코스</span>
                  <p className="mt-1 font-medium">{getTripDestination(trip) || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">항공권 시간</span>
                  <p className="mt-1 whitespace-pre-wrap font-medium">{flightDisplay}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">예약일</span>
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
                {meta?.documentNumber ? (
                  <div>
                    <span className="text-xs text-slate-500">문서번호</span>
                    <p className="mt-1 font-medium">{meta.documentNumber}</p>
                  </div>
                ) : null}
                {meta?.specialNote ? (
                  <div className="sm:col-span-2">
                    <span className="text-xs text-slate-500">특이사항</span>
                    <p className="mt-1 whitespace-pre-wrap font-medium">{meta.specialNote}</p>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-700">일정 · 실투어 외 픽드랍</h3>
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
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
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
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handlePickupDropSave}
                        disabled={pickupDropSaving}
                        className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        {pickupDropSaving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  )}
                </div>
                {pickupDropEditing && !(trip.planId && trip.planVersionId) ? (
                  <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    {trip.planId && trip.planVersionId ? (
                      <p className="text-xs leading-relaxed text-slate-500">
                        픽업·드랍·실투어 외 픽드랍은 연결된 견적 버전 메타를 반영합니다. 변경은「일정에서
                        수정」에서 일정 빌더 새 버전 또는 기존 버전 연결로 진행하세요.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-semibold text-slate-700">낙타인형 · 운영 일정</h3>
                <ConfirmedTripScheduleSection
                  tripId={trip.id}
                  tripActive={trip.status === 'ACTIVE'}
                  defaultDateIso={
                    (getTripStartDate(trip) ?? trip.travelStart)?.slice(0, 10) ??
                    new Date().toISOString().slice(0, 10)
                  }
                  embedded
                />
              </div>
            </div>
          </ConfirmedTripSectionCard>

          <ConfirmedTripSectionCard
            title="가격 정보"
            actions={
              trip.status === 'ACTIVE' ? (
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
              ) : null
            }
          >
            <div className="grid gap-5">
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
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                            <div>
                              <span className="text-slate-500">기본금</span>
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
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div>
                        <span className="text-slate-500">기본금</span>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatKrw(
                            publishedTotalsForCard?.totalAmountKrw ?? pricing.totalAmountKrw,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">보증금</span>
                        <p className="font-medium">
                          {publishedTotalsForCard &&
                          toSecurityDepositScope(publishedTotalsForCard.securityDepositMode) !== '-'
                            ? `${formatKrw(publishedTotalsForCard.securityDepositUnitPriceKrw)} (${toSecurityDepositScope(
                                publishedTotalsForCard.securityDepositMode,
                              )})`
                            : formatKrw(
                                publishedTotalsForCard?.securityDepositAmountKrw ??
                                  pricing.securityDepositAmountKrw,
                              )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">예약금</span>
                        <p className="font-medium">
                          {formatKrw(
                            publishedTotalsForCard?.depositAmountKrw ?? pricing.depositAmountKrw,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">잔금</span>
                        <p className="font-medium">
                          {formatKrw(
                            publishedTotalsForCard?.balanceAmountKrw ?? pricing.balanceAmountKrw,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : trip.totalAmountKrw != null ? (
                <div className="grid gap-3 text-sm text-slate-700">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <span className="text-slate-500">기본금</span>
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
                      <span className="text-slate-500">추가금 (팀별총액)</span>
                      <p className="font-medium">{formatKrw(trip.groupTotalAmountKrw)}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">가격 정보 없음</p>
              )}

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-semibold text-slate-700">배정 정보</h3>
                <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
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
                              {a.guide.nameMn ? (
                                <p className="text-xs text-slate-400">{a.guide.nameMn}</p>
                              ) : null}
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
                  <div>
                    <span className="text-slate-500">차량</span>
                    <p className="font-medium">
                      {meta
                        ? formatVehicleAssignmentsForDisplay(
                            normalizeVehicleAssignments(meta.vehicleAssignments, meta.vehicleType),
                          )
                        : (trip.assignedVehicle ?? '-')}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <h4 className="mb-3 text-xs font-semibold text-slate-700">숙소 배정</h4>
                    <LodgingSection
                      tripId={tripId}
                      hasPlan={!!(trip.planId && trip.planVersionId)}
                      totalDays={totalDays}
                      travelStartDate={travelStartDate}
                      embedded
                    />
                  </div>
                  {trip.accommodationNote ? (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">숙소 메모</span>
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
              </div>
            </div>
          </ConfirmedTripSectionCard>

          <ConfirmedTripSectionCard title="대여 정보">
            <div className="grid gap-3 text-sm text-slate-700">
              {meta?.includeRentalItems ? (
                <div>
                  <span className="text-xs text-slate-500">기본 대여물품</span>
                  <p className="mt-1 whitespace-pre-wrap font-medium">{meta.rentalItemsText || '-'}</p>
                </div>
              ) : null}
              {equipmentRentalLabels.length > 0 ? (
                <div>
                  <span className="text-xs text-slate-500">
                    {meta ? '장비 대여' : '대여 항목'}
                  </span>
                  <p className="mt-1 font-medium">{equipmentRentalLabels.join(', ')}</p>
                </div>
              ) : null}
              {!meta?.includeRentalItems && equipmentRentalLabels.length === 0 ? (
                <p className="text-slate-500">등록된 대여 정보가 없습니다.</p>
              ) : null}
              <div>
                <span className="text-xs text-slate-500">참여 이벤트</span>
                <p className="mt-1 whitespace-pre-wrap font-medium">
                  {participatedEventText || '-'}
                </p>
              </div>
            </div>
          </ConfirmedTripSectionCard>


          <Card className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-3xl md:p-5">
            <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">확정서 저장 이력</h2>
                <p className="mt-1 hidden text-xs text-slate-500 md:block">
                  임시저장·발행·보관된 확정서를 버전별로 확인합니다.
                </p>
              </div>
              {trip.status === 'ACTIVE' ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="outline"
                    onClick={() => navigate(buildConfirmationBuilderPath(trip.id, 'fresh'))}
                  >
                    새 버전 작성
                  </Button>
                  <TooltipHelpIcon
                    content={CONFIRMATION_FRESH_SOURCE_TOOLTIP}
                    align="right"
                    ariaLabel="새 버전 작성 안내"
                  />
                </div>
              ) : null}
            </div>

            {confirmationDocumentsLoading ? (
              <p className="text-sm text-slate-500">확정서 이력을 불러오는 중...</p>
            ) : null}

            {!confirmationDocumentsLoading && confirmationDocuments.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                저장된 확정서가 없습니다. 확정서 빌더에서 임시 저장 또는 발행 저장을 해주세요.
              </p>
            ) : null}

            {!confirmationDocumentsLoading && confirmationDocuments.length > 0 ? (
              <div className="grid gap-2">
                {confirmationDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">v{document.versionNumber}</span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {getConfirmationStatusLabel(document.status)}
                          </span>
                        </div>
                        <div className="mt-3">
                          <ConfirmationDocumentMemoCell
                            document={document}
                            saving={memoSaving && savingMemoDocumentId === document.id}
                            onSave={handleSaveConfirmationMemo}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(`/confirmation-documents/${document.id}`)}
                        >
                          상세
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => navigate(buildConfirmationBuilderPathFromDocument(document))}
                        >
                          {resolveConfirmationBuilderRowActionLabel(document.status)}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-3xl md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 md:mb-4">관리 정보</h2>
            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <span className="text-slate-500">고객</span>
                <p className="font-medium">
                  <UserDisplayName user={trip.user} />
                </p>
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
        </div>
      </div>
      {/* end content stack */}

      {publishedConfirmation ? (
        <ConfirmationFullscreenPreview
          open={confirmationFullscreenOpen}
          onClose={() => setConfirmationFullscreenOpen(false)}
          confirmationDocumentId={publishedConfirmation.id}
          snapshot={publishedConfirmation.snapshot}
          planVersionId={trip.planVersionId}
        />
      ) : null}

      {isPlanTrip && trip.planVersionId ? (
        <EstimateFullscreenPreview
          open={estimateFullscreenOpen}
          onClose={() => setEstimateFullscreenOpen(false)}
          planVersionId={trip.planVersionId}
        />
      ) : null}

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
