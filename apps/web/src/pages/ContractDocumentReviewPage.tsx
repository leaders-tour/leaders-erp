import { Button, Card, Input, PageShell, StatusBadge } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useContractDocumentReviewItems,
  useContractDocumentReviewTabCounts,
  useContractMatchPlanVersionCandidates,
  useContractPaymentReviewReceipts,
  useContractPaymentReviewTabCount,
  useExcludeContractSubmissionFromCount,
  useMatchContractDocument,
  useMatchContractPaymentReceipt,
  useRestoreContractDocumentReview,
  useRestoreContractSubmissionToCount,
  useTrashContractDocumentReview,
  useUnmatchContractDocument,
  useUnmatchContractPaymentReceipt,
  type ContractDocumentReviewItemRow,
  type ContractDocumentReviewTabCountsRow,
  type ContractDocumentReviewVisibility,
  type ContractDocumentStatusValue,
  type ContractMatchPlanVersionCandidateRow,
  type ContractMatchedPlanSummaryRow,
} from '../features/contract/hooks';

type PageMode = 'contracts' | 'payments';

type ReviewTabKey = 'needs_action' | 'over_submitted' | 'in_progress' | 'completed' | 'all' | 'trash';

const ALL_REVIEW_STATUSES: ContractDocumentStatusValue[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'OVER_SUBMITTED',
  'NEEDS_REVIEW',
];

const REVIEW_TABS: Array<{ key: ReviewTabKey; label: string; statuses: ContractDocumentStatusValue[] }> = [
  { key: 'needs_action', label: '조치 필요', statuses: ['NEEDS_REVIEW'] },
  { key: 'over_submitted', label: '초과 제출', statuses: ['OVER_SUBMITTED'] },
  { key: 'in_progress', label: '작성 중', statuses: ['IN_PROGRESS'] },
  { key: 'completed', label: '작성 완료', statuses: ['COMPLETED'] },
  { key: 'all', label: '전체', statuses: ALL_REVIEW_STATUSES },
  { key: 'trash', label: '휴지통', statuses: ['NEEDS_REVIEW', 'OVER_SUBMITTED'] },
];

const MAIN_REVIEW_TABS = REVIEW_TABS.filter((tab) => tab.key !== 'trash');
const TRASH_REVIEW_TAB = REVIEW_TABS.find((tab) => tab.key === 'trash')!;

function reviewVisibilityForTab(tab: ReviewTabKey): ContractDocumentReviewVisibility {
  return tab === 'trash' ? 'HIDDEN' : 'VISIBLE';
}

function canTrashReviewItem(status: ContractDocumentStatusValue): boolean {
  return status === 'NEEDS_REVIEW' || status === 'OVER_SUBMITTED';
}

function tabCount(key: ReviewTabKey, counts: ContractDocumentReviewTabCountsRow | null): number | null {
  if (!counts) {
    return null;
  }
  switch (key) {
    case 'needs_action':
      return counts.needsReview;
    case 'over_submitted':
      return counts.overSubmitted;
    case 'trash':
      return counts.trashed;
    case 'in_progress':
      return counts.inProgress;
    case 'completed':
      return counts.completed;
    case 'all':
      return counts.all;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ko-KR');
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('ko-KR');
}

function paymentReviewReasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case 'AMBIGUOUS_PAYER_NAME':
      return '동명이인으로 문서번호 특정 불가';
    case 'NO_MATCHED_CONTRACT_SUBMISSION_NAME':
      return '계약서 작성자명과 불일치';
    case 'MISSING_PAYER_NAME':
      return '입금자명 없음';
    case 'INVALID_AMOUNT':
      return '금액 오류';
    default:
      return reason ?? '검토 필요';
  }
}

function formatKrw(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toLocaleString('ko-KR')}원`;
}

function reviewReasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case 'NO_MATCHED_PLAN_VERSION':
      return '견적서 미매칭';
    case 'MISSING_EXPECTED_COUNT':
      return '예상 인원 없음';
    case 'DEDUPLICATION_REVIEW_REQUIRED':
      return '중복 작성 확인 필요';
    default:
      return reason ?? '검토 필요';
  }
}

function statusLabel(status: ContractDocumentStatusValue): string {
  switch (status) {
    case 'NEEDS_REVIEW':
      return '검토 필요';
    case 'OVER_SUBMITTED':
      return '초과 제출';
    case 'IN_PROGRESS':
      return '작성 중';
    case 'COMPLETED':
      return '작성 완료';
    case 'NOT_STARTED':
      return '미작성';
    default:
      return status;
  }
}

function reviewSummary(statusRow: ContractDocumentReviewItemRow['statusRow']): string {
  if (statusRow.status === 'OVER_SUBMITTED') {
    return `계약서 ${statusRow.submittedCount}/${statusRow.expectedCount ?? '?'} · 예상 인원보다 많이 제출됨`;
  }
  if (statusRow.status === 'COMPLETED') {
    return `계약서 ${statusRow.submittedCount}/${statusRow.expectedCount ?? '?'} · 작성 완료`;
  }
  if (statusRow.status === 'IN_PROGRESS') {
    return `계약서 ${statusRow.submittedCount}/${statusRow.expectedCount ?? '?'} · 작성 진행 중`;
  }
  if (statusRow.needsReviewReason) {
    return reviewReasonLabel(statusRow.needsReviewReason);
  }
  return reviewReasonLabel(null);
}

function ReviewStatusBadge({
  status,
  active = false,
}: {
  status: ContractDocumentStatusValue;
  active?: boolean;
}): JSX.Element {
  const label = statusLabel(status);

  if (status === 'OVER_SUBMITTED') {
    return (
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
          active
            ? 'border-amber-300 bg-amber-400/20 text-amber-100'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {label}
      </span>
    );
  }

  if (status === 'NEEDS_REVIEW') {
    return (
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
          active
            ? 'border-rose-300 bg-rose-400/20 text-rose-100'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}
      >
        {label}
      </span>
    );
  }

  if (status === 'COMPLETED') {
    return (
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
          active
            ? 'border-emerald-300 bg-emerald-400/20 text-emerald-100'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}
      >
        {label}
      </span>
    );
  }

  if (status === 'IN_PROGRESS') {
    return (
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
          active
            ? 'border-violet-300 bg-violet-400/20 text-violet-100'
            : 'border-violet-200 bg-violet-50 text-violet-800'
        }`}
      >
        {label}
      </span>
    );
  }

  return <StatusBadge tone="auto" label={label} />;
}

function submissionPersonLabel(submission: ContractDocumentReviewItemRow['submissions'][number]): string {
  return submission.travelerName ?? submission.leaderName ?? '이름 없음';
}

function isRepresentativeSubmission(
  submission: ContractDocumentReviewItemRow['submissions'][number],
): boolean {
  const type = submission.representativeType?.normalize('NFKC').trim() ?? '';
  return type.includes('대표');
}

function resolveRepresentativeName(item: ContractDocumentReviewItemRow): string | null {
  const representativeSubmission = item.submissions.find(isRepresentativeSubmission);
  if (representativeSubmission) {
    const name = submissionPersonLabel(representativeSubmission);
    return name === '이름 없음' ? null : name;
  }

  const leaderName = item.submissions.find((submission) => submission.leaderName?.trim())?.leaderName?.trim();
  return leaderName ?? null;
}

function buildNewEstimateAction(
  statusRow: ContractDocumentReviewItemRow['statusRow'],
  matchedPlanSummary: ContractMatchedPlanSummaryRow | null,
): {
  href: string;
  label: string;
  title: string;
  description: string;
} | null {
  const matchedVersionId = statusRow.effectiveMatchedPlanVersionId;
  const matchedPlanId = statusRow.effectiveMatchedPlanId;

  if (matchedVersionId && matchedPlanId) {
    const baseHref = `/plans/${matchedPlanId}/versions/${matchedVersionId}`;
    if (statusRow.status === 'OVER_SUBMITTED') {
      return {
        href: baseHref,
        label: '매칭 견적에서 새 버전 만들기',
        title: '실제 인원이 늘어난 경우',
        description: `예상 인원(${statusRow.expectedCount ?? '?'})보다 더 많이 제출되었습니다. 매칭된 견적 상세로 이동해 「이 버전 기반 새 버전 생성」으로 인원에 맞는 견적을 만든 뒤, 이 화면에서 새 견적서에 매칭하세요.`,
      };
    }
    return {
      href: baseHref,
      label: '매칭 견적에서 새 버전 만들기',
      title: '인원 또는 조건 변경',
      description: matchedPlanSummary
        ? `현재 매칭 견적(${matchedPlanSummary.userName} · v${matchedPlanSummary.versionNumber})을 기준으로 새 버전을 만들 수 있습니다. 변경 후 이 화면에서 새 견적서에 매칭하세요.`
        : '매칭된 견적 상세로 이동해 「이 버전 기반 새 버전 생성」으로 조건을 조정한 뒤, 이 화면에서 새 견적서에 매칭하세요.',
    };
  }

  if (statusRow.status === 'OVER_SUBMITTED') {
    const params = new URLSearchParams({
      contractDocumentNumber: statusRow.documentNumberNorm,
    });
    if (statusRow.expectedCount != null) {
      params.set('expectedHeadcount', String(statusRow.expectedCount));
    }
    params.set('submittedCount', String(statusRow.submittedCount));
    return {
      href: `/itinerary-builder?${params.toString()}`,
      label: '새 견적서 만들기',
      title: '실제 인원이 늘어난 경우',
      description: `예상 인원(${statusRow.expectedCount ?? '?'})보다 더 많이 제출되었습니다. 새 견적서를 만든 뒤 이 화면에서 해당 견적서에 매칭하세요.`,
    };
  }

  return null;
}

function MatchedPlanSummaryCard({
  summary,
}: {
  summary: ContractMatchedPlanSummaryRow;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">매칭 견적</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {summary.userName} · {summary.planTitle}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            v{summary.versionNumber}
            {summary.isManualMatch ? ' · 수동 매칭' : ' · 자동 매칭'}
          </p>
        </div>
        <Link
          to={`/plans/${summary.planId}/versions/${summary.planVersionId}`}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          견적 상세 보기
        </Link>
      </div>
      <div className="mt-3 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
        <span>문서번호: {summary.documentNumber}</span>
        <span>총인원: {summary.headcountTotal}명</span>
        <span>팀장: {summary.leaderName}</span>
        <span>
          출발: {formatDate(summary.travelStartDate)} ~ {formatDate(summary.travelEndDate)}
        </span>
      </div>
    </div>
  );
}

export function ContractDocumentReviewPage(): JSX.Element {
  const [pageMode, setPageMode] = useState<PageMode>('contracts');
  const [activeTab, setActiveTab] = useState<ReviewTabKey>('needs_action');
  const [search, setSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [documentNumberDraft, setDocumentNumberDraft] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState<string | null>(null);
  const [matchNote, setMatchNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [exclusionTargetId, setExclusionTargetId] = useState<string | null>(null);
  const [exclusionReason, setExclusionReason] = useState('');
  const [submissionActionError, setSubmissionActionError] = useState<string | null>(null);
  const [trashActionError, setTrashActionError] = useState<string | null>(null);

  const activeTabConfig = REVIEW_TABS.find((tab) => tab.key === activeTab) ?? REVIEW_TABS[0]!;
  const isTrashView = activeTab === 'trash';
  const normalizedSearch = search.trim();
  const { items, loading, refetch } = useContractDocumentReviewItems(
    activeTabConfig.statuses,
    normalizedSearch,
    100,
    reviewVisibilityForTab(activeTab),
  );
  const { counts: tabCounts, refetch: refetchTabCounts } = useContractDocumentReviewTabCounts();
  const { count: paymentReviewCount, refetch: refetchPaymentReviewCount } = useContractPaymentReviewTabCount();
  const normalizedPaymentSearch = paymentSearch.trim();
  const { items: paymentItems, loading: paymentLoading, refetch: refetchPaymentItems } =
    useContractPaymentReviewReceipts(normalizedPaymentSearch);
  const { matchContractPaymentReceipt, loading: matchingPayment } = useMatchContractPaymentReceipt();
  const { unmatchContractPaymentReceipt, loading: unmatchingPayment } = useUnmatchContractPaymentReceipt();
  const { candidates: paymentPlanCandidates, loading: paymentCandidatesLoading } =
    useContractMatchPlanVersionCandidates(planSearch);
  const { candidates, loading: candidatesLoading } = useContractMatchPlanVersionCandidates(planSearch);
  const { matchContractDocument, loading: matching } = useMatchContractDocument();
  const { unmatchContractDocument, loading: unmatching } = useUnmatchContractDocument();
  const { excludeContractSubmissionFromCount, loading: excluding } = useExcludeContractSubmissionFromCount();
  const { restoreContractSubmissionToCount, loading: restoring } = useRestoreContractSubmissionToCount();
  const { trashContractDocumentReview, loading: trashing } = useTrashContractDocumentReview();
  const { restoreContractDocumentReview, loading: restoringFromTrash } = useRestoreContractDocumentReview();

  useEffect(() => {
    if (pageMode !== 'payments') {
      return;
    }
    setSelectedReceiptId(null);
  }, [pageMode, normalizedPaymentSearch]);

  useEffect(() => {
    if (pageMode !== 'payments') {
      return;
    }
    if (!selectedReceiptId && paymentItems.length > 0) {
      setSelectedReceiptId(paymentItems[0]?.receipt.id ?? null);
    }
    if (selectedReceiptId && !paymentItems.some((item) => item.receipt.id === selectedReceiptId)) {
      setSelectedReceiptId(paymentItems[0]?.receipt.id ?? null);
    }
  }, [pageMode, paymentItems, selectedReceiptId]);

  const selectedPaymentItem = useMemo(
    () => paymentItems.find((item) => item.receipt.id === selectedReceiptId) ?? null,
    [paymentItems, selectedReceiptId],
  );

  useEffect(() => {
    if (!selectedPaymentItem) {
      setDocumentNumberDraft('');
      setPlanSearch('');
      setPaymentErrorMessage(null);
      return;
    }
    setDocumentNumberDraft(
      selectedPaymentItem.receipt.matchedDocumentNumberNorm
        ?? selectedPaymentItem.candidateDocumentNumbers[0]
        ?? '',
    );
    setPlanSearch('');
    setPaymentErrorMessage(null);
  }, [selectedPaymentItem?.receipt.id]);

  useEffect(() => {
    setSelectedDocumentNumber(null);
  }, [activeTab]);

  useEffect(() => {
    if (!selectedDocumentNumber && items.length > 0) {
      setSelectedDocumentNumber(items[0]?.statusRow.documentNumberNorm ?? null);
    }
    if (selectedDocumentNumber && !items.some((item) => item.statusRow.documentNumberNorm === selectedDocumentNumber)) {
      setSelectedDocumentNumber(items[0]?.statusRow.documentNumberNorm ?? null);
    }
  }, [items, selectedDocumentNumber]);

  const selectedItem = useMemo(
    () => items.find((item) => item.statusRow.documentNumberNorm === selectedDocumentNumber) ?? null,
    [items, selectedDocumentNumber],
  );

  const newEstimateAction = useMemo(
    () =>
      selectedItem
        ? buildNewEstimateAction(selectedItem.statusRow, selectedItem.matchedPlanSummary)
        : null,
    [selectedItem],
  );

  const excludedSubmissions = useMemo(
    () => selectedItem?.submissions.filter((submission) => submission.excludedFromContractCount) ?? [],
    [selectedItem],
  );

  useEffect(() => {
    setSelectedPlanVersionId(null);
    setPlanSearch('');
    setMatchNote('');
    setErrorMessage(null);
    setExclusionTargetId(null);
    setExclusionReason('');
    setSubmissionActionError(null);
    setTrashActionError(null);
  }, [selectedDocumentNumber]);

  const refreshPage = async () => {
    if (pageMode === 'payments') {
      await Promise.all([refetchPaymentItems(), refetchPaymentReviewCount()]);
      return;
    }
    await Promise.all([refetch(), refetchTabCounts()]);
  };

  const handleMatch = async () => {
    if (!selectedItem || !selectedPlanVersionId) {
      setErrorMessage('매칭할 견적서를 선택해주세요.');
      return;
    }

    setErrorMessage(null);
    try {
      await matchContractDocument({
        documentNumber: selectedItem.statusRow.documentNumberNorm,
        planVersionId: selectedPlanVersionId,
        note: matchNote.trim() || null,
      });
      setSelectedPlanVersionId(null);
      setMatchNote('');
      await refreshPage();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '계약서 매칭에 실패했습니다.');
    }
  };

  const handleUnmatch = async () => {
    if (!selectedItem?.statusRow.manualMatchedPlanVersionId) {
      return;
    }

    setErrorMessage(null);
    try {
      await unmatchContractDocument(selectedItem.statusRow.documentNumberNorm);
      await refreshPage();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '수동 매칭 해제에 실패했습니다.');
    }
  };

  const handleExcludeSubmission = async (submissionId: string) => {
    setSubmissionActionError(null);
    try {
      await excludeContractSubmissionFromCount({
        submissionId,
        reason: exclusionReason.trim() || null,
      });
      setExclusionTargetId(null);
      setExclusionReason('');
      await refreshPage();
    } catch (error) {
      setSubmissionActionError(error instanceof Error ? error.message : '계산 제외 처리에 실패했습니다.');
    }
  };

  const handleRestoreSubmission = async (submissionId: string) => {
    setSubmissionActionError(null);
    try {
      await restoreContractSubmissionToCount(submissionId);
      await refreshPage();
    } catch (error) {
      setSubmissionActionError(error instanceof Error ? error.message : '제외 해제에 실패했습니다.');
    }
  };

  const handleTrashDocument = async () => {
    if (!selectedItem || !canTrashReviewItem(selectedItem.statusRow.status)) {
      return;
    }

    setTrashActionError(null);
    try {
      await trashContractDocumentReview({
        documentNumber: selectedItem.statusRow.documentNumberNorm,
      });
      setSelectedDocumentNumber(null);
      await refreshPage();
    } catch (error) {
      setTrashActionError(error instanceof Error ? error.message : '휴지통 이동에 실패했습니다.');
    }
  };

  const handleRestoreFromTrash = async () => {
    if (!selectedItem) {
      return;
    }

    setTrashActionError(null);
    try {
      await restoreContractDocumentReview(selectedItem.statusRow.documentNumberNorm);
      setSelectedDocumentNumber(null);
      await refreshPage();
    } catch (error) {
      setTrashActionError(error instanceof Error ? error.message : '휴지통 복원에 실패했습니다.');
    }
  };

  const handleMatchPayment = async () => {
    if (!selectedPaymentItem) {
      return;
    }
    const documentNumber = documentNumberDraft.trim();
    if (!documentNumber) {
      setPaymentErrorMessage('연결할 문서번호를 입력하거나 후보에서 선택해주세요.');
      return;
    }

    setPaymentErrorMessage(null);
    try {
      await matchContractPaymentReceipt({
        receiptId: selectedPaymentItem.receipt.id,
        documentNumber,
      });
      await refreshPage();
    } catch (error) {
      setPaymentErrorMessage(error instanceof Error ? error.message : '입금 수동 연결에 실패했습니다.');
    }
  };

  const handleUnmatchPayment = async () => {
    if (!selectedPaymentItem?.receipt.matchedDocumentNumberNorm) {
      return;
    }

    setPaymentErrorMessage(null);
    try {
      await unmatchContractPaymentReceipt(selectedPaymentItem.receipt.id);
      await refreshPage();
    } catch (error) {
      setPaymentErrorMessage(error instanceof Error ? error.message : '입금 연결 해제에 실패했습니다.');
    }
  };

  return (
    <PageShell className="grid gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">계약서 관리</h1>
          <p className="mt-1 text-sm text-slate-600">
            {pageMode === 'payments'
              ? '입금 시트에서 가져온 미매칭·중복 row를 확인하고 계약 문서번호에 수동 연결합니다.'
              : '계약서 작성 현황을 확인하고, 견적 매칭·인원 조정·새 버전 생성을 처리합니다.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => void refreshPage()}>
          새로고침
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPageMode('contracts')}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            pageMode === 'contracts'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          계약서
        </button>
        <button
          type="button"
          onClick={() => setPageMode('payments')}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            pageMode === 'payments'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          입금 검토
          {paymentReviewCount != null ? (
            <span className={pageMode === 'payments' ? 'text-slate-300' : 'text-slate-500'}> {paymentReviewCount}</span>
          ) : null}
        </button>
      </div>

      {pageMode === 'payments' ? (
        <>
          <Card className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]">
            <Input
              value={paymentSearch}
              onChange={(event) => setPaymentSearch(event.target.value)}
              placeholder="입금자명, 문서번호, 사유, 금액 검색"
            />
            <Button variant="primary" onClick={() => void refreshPage()}>
              조회
            </Button>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="grid max-h-[78vh] gap-2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2 px-2 py-1">
                <div>
                  <p className="text-sm font-semibold text-slate-900">입금 검토</p>
                  <p className="mt-0.5 text-xs text-slate-500">미매칭 또는 확인 필요한 입금 row</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {paymentItems.length}
                </span>
              </div>

              {paymentLoading ? <p className="px-2 py-4 text-sm text-slate-500">불러오는 중...</p> : null}
              {!paymentLoading && paymentItems.length === 0 ? (
                <p className="px-2 py-4 text-sm text-slate-500">표시할 입금 row가 없습니다.</p>
              ) : null}

              {paymentItems.map((item) => {
                const active = item.receipt.id === selectedReceiptId;
                const receipt = item.receipt;
                return (
                  <button
                    key={receipt.id}
                    type="button"
                    onClick={() => setSelectedReceiptId(receipt.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : receipt.matchedDocumentNumberNorm
                          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50'
                          : 'border-rose-200 bg-rose-50/40 hover:border-rose-300 hover:bg-rose-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>
                          {receipt.payerNameRaw ?? '이름 없음'}
                        </p>
                        <p className={`mt-1 text-xs ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                          {formatKrw(receipt.amountKrw)}
                          {receipt.sourceRowNumber != null ? ` · 시트 ${receipt.sourceRowNumber}행` : ''}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          active
                            ? 'border-slate-600 bg-slate-800 text-slate-100'
                            : receipt.matchedDocumentNumberNorm
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        {receipt.matchedDocumentNumberNorm ? '연결됨' : '미매칭'}
                      </span>
                    </div>
                    <p className={`mt-2 text-xs ${active ? 'text-slate-200' : 'text-slate-600'}`}>
                      {paymentReviewReasonLabel(receipt.needsReviewReason)}
                    </p>
                    {receipt.matchedDocumentNumberNorm ? (
                      <p className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        문서번호: {receipt.matchedDocumentNumberNorm}
                      </p>
                    ) : item.candidateDocumentNumbers.length > 0 ? (
                      <p className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        후보 {item.candidateDocumentNumbers.length}건
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </Card>

            <div className="grid gap-4">
              {!selectedPaymentItem ? (
                <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                  왼쪽에서 입금 row를 선택해주세요.
                </Card>
              ) : (
                <>
                  <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">선택된 입금</p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">
                        {selectedPaymentItem.receipt.payerNameRaw ?? '이름 없음'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatKrw(selectedPaymentItem.receipt.amountKrw)} ·{' '}
                        {paymentReviewReasonLabel(selectedPaymentItem.receipt.needsReviewReason)}
                      </p>
                    </div>

                    <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-2">
                      <div>
                        <span className="text-slate-500">입금일시</span>
                        <p className="font-medium text-slate-900">
                          {formatDateTime(selectedPaymentItem.receipt.receivedAt)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">시트 행</span>
                        <p className="font-medium text-slate-900">
                          {selectedPaymentItem.receipt.sourceRowNumber ?? '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">현재 연결</span>
                        <p className="font-medium text-slate-900">
                          {selectedPaymentItem.receipt.matchedDocumentNumberNorm ?? '미연결'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">출처</span>
                        <p className="font-medium text-slate-900">{selectedPaymentItem.receipt.source.name}</p>
                      </div>
                    </div>

                    {selectedPaymentItem.candidateDocumentNumbers.length > 0 ? (
                      <div className="grid gap-2">
                        <p className="text-sm font-semibold text-slate-900">계약서 작성자명 기준 후보</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPaymentItem.candidateDocumentNumbers.map((documentNumber) => (
                            <button
                              key={documentNumber}
                              type="button"
                              onClick={() => setDocumentNumberDraft(documentNumber)}
                              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                                documentNumberDraft === documentNumber
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {documentNumber}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        계약서 작성자명과 일치하는 문서번호 후보가 없습니다. 아래에서 직접 검색하거나 문서번호를 입력하세요.
                      </div>
                    )}
                  </Card>

                  <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">문서번호 연결</p>
                      <p className="mt-1 text-sm text-slate-600">
                        연결할 계약 문서번호를 입력하거나 견적 검색으로 찾아 연결하세요.
                      </p>
                    </div>

                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">문서번호</span>
                      <Input
                        value={documentNumberDraft}
                        onChange={(event) => setDocumentNumberDraft(event.target.value)}
                        placeholder="예: 260610128"
                      />
                    </label>

                    <Input
                      value={planSearch}
                      onChange={(event) => setPlanSearch(event.target.value)}
                      placeholder="견적 검색 (고객명, 문서번호, 팀장명)"
                    />

                    {paymentCandidatesLoading ? (
                      <p className="text-sm text-slate-500">견적 후보를 불러오는 중...</p>
                    ) : null}
                    {planSearch.trim() && !paymentCandidatesLoading && paymentPlanCandidates.length === 0 ? (
                      <p className="text-sm text-slate-500">검색 결과가 없습니다.</p>
                    ) : null}

                    <div className="grid gap-2">
                      {paymentPlanCandidates.map((candidate) => (
                        <button
                          key={candidate.planVersionId}
                          type="button"
                          onClick={() => setDocumentNumberDraft(candidate.documentNumber)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            documentNumberDraft === candidate.documentNumber
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <p className={`text-sm font-semibold ${documentNumberDraft === candidate.documentNumber ? 'text-white' : 'text-slate-900'}`}>
                            {candidate.userName} · {candidate.documentNumber}
                          </p>
                          <p className={`mt-1 text-xs ${documentNumberDraft === candidate.documentNumber ? 'text-slate-200' : 'text-slate-500'}`}>
                            v{candidate.versionNumber} · {candidate.leaderName}
                          </p>
                        </button>
                      ))}
                    </div>

                    {paymentErrorMessage ? <p className="text-sm text-rose-600">{paymentErrorMessage}</p> : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        disabled={!documentNumberDraft.trim() || matchingPayment}
                        onClick={() => void handleMatchPayment()}
                      >
                        {matchingPayment ? '연결 중...' : '이 문서번호에 연결'}
                      </Button>
                      {selectedPaymentItem.receipt.matchedDocumentNumberNorm ? (
                        <Button
                          variant="outline"
                          disabled={unmatchingPayment}
                          onClick={() => void handleUnmatchPayment()}
                        >
                          {unmatchingPayment ? '해제 중...' : '연결 해제'}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
      <Card className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="문서번호, 작성자명 검색"
        />
        <Button variant="primary" onClick={() => void refreshPage()}>
          조회
        </Button>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {MAIN_REVIEW_TABS.map((tab) => {
            const active = tab.key === activeTab;
            const count = tabCount(tab.key, tabCounts);
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                {count != null ? (
                  <span className={active ? 'text-slate-300' : 'text-slate-500'}> {count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setActiveTab(TRASH_REVIEW_TAB.key)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            activeTab === TRASH_REVIEW_TAB.key
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {TRASH_REVIEW_TAB.label}
          {tabCount(TRASH_REVIEW_TAB.key, tabCounts) != null ? (
            <span className={activeTab === TRASH_REVIEW_TAB.key ? 'text-slate-300' : 'text-slate-500'}>
              {' '}
              {tabCount(TRASH_REVIEW_TAB.key, tabCounts)}
            </span>
          ) : null}
        </button>
      </div>

      {isTrashView ? (
        <Card className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
          <p className="text-lg font-semibold tracking-tight text-sky-950">휴지통이란?</p>
          <p className="mt-3 text-base leading-relaxed text-sky-900">
            아래 두 가지 경우에 <span className="font-semibold text-sky-950">조치 필요</span>·
            <span className="font-semibold text-sky-950">초과 제출</span> 항목이 휴지통으로 모입니다.
          </p>
          <ul className="mt-4 grid gap-3 text-base leading-relaxed md:grid-cols-2">
            <li className="rounded-2xl border border-sky-200 bg-white/80 px-4 py-3">
              <span className="font-semibold text-sky-950">수동 이동</span>
              <p className="mt-1 text-sky-800">직접 휴지통으로 보낸 항목</p>
            </li>
            <li className="rounded-2xl border border-sky-200 bg-white/80 px-4 py-3">
              <span className="font-semibold text-sky-950">자동 이동</span>
              <p className="mt-1 text-sky-800">
                문서번호 출발일 기준 7일이 지났는데, 검토·초과 제출 상태가 그대로인 항목
              </p>
            </li>
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="grid max-h-[78vh] gap-2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2 px-2 py-1">
            <div>
              <p className="text-sm font-semibold text-slate-900">{activeTabConfig.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {isTrashView ? '자동·수동으로 이동된 항목입니다' : '구글 시트에서 가져온 데이터입니다'}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {items.length}
            </span>
          </div>

          {loading ? <p className="px-2 py-4 text-sm text-slate-500">불러오는 중...</p> : null}
          {!loading && items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">표시할 계약서가 없습니다.</p>
          ) : null}

          {items.map((item) => {
            const active = item.statusRow.documentNumberNorm === selectedDocumentNumber;
            const representativeName = resolveRepresentativeName(item);
            return (
              <button
                key={item.statusRow.id}
                type="button"
                onClick={() => setSelectedDocumentNumber(item.statusRow.documentNumberNorm)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : item.statusRow.status === 'COMPLETED'
                      ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50'
                      : item.statusRow.status === 'IN_PROGRESS'
                        ? 'border-violet-200 bg-violet-50/40 hover:border-violet-300 hover:bg-violet-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {representativeName ? (
                      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>
                        {representativeName}
                      </p>
                    ) : null}
                    <p
                      className={`${
                        representativeName ? 'mt-0.5 text-xs' : 'text-sm font-semibold'
                      } ${active ? (representativeName ? 'text-slate-300' : 'text-white') : representativeName ? 'text-slate-500' : 'text-slate-900'}`}
                    >
                      {item.statusRow.documentNumberRawSample ?? item.statusRow.documentNumberNorm}
                    </p>
                    <p className={`mt-1 text-xs ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                      {reviewSummary(item.statusRow)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <ReviewStatusBadge status={item.statusRow.status} active={active} />
                  </div>
                </div>
                <p className={`mt-2 text-xs ${active ? 'text-slate-200' : 'text-slate-600'}`}>
                  계약서 {item.statusRow.submittedCount}/{item.statusRow.expectedCount ?? '?'} · 작성{' '}
                  {item.submissions.length}건
                </p>
              </button>
            );
          })}
        </Card>

        <div className="grid gap-4">
          {!selectedItem ? (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              왼쪽에서 계약서를 선택해주세요.
            </Card>
          ) : (
            <>
              <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">선택된 계약서</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {selectedItem.statusRow.documentNumberRawSample ?? selectedItem.statusRow.documentNumberNorm}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {reviewSummary(selectedItem.statusRow)}
                      {!isTrashView ? (
                        <> · 최근 작성 {formatDateTime(selectedItem.statusRow.lastSubmittedAt)}</>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReviewStatusBadge status={selectedItem.statusRow.status} />
                    {isTrashView ? (
                      <Button variant="outline" onClick={() => void handleRestoreFromTrash()} disabled={restoringFromTrash}>
                        {restoringFromTrash ? '복원 중...' : '휴지통에서 복원'}
                      </Button>
                    ) : canTrashReviewItem(selectedItem.statusRow.status) &&
                      (activeTab === 'needs_action' || activeTab === 'over_submitted') ? (
                      <Button variant="outline" onClick={() => void handleTrashDocument()} disabled={trashing}>
                        {trashing ? '이동 중...' : '휴지통으로 이동'}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {trashActionError ? <p className="text-sm text-rose-600">{trashActionError}</p> : null}

                {isTrashView ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {selectedItem.statusRow.reviewTrashedAt ? (
                      <>
                        수동으로 휴지통에 이동됨 · {formatDateTime(selectedItem.statusRow.reviewTrashedAt)}
                        {selectedItem.statusRow.reviewTrashReason
                          ? ` · ${selectedItem.statusRow.reviewTrashReason}`
                          : ''}
                      </>
                    ) : (
                      <>문서번호 날짜 기준 7일이 지나 자동으로 휴지통에 이동된 항목입니다.</>
                    )}
                  </div>
                ) : null}

                <div className={`grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm ${isTrashView ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <div>
                    <span className="text-slate-500">정규 문서번호</span>
                    <p className="font-medium text-slate-900">{selectedItem.statusRow.documentNumberNorm}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Review 사유</span>
                    <p className="font-medium text-slate-900">{reviewSummary(selectedItem.statusRow)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">작성/예상 인원</span>
                    <p className="font-medium text-slate-900">
                      {selectedItem.statusRow.submittedCount}/{selectedItem.statusRow.expectedCount ?? '?'}
                    </p>
                  </div>
                  {!isTrashView ? (
                    <>
                      <div>
                        <span className="text-slate-500">상태 계산 시각</span>
                        <p className="font-medium text-slate-900">{formatDateTime(selectedItem.statusRow.computedAt)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">최근 갱신</span>
                        <p className="font-medium text-slate-900">{formatDateTime(selectedItem.statusRow.updatedAt)}</p>
                      </div>
                    </>
                  ) : null}
                </div>

                {!isTrashView && selectedItem.matchedPlanSummary ? (
                  <MatchedPlanSummaryCard summary={selectedItem.matchedPlanSummary} />
                ) : null}
                {!isTrashView && !selectedItem.matchedPlanSummary ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    매칭된 견적이 없습니다. 아래에서 견적서를 검색해 연결하세요.
                  </div>
                ) : null}

                {!isTrashView && newEstimateAction ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                    <p className="font-semibold">{newEstimateAction.title}</p>
                    <p className="mt-1 text-amber-900">{newEstimateAction.description}</p>
                    <div className="mt-3">
                      <Link
                        to={newEstimateAction.href}
                        className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
                      >
                        {newEstimateAction.label}
                      </Link>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-slate-900">계약서 작성 내역</p>
                  {!isTrashView && submissionActionError ? (
                    <p className="text-sm text-rose-600">{submissionActionError}</p>
                  ) : null}
                  <div className="grid gap-2">
                    {selectedItem.submissions.map((submission) => {
                      if (isTrashView) {
                        return (
                          <div
                            key={submission.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                          >
                            <p className="font-medium text-slate-900">{submissionPersonLabel(submission)}</p>
                            <span className="shrink-0 text-xs text-slate-500">
                              {formatDateTime(submission.submittedAt)}
                            </span>
                          </div>
                        );
                      }

                      const isRepresentative = isRepresentativeSubmission(submission);
                      const isExcluded = submission.excludedFromContractCount;
                      const showingExclusionForm = exclusionTargetId === submission.id;
                      return (
                        <div
                          key={submission.id}
                          className={`rounded-2xl border px-4 py-3 text-sm ${
                            isExcluded
                              ? 'border-slate-300 bg-slate-100/80 opacity-70'
                              : isRepresentative
                                ? 'border-slate-900 bg-slate-100 shadow-sm ring-1 ring-slate-900/10'
                                : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className={`font-semibold ${isExcluded ? 'text-slate-600 line-through' : 'text-slate-900'}`}
                                >
                                  {submissionPersonLabel(submission)}
                                </p>
                                {isRepresentative ? (
                                  <span className="rounded-full border border-slate-900 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                                    대표자
                                  </span>
                                ) : null}
                                {isExcluded ? (
                                  <span className="rounded-full border border-slate-400 bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                    계산 제외
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {submission.representativeType ?? '유형 미상'}
                                {submission.totalCompanionCount != null
                                  ? ` · 동반 ${submission.totalCompanionCount}명`
                                  : ''}
                              </p>
                              {isExcluded && submission.exclusionReason ? (
                                <p className="mt-1 text-xs text-slate-600">제외 사유: {submission.exclusionReason}</p>
                              ) : null}
                              {isExcluded && submission.excludedAt ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  제외 시각: {formatDateTime(submission.excludedAt)}
                                </p>
                              ) : null}
                            </div>
                            <span className="text-xs text-slate-500">{formatDateTime(submission.submittedAt)}</span>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                            <span>연락처: {submission.travelerPhone ?? '-'}</span>
                            <span>
                              출처: {submission.source.name}
                              {submission.sourceRowNumber != null ? ` ${submission.sourceRowNumber}행` : ''}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {isExcluded ? (
                              <Button
                                variant="outline"
                                disabled={restoring}
                                onClick={() => void handleRestoreSubmission(submission.id)}
                              >
                                {restoring ? '복원 중...' : '제외 해제'}
                              </Button>
                            ) : showingExclusionForm ? (
                              <>
                                <textarea
                                  value={exclusionReason}
                                  onChange={(event) => setExclusionReason(event.target.value)}
                                  rows={2}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                                  placeholder="제외 사유 (선택)"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="primary"
                                    disabled={excluding}
                                    onClick={() => void handleExcludeSubmission(submission.id)}
                                  >
                                    {excluding ? '처리 중...' : '제외 확정'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setExclusionTargetId(null);
                                      setExclusionReason('');
                                    }}
                                  >
                                    취소
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setExclusionTargetId(submission.id);
                                  setExclusionReason('');
                                  setSubmissionActionError(null);
                                }}
                              >
                                계산에서 제외
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {!isTrashView ? (
              <>
              <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">견적서 매칭</p>
                  <p className="mt-1 text-sm text-slate-600">
                    고객명, 견적 문서번호, 팀장명으로 검색해 연결할 견적서를 선택하세요.
                  </p>
                </div>

                <Input
                  value={planSearch}
                  onChange={(event) => setPlanSearch(event.target.value)}
                  placeholder="견적서 검색"
                />

                {candidatesLoading ? <p className="text-sm text-slate-500">견적 후보를 불러오는 중...</p> : null}
                {planSearch.trim() && !candidatesLoading && candidates.length === 0 ? (
                  <p className="text-sm text-slate-500">검색 결과가 없습니다.</p>
                ) : null}

                <div className="grid gap-2">
                  {candidates.map((candidate) => (
                    <PlanCandidateCard
                      key={candidate.planVersionId}
                      candidate={candidate}
                      selected={selectedPlanVersionId === candidate.planVersionId}
                      onSelect={() => setSelectedPlanVersionId(candidate.planVersionId)}
                    />
                  ))}
                </div>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">매칭 메모 (선택)</span>
                  <textarea
                    value={matchNote}
                    onChange={(event) => setMatchNote(event.target.value)}
                    rows={3}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    placeholder="왜 이 견적서에 연결했는지 메모"
                  />
                </label>

                {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={!selectedPlanVersionId || matching}
                    onClick={() => void handleMatch()}
                  >
                    {matching ? '매칭 중...' : '이 견적서에 매칭'}
                  </Button>
                  {selectedItem.statusRow.manualMatchedPlanVersionId ? (
                    <Button variant="outline" disabled={unmatching} onClick={() => void handleUnmatch()}>
                      {unmatching ? '해제 중...' : '수동 매칭 해제'}
                    </Button>
                  ) : null}
                </div>
              </Card>

              <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">운영 메모 / 이력</p>
                  <p className="mt-1 text-sm text-slate-600">저장된 수동 매칭과 계산 제외 이력을 확인합니다.</p>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-slate-900">수동 매칭</p>
                    {selectedItem.statusRow.manualMatchedPlanVersionId ? (
                      <div className="mt-2 grid gap-1 text-slate-700">
                        <span>견적 버전: {selectedItem.statusRow.manualMatchedPlanVersionId}</span>
                        <span>매칭 시각: {formatDateTime(selectedItem.statusRow.manualMatchedAt)}</span>
                        {selectedItem.statusRow.manualMatchedByEmployeeId ? (
                          <span>처리자: {selectedItem.statusRow.manualMatchedByEmployeeId}</span>
                        ) : null}
                        {selectedItem.statusRow.manualMatchNote ? (
                          <span>메모: {selectedItem.statusRow.manualMatchNote}</span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-slate-500">수동 매칭 이력 없음</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-slate-900">계산 제외 이력</p>
                    {excludedSubmissions.length > 0 ? (
                      <div className="mt-2 grid gap-2">
                        {excludedSubmissions.map((submission) => (
                          <div key={submission.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="font-medium text-slate-900">{submissionPersonLabel(submission)}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              {formatDateTime(submission.excludedAt)}
                              {submission.exclusionReason ? ` · ${submission.exclusionReason}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-slate-500">계산 제외 이력 없음</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-slate-900">동기화 기준</p>
                    <div className="mt-2 grid gap-1 text-slate-700">
                      <span>최초 작성: {formatDateTime(selectedItem.statusRow.firstSubmittedAt)}</span>
                      <span>최근 작성: {formatDateTime(selectedItem.statusRow.lastSubmittedAt)}</span>
                      <span>상태 계산: {formatDateTime(selectedItem.statusRow.computedAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
              </>
              ) : null}
            </>
          )}
        </div>
      </div>
        </>
      )}
    </PageShell>
  );
}

function PlanCandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: ContractMatchPlanVersionCandidateRow;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>{candidate.userName}</p>
          <p className={`mt-1 text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>{candidate.planTitle}</p>
        </div>
        <span className={`text-xs font-semibold ${selected ? 'text-slate-200' : 'text-slate-600'}`}>
          v{candidate.versionNumber}
        </span>
      </div>
      <div className={`mt-3 grid gap-1 text-xs ${selected ? 'text-slate-200' : 'text-slate-600'} md:grid-cols-2`}>
        <span>문서번호: {candidate.documentNumber}</span>
        <span>총인원: {candidate.headcountTotal}명</span>
        <span>팀장: {candidate.leaderName}</span>
        <span>
          출발: {formatDate(candidate.travelStartDate)} ~ {formatDate(candidate.travelEndDate)}
        </span>
      </div>
      <div className={`mt-3 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
        <Link
          to={`/plans/${candidate.planId}/versions/${candidate.planVersionId}`}
          className={selected ? 'text-white underline' : 'text-blue-700 hover:text-blue-800'}
          onClick={(event) => event.stopPropagation()}
        >
          견적 상세 보기
        </Link>
      </div>
    </button>
  );
}
