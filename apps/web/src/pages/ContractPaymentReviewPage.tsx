import { Button, Card, Input, PageShell } from '@tour/ui';
import { normalizeContractPersonName } from '@tour/validation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  useContractMatchPlanVersionCandidates,
  useContractPaymentReceipts,
  useContractPaymentReviewReceipts,
  useContractPaymentReviewTabCounts,
  useContractPaymentStatuses,
  useCreateManualContractPaymentReceipt,
  useDeleteManualContractPaymentReceipt,
  useManualContractPaymentReceipts,
  useMatchContractPaymentReceipt,
  useRestoreContractPaymentReceiptReview,
  useTrashContractPaymentReceiptReview,
  useUnmatchContractPaymentReceipt,
  useUpdateManualContractPaymentReceipt,
  type ContractMatchPlanVersionCandidateRow,
  type ContractPaymentReceiptMatchMode,
  type ContractPaymentReceiptRow,
  type ContractPaymentReviewDocumentCandidateRow,
  type ContractPaymentReviewTabCountsRow,
  type ContractPaymentReviewVisibility,
} from '../features/contract/hooks';

type PageMode = 'sheet_review' | 'team_manage';
type TeamManageTabKey = 'add' | 'unlink';
type PaymentReviewTabKey = 'ambiguous' | 'name_mismatch' | 'trash';

const PAGE_MODE_TABS: Array<{ key: PageMode; label: string; description: string }> = [
  {
    key: 'sheet_review',
    label: '시트 검토',
    description: '입금 시트 row를 문서번호에 연결합니다.',
  },
  {
    key: 'team_manage',
    label: '팀별 수동 관리',
    description: '팀을 선택해 입금을 추가하거나 시트 연결을 해제합니다.',
  },
];

const TEAM_MANAGE_TABS: Array<{ key: TeamManageTabKey; label: string; description: string }> = [
  {
    key: 'add',
    label: '입금 추가',
    description: '시트에 없는 할인·별도 입금 row를 추가합니다.',
  },
  {
    key: 'unlink',
    label: '자동매칭 되돌리기',
    description: '이 팀에 연결된 시트 입금 row를 자동매칭 상태로 되돌립니다.',
  },
];

const PAYMENT_REVIEW_TABS: Array<{
  key: PaymentReviewTabKey;
  label: string;
  tooltip: string;
  reasons: string[];
}> = [
  {
    key: 'ambiguous',
    label: '동명이인',
    tooltip: '같은 이름의 계약서가 여러 건이라 문서번호를 특정할 수 없습니다',
    reasons: ['AMBIGUOUS_PAYER_NAME'],
  },
  {
    key: 'name_mismatch',
    label: '이름불일치',
    tooltip: '입금자명과 일치하는 계약서 작성자명 후보가 없습니다',
    reasons: ['NO_MATCHED_CONTRACT_SUBMISSION_NAME', 'MISSING_PAYER_NAME', 'INVALID_AMOUNT'],
  },
  {
    key: 'trash',
    label: '휴지통',
    tooltip: '검토에서 제외한 입금 row입니다. 복원하면 다시 검토 목록에 표시됩니다',
    reasons: [],
  },
];

const MAIN_PAYMENT_REVIEW_TABS = PAYMENT_REVIEW_TABS.filter((tab) => tab.key !== 'trash');
const TRASH_PAYMENT_REVIEW_TAB = PAYMENT_REVIEW_TABS.find((tab) => tab.key === 'trash')!;

function reviewVisibilityForTab(tab: PaymentReviewTabKey): ContractPaymentReviewVisibility {
  return tab === 'trash' ? 'HIDDEN' : 'VISIBLE';
}

function paymentTabCount(
  key: PaymentReviewTabKey,
  counts: ContractPaymentReviewTabCountsRow | null,
): number | null {
  if (!counts) {
    return null;
  }
  switch (key) {
    case 'ambiguous':
      return counts.ambiguousPayerName;
    case 'name_mismatch':
      return counts.nameMismatch;
    case 'trash':
      return counts.trashed;
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

function paymentReceiptStatusChipLabel(
  matched: boolean,
  tab: PaymentReviewTabKey,
  needsReviewReason?: string | null,
): string {
  if (tab === 'trash') {
    return paymentReviewReasonLabel(needsReviewReason) ?? '휴지통';
  }
  if (matched) {
    return '연결됨';
  }
  if (tab === 'ambiguous') {
    return '동명이인';
  }
  return '이름불일치';
}

function paymentMatchModeBadgeLabel(
  paymentMatchMode: ContractPaymentReceiptMatchMode,
  matched: boolean,
): string | null {
  if (paymentMatchMode === 'MANUAL_MATCH') {
    return '수동 연결';
  }
  if (matched) {
    return '자동 연결';
  }
  return null;
}

function HoverTooltip({
  content,
  align = 'left',
  placement = 'below',
  children,
}: {
  content: string;
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
  children: ReactNode;
}): JSX.Element {
  return (
    <span className="group/tooltip relative inline-flex max-w-full">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 hidden w-56 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-normal leading-snug text-slate-600 shadow-lg group-hover/tooltip:block group-focus-within/tooltip:block ${
          placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
        } ${align === 'right' ? 'right-0' : 'left-0'}`}
      >
        {content}
      </span>
    </span>
  );
}

function TooltipHelpIcon({
  content,
  align = 'left',
  placement = 'below',
  className,
}: {
  content: string;
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
  className?: string;
}): JSX.Element {
  return (
    <HoverTooltip content={content} align={align} placement={placement}>
      <span
        role="button"
        tabIndex={0}
        aria-label="도움말"
        className={`inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold leading-none text-slate-500 transition hover:border-slate-400 hover:text-slate-700 ${className ?? ''}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.stopPropagation();
          }
        }}
      >
        ?
      </span>
    </HoverTooltip>
  );
}

function formatKrw(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toLocaleString('ko-KR')}원`;
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

function formatPaymentReviewCandidateLabel(
  candidate: { representativeName: string; documentNumber: string },
): string {
  const name = candidate.representativeName.trim();
  if (name && name !== '-') {
    return `${name} 팀 · ${candidate.documentNumber}`;
  }
  return candidate.documentNumber;
}

function RoundedSelectionCheck({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white ${className ?? ''}`}
      aria-hidden
    >
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

function PaymentReviewCandidateDepositSummary({
  candidate,
}: {
  candidate: ContractPaymentReviewDocumentCandidateRow;
}): JSX.Element | null {
  if (candidate.requiredTotalKrw == null && candidate.receivedTotalKrw === 0) {
    return null;
  }

  const hasTeamPaymentReferences = candidate.teamPaymentReferences.length > 1;

  return (
    <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-3">
      <p className="text-sm font-semibold text-slate-900">입금액 요약</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white px-3 py-2">
          <span className="text-slate-500">현재 입금합계</span>
          <p className="mt-1 font-semibold text-slate-900">{formatKrw(candidate.receivedTotalKrw)}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <span className="text-slate-500">입금 필요액</span>
          <p className="mt-1 font-semibold text-slate-900">{formatKrw(candidate.requiredTotalKrw)}</p>
        </div>
        <div className="col-span-2 rounded-xl bg-white px-3 py-2">
          <span className="text-slate-500">남은 입금액</span>
          <p
            className={
              candidate.remainingTotalKrw === 0
                ? 'mt-1 font-semibold text-emerald-700'
                : 'mt-1 font-semibold text-orange-600'
            }
          >
            {formatKrw(candidate.remainingTotalKrw)}
          </p>
        </div>
      </div>
      {candidate.teamPaymentReferences.length > 0 ? (
        <div className="mt-3 border-t border-orange-100 pt-3">
          <p className="text-xs font-semibold text-slate-700">입금 계산 기준</p>
          <div className="mt-2 grid gap-2">
            {candidate.teamPaymentReferences.map((row) => (
              <div key={`${candidate.documentNumber}-${row.teamName}`} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                <span className="font-medium text-slate-900">
                  {row.teamName}({row.headcount}명)
                </span>{' '}
                예약금 {formatKrw(row.depositAmountKrw)}
                {row.securityAmountKrw > 0 ? (
                  <>
                    {' '}
                    + {row.securityLabel} {formatKrw(row.securityAmountKrw)}
                  </>
                ) : null}
                {' = '}
                <span className="font-semibold text-orange-600">
                  {formatKrw(row.requiredReferenceKrw)}
                </span>
                {!hasTeamPaymentReferences ? null : (
                  <span className="text-slate-500">
                    {' '}
                    * {row.headcount}명 기준 합계 {formatKrw(row.requiredTotalKrw)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().slice(0, 10);
}

function paymentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'NOT_STARTED':
      return '미입금';
    case 'PARTIAL':
      return '부분입금';
    case 'COMPLETED':
      return '입금완료';
    case 'OVERPAID':
      return '초과입금';
    case 'NEEDS_REVIEW':
      return '검토필요';
    default:
      return status ?? '-';
  }
}

function formatSignedAmountInput(value: string): string {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const digits = trimmed.replace(/-/g, '').replace(/[^\d]/g, '');
  return negative ? `-${digits}` : digits;
}

function manualReceiptKindLabel(amountKrw: number | null | undefined): string | null {
  if (amountKrw == null || amountKrw === 0) {
    return null;
  }
  return amountKrw < 0 ? '환불' : '수동 추가';
}

function TeamPaymentManageSection(): JSX.Element {
  const [teamManageTab, setTeamManageTab] = useState<TeamManageTabKey>('add');
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<ContractMatchPlanVersionCandidateRow | null>(null);
  const [payerName, setPayerName] = useState('');
  const [amountKrw, setAmountKrw] = useState('');
  const [receivedAt, setReceivedAt] = useState(formatDateInputValue(new Date().toISOString()));
  const [memo, setMemo] = useState('');
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [manualErrorMessage, setManualErrorMessage] = useState<string | null>(null);

  const normalizedTeamSearch = teamSearch.trim();
  const { candidates: teamCandidates, loading: teamCandidatesLoading } =
    useContractMatchPlanVersionCandidates(normalizedTeamSearch);
  const { statuses: paymentStatuses, refetch: refetchPaymentStatuses } = useContractPaymentStatuses(
    selectedDocumentNumber ? [selectedDocumentNumber] : [],
  );
  const { receipts: manualReceipts, loading: manualReceiptsLoading, refetch: refetchManualReceipts } =
    useManualContractPaymentReceipts(selectedDocumentNumber || undefined);
  const { receipts: teamReceipts, loading: teamReceiptsLoading, refetch: refetchTeamReceipts } =
    useContractPaymentReceipts(selectedDocumentNumber || undefined);
  const { unmatchContractPaymentReceipt, loading: resettingSheetReceipt } = useUnmatchContractPaymentReceipt();
  const { createManualContractPaymentReceipt, loading: creatingManualReceipt } = useCreateManualContractPaymentReceipt();
  const { updateManualContractPaymentReceipt, loading: updatingManualReceipt } = useUpdateManualContractPaymentReceipt();
  const { deleteManualContractPaymentReceipt, loading: deletingManualReceipt } = useDeleteManualContractPaymentReceipt();

  const selectedPaymentStatus = paymentStatuses[0] ?? null;
  const remainingAmountKrw = selectedPaymentStatus?.requiredAmountKrw == null
    ? null
    : Math.max(0, selectedPaymentStatus.requiredAmountKrw - selectedPaymentStatus.receivedAmountKrw);
  const sheetLinkedReceipts = useMemo(
    () => teamReceipts.filter((receipt) => receipt.source.type === 'GOOGLE_SHEET'),
    [teamReceipts],
  );
  const teamManageTabConfig = TEAM_MANAGE_TABS.find((tab) => tab.key === teamManageTab) ?? TEAM_MANAGE_TABS[0]!;

  const resetManualForm = () => {
    setPayerName('');
    setAmountKrw('');
    setReceivedAt(formatDateInputValue(new Date().toISOString()));
    setMemo('');
    setEditingReceiptId(null);
    setManualErrorMessage(null);
  };

  const handleSelectTeam = (candidate: ContractMatchPlanVersionCandidateRow) => {
    setSelectedDocumentNumber(candidate.documentNumber);
    setSelectedCandidate(candidate);
    resetManualForm();
  };

  const handleEditManualReceipt = (receipt: ContractPaymentReceiptRow) => {
    setEditingReceiptId(receipt.id);
    setPayerName(receipt.payerNameRaw ?? '');
    setAmountKrw(receipt.amountKrw != null ? String(receipt.amountKrw) : '');
    setReceivedAt(formatDateInputValue(receipt.receivedAt));
    setMemo(receipt.memo ?? '');
    setManualErrorMessage(null);
    if (receipt.matchedDocumentNumberNorm) {
      setSelectedDocumentNumber(receipt.matchedDocumentNumberNorm);
    }
  };

  const refreshManualSection = async () => {
    await Promise.all([refetchManualReceipts(), refetchPaymentStatuses()]);
  };

  const refreshTeamSection = async () => {
    await Promise.all([refetchTeamReceipts(), refetchPaymentStatuses(), refetchManualReceipts()]);
  };

  const handleResetSheetReceipt = async (receiptId: string) => {
    setManualErrorMessage(null);
    try {
      await unmatchContractPaymentReceipt(receiptId);
      await refreshTeamSection();
    } catch (error) {
      setManualErrorMessage(error instanceof Error ? error.message : '자동매칭 되돌리기에 실패했습니다.');
    }
  };

  const handleSubmitManualReceipt = async () => {
    if (!selectedDocumentNumber.trim()) {
      setManualErrorMessage('먼저 팀/문서번호를 선택해주세요.');
      return;
    }

    const parsedAmount = Number(amountKrw.replace(/,/g, ''));
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount === 0) {
      setManualErrorMessage('금액은 0원이 아닌 정수로 입력해주세요. 환불은 마이너스(-)로 입력하세요.');
      return;
    }

    setManualErrorMessage(null);
    try {
      const payload = {
        documentNumber: selectedDocumentNumber.trim(),
        payerName: payerName.trim() || null,
        amountKrw: parsedAmount,
        receivedAt: receivedAt ? new Date(`${receivedAt}T00:00:00`).toISOString() : null,
        memo: memo.trim() || null,
      };

      if (editingReceiptId) {
        await updateManualContractPaymentReceipt({
          receiptId: editingReceiptId,
          ...payload,
        });
      } else {
        await createManualContractPaymentReceipt(payload);
      }

      resetManualForm();
      await refreshManualSection();
    } catch (error) {
      setManualErrorMessage(error instanceof Error ? error.message : '수동 입금 저장에 실패했습니다.');
    }
  };

  const handleDeleteManualReceipt = async (receiptId: string) => {
    setManualErrorMessage(null);
    try {
      await deleteManualContractPaymentReceipt(receiptId);
      if (editingReceiptId === receiptId) {
        resetManualForm();
      }
      await refreshManualSection();
    } catch (error) {
      setManualErrorMessage(error instanceof Error ? error.message : '수동 입금 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        {TEAM_MANAGE_TABS.map((tab) => {
          const active = tab.key === teamManageTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setTeamManageTab(tab.key);
                setManualErrorMessage(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-900">팀/문서번호 검색</p>
          <p className="mt-1 text-sm text-slate-600">{teamManageTabConfig.description}</p>
        </div>
        <Input
          value={teamSearch}
          onChange={(event) => setTeamSearch(event.target.value)}
          placeholder="고객명, 문서번호, 팀장명 검색"
        />
        {teamCandidatesLoading ? <p className="text-sm text-slate-500">팀 후보를 불러오는 중...</p> : null}
        {!teamCandidatesLoading && normalizedTeamSearch && teamCandidates.length === 0 ? (
          <p className="text-sm text-slate-500">연결 가능한 팀을 찾지 못했어요</p>
        ) : null}
        <div className="grid max-h-[60vh] gap-2 overflow-y-auto">
          {teamCandidates.map((candidate) => {
            const selected = selectedDocumentNumber === candidate.documentNumber;
            return (
              <button
                key={candidate.planVersionId}
                type="button"
                aria-pressed={selected}
                onClick={() => handleSelectTeam(candidate)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>
                    {candidate.userName} · {candidate.documentNumber}
                  </p>
                  {selected ? <RoundedSelectionCheck /> : null}
                </div>
                <p className={`mt-1 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                  v{candidate.versionNumber} · {candidate.leaderName}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4">
        {!selectedDocumentNumber ? (
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            왼쪽에서 팀/문서번호를 선택해주세요.
          </Card>
        ) : (
          <>
            <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">선택한 팀</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {selectedCandidate?.userName ?? '-'} · {selectedDocumentNumber}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedCandidate ? `v${selectedCandidate.versionNumber} · ${selectedCandidate.leaderName}` : null}
                  </p>
                </div>
                {selectedPaymentStatus ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {paymentStatusLabel(selectedPaymentStatus.status)}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">현재 입금합계</span>
                  <p className="mt-1 font-semibold text-slate-900">{formatKrw(selectedPaymentStatus?.receivedAmountKrw)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">입금 필요액</span>
                  <p className="mt-1 font-semibold text-slate-900">{formatKrw(selectedPaymentStatus?.requiredAmountKrw)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">남은 입금액</span>
                  <p className="mt-1 font-semibold text-orange-600">{formatKrw(remainingAmountKrw)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">
                    {teamManageTab === 'add' ? '수동 추가 건수' : '시트 연결 건수'}
                  </span>
                  <p className="mt-1 font-semibold text-slate-900">
                    {teamManageTab === 'add' ? manualReceipts.length : sheetLinkedReceipts.length}건
                  </p>
                </div>
              </div>
            </Card>

            {teamManageTab === 'add' ? (
              <>
            <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {editingReceiptId ? '수동 입금 수정' : '수동 입금 추가'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  시트에 없는 할인카드·별도 입금은 양수, 환불은 마이너스(-)로 입력하세요.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={payerName}
                  onChange={(event) => setPayerName(event.target.value)}
                  placeholder="입금자명 (선택)"
                />
                <Input
                  value={amountKrw}
                  onChange={(event) => setAmountKrw(formatSignedAmountInput(event.target.value))}
                  placeholder="금액 (원, 환불은 -)"
                />
                <Input
                  type="date"
                  value={receivedAt}
                  onChange={(event) => setReceivedAt(event.target.value)}
                />
                <Input
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="메모 (예: 할인카드, 현장 입금)"
                />
              </div>
              {manualErrorMessage ? <p className="text-sm text-rose-600">{manualErrorMessage}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={creatingManualReceipt || updatingManualReceipt}
                  onClick={() => void handleSubmitManualReceipt()}
                >
                  {creatingManualReceipt || updatingManualReceipt
                    ? '저장 중...'
                    : editingReceiptId
                      ? '수정 저장'
                      : '수동 입금 추가'}
                </Button>
                {editingReceiptId ? (
                  <Button variant="outline" onClick={resetManualForm}>
                    수정 취소
                  </Button>
                ) : null}
              </div>
            </Card>

            <Card className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">이 팀의 수동 입금 내역</p>
                  <p className="mt-1 text-sm text-slate-600">수동으로 추가한 row만 표시됩니다.</p>
                </div>
                <Button variant="outline" onClick={() => void refreshManualSection()}>
                  새로고침
                </Button>
              </div>
              {manualReceiptsLoading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
              {!manualReceiptsLoading && manualReceipts.length === 0 ? (
                <p className="text-sm text-slate-500">아직 수동으로 추가한 입금 row가 없습니다.</p>
              ) : null}
              <div className="grid gap-2">
                {manualReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {receipt.payerNameRaw?.trim() || '이름 없음'}
                          </p>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            (receipt.amountKrw ?? 0) < 0
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                          }`}>
                            {manualReceiptKindLabel(receipt.amountKrw) ?? '수동 추가'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          <span className={`text-sm font-bold tabular-nums ${
                            (receipt.amountKrw ?? 0) < 0 ? 'text-rose-700' : 'text-slate-900'
                          }`}>
                            {formatKrw(receipt.amountKrw)}
                          </span>
                          {' · '}
                          {formatDate(receipt.receivedAt)}
                        </p>
                        {receipt.memo ? (
                          <p className="mt-2 text-xs text-slate-600">{receipt.memo}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => handleEditManualReceipt(receipt)}>
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          disabled={deletingManualReceipt}
                          onClick={() => void handleDeleteManualReceipt(receipt.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
              </>
            ) : (
            <Card className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">연결된 시트 입금</p>
                  <p className="mt-1 text-sm text-slate-600">
                    자동매칭 되돌리기를 누르면 연결이 해제되고, 동명이인 등 조건이면 검토 탭에 다시 표시됩니다.
                  </p>
                </div>
                <Button variant="outline" onClick={() => void refreshTeamSection()}>
                  새로고침
                </Button>
              </div>
              {manualErrorMessage ? <p className="text-sm text-rose-600">{manualErrorMessage}</p> : null}
              {teamReceiptsLoading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
              {!teamReceiptsLoading && sheetLinkedReceipts.length === 0 ? (
                <p className="text-sm text-slate-500">이 팀에 연결된 시트 입금 row가 없습니다.</p>
              ) : null}
              <div className="grid gap-2">
                {sheetLinkedReceipts.map((receipt) => {
                  const matchModeBadge = paymentMatchModeBadgeLabel(
                    receipt.paymentMatchMode,
                    Boolean(receipt.matchedDocumentNumberNorm),
                  );
                  return (
                    <div
                      key={receipt.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {receipt.payerNameRaw?.trim() || '이름 없음'}
                            </p>
                            {matchModeBadge ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {matchModeBadge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            <span className="text-sm font-bold tabular-nums text-slate-900">
                              {formatKrw(receipt.amountKrw)}
                            </span>
                            {' · '}
                            {formatDate(receipt.receivedAt)}
                            {receipt.sourceRowNumber != null ? (
                              <>
                                {' · '}
                                시트 {receipt.sourceRowNumber}행
                              </>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            disabled={resettingSheetReceipt}
                            onClick={() => void handleResetSheetReceipt(receipt.id)}
                          >
                            {resettingSheetReceipt ? '되돌리는 중...' : '자동매칭 되돌리기'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}

function SheetReviewSection(): JSX.Element {
  const [activeTab, setActiveTab] = useState<PaymentReviewTabKey>('ambiguous');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [selectedSheetDocumentNumber, setSelectedSheetDocumentNumber] = useState('');
  const [selectedPlanDocumentNumber, setSelectedPlanDocumentNumber] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  const activeTabConfig = PAYMENT_REVIEW_TABS.find((tab) => tab.key === activeTab) ?? PAYMENT_REVIEW_TABS[0]!;
  const isTrashView = activeTab === 'trash';
  const normalizedPaymentSearch = paymentSearch.trim();
  const { counts: paymentTabCounts, refetch: refetchPaymentTabCounts } = useContractPaymentReviewTabCounts();
  const { items: paymentItems, loading: paymentLoading, refetch: refetchPaymentItems } =
    useContractPaymentReviewReceipts(
      normalizedPaymentSearch,
      activeTabConfig.reasons,
      undefined,
      reviewVisibilityForTab(activeTab),
    );
  const { matchContractPaymentReceipt, loading: matchingPayment } = useMatchContractPaymentReceipt();
  const { trashContractPaymentReceiptReview, loading: trashingPayment } = useTrashContractPaymentReceiptReview();
  const { restoreContractPaymentReceiptReview, loading: restoringPayment } = useRestoreContractPaymentReceiptReview();
  const { candidates: paymentPlanCandidates, loading: paymentCandidatesLoading } =
    useContractMatchPlanVersionCandidates(planSearch);

  useEffect(() => {
    setSelectedReceiptId(null);
  }, [normalizedPaymentSearch, activeTab]);

  useEffect(() => {
    if (!selectedReceiptId && paymentItems.length > 0) {
      setSelectedReceiptId(paymentItems[0]?.receipt.id ?? null);
    }
    if (selectedReceiptId && !paymentItems.some((item) => item.receipt.id === selectedReceiptId)) {
      setSelectedReceiptId(paymentItems[0]?.receipt.id ?? null);
    }
  }, [paymentItems, selectedReceiptId]);

  const selectedPaymentItem = useMemo(
    () => paymentItems.find((item) => item.receipt.id === selectedReceiptId) ?? null,
    [paymentItems, selectedReceiptId],
  );
  const payerNameKey = normalizeContractPersonName(selectedPaymentItem?.receipt.payerNameRaw);

  useEffect(() => {
    if (!selectedPaymentItem) {
      setSelectedSheetDocumentNumber('');
      setSelectedPlanDocumentNumber('');
      setPlanSearch('');
      setPaymentErrorMessage(null);
      return;
    }
    const matchedDocumentNumber = selectedPaymentItem.receipt.matchedDocumentNumberNorm ?? '';
    setSelectedSheetDocumentNumber('');
    setSelectedPlanDocumentNumber(matchedDocumentNumber);
    setPlanSearch(matchedDocumentNumber);
    setPaymentErrorMessage(null);
  }, [selectedPaymentItem?.receipt.id]);

  const handleSelectCandidateDocumentNumber = (documentNumber: string) => {
    setSelectedSheetDocumentNumber(documentNumber);
    setPlanSearch(documentNumber);
    setPaymentErrorMessage(null);
  };

  const refreshPage = async () => {
    await Promise.all([refetchPaymentItems(), refetchPaymentTabCounts()]);
  };

  const handleMatchPayment = async () => {
    if (!selectedPaymentItem) {
      return;
    }
    const documentNumber = (selectedPlanDocumentNumber || selectedSheetDocumentNumber).trim();
    if (!documentNumber) {
      setPaymentErrorMessage('연결할 문서번호를 후보 또는 견적 검색에서 선택해주세요.');
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

  const handleTrashPayment = async () => {
    if (!selectedPaymentItem || isTrashView) {
      return;
    }

    setPaymentErrorMessage(null);
    try {
      await trashContractPaymentReceiptReview({ receiptId: selectedPaymentItem.receipt.id });
      await refreshPage();
    } catch (error) {
      setPaymentErrorMessage(error instanceof Error ? error.message : '휴지통 이동에 실패했습니다.');
    }
  };

  const handleRestorePayment = async () => {
    if (!selectedPaymentItem || !isTrashView) {
      return;
    }

    setPaymentErrorMessage(null);
    try {
      const restored = await restoreContractPaymentReceiptReview(selectedPaymentItem.receipt.id);
      if (restored.needsReviewReason === 'AMBIGUOUS_PAYER_NAME') {
        setActiveTab('ambiguous');
      } else if (
        restored.needsReviewReason === 'NO_MATCHED_CONTRACT_SUBMISSION_NAME'
        || restored.needsReviewReason === 'MISSING_PAYER_NAME'
        || restored.needsReviewReason === 'INVALID_AMOUNT'
      ) {
        setActiveTab('name_mismatch');
      }
      await refreshPage();
    } catch (error) {
      setPaymentErrorMessage(error instanceof Error ? error.message : '휴지통 복원에 실패했습니다.');
    }
  };

  return (
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

      <div className="flex flex-wrap items-center gap-2">
        {MAIN_PAYMENT_REVIEW_TABS.map((tab) => {
          const active = tab.key === activeTab;
          const count = paymentTabCount(tab.key, paymentTabCounts);
          const isNameMismatchTab = tab.key === 'name_mismatch';
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? isNameMismatchTab
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-slate-900 bg-slate-900 text-white'
                  : isNameMismatchTab
                    ? 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {count != null ? (
                <span
                  className={
                    active
                      ? isNameMismatchTab
                        ? 'text-violet-200'
                        : 'text-slate-300'
                      : isNameMismatchTab
                        ? 'text-violet-500'
                        : 'text-slate-500'
                  }
                >
                  {' '}
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setActiveTab(TRASH_PAYMENT_REVIEW_TAB.key)}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            activeTab === TRASH_PAYMENT_REVIEW_TAB.key
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {TRASH_PAYMENT_REVIEW_TAB.label}
          {paymentTabCount('trash', paymentTabCounts) != null ? (
            <span className={activeTab === TRASH_PAYMENT_REVIEW_TAB.key ? 'text-slate-300' : 'text-slate-500'}>
              {' '}
              {paymentTabCount('trash', paymentTabCounts)}
            </span>
          ) : null}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="flex max-h-[78vh] flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex shrink-0 items-start justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-900">{activeTabConfig.label}</p>
              <TooltipHelpIcon content={activeTabConfig.tooltip} />
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {paymentTabCount(activeTab, paymentTabCounts) ?? paymentItems.length}
            </span>
          </div>

          <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto">
          {paymentLoading ? <p className="px-2 py-4 text-sm text-slate-500">불러오는 중...</p> : null}
          {!paymentLoading && paymentItems.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">표시할 입금 row가 없습니다.</p>
          ) : null}

          {paymentItems.map((item) => {
            const active = item.receipt.id === selectedReceiptId;
            const receipt = item.receipt;
            const isNameMismatchTab = activeTab === 'name_mismatch';
            const isMatched = Boolean(receipt.matchedDocumentNumberNorm);
            const matchModeBadge = paymentMatchModeBadgeLabel(receipt.paymentMatchMode, isMatched);
            const chipLabel = matchModeBadge ?? paymentReceiptStatusChipLabel(isMatched, activeTab, receipt.needsReviewReason);
            return (
              <button
                key={receipt.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedReceiptId(receipt.id)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? isTrashView
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : isNameMismatchTab
                        ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                        : 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : isTrashView
                      ? 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-50'
                      : isMatched
                        ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50'
                        : isNameMismatchTab
                          ? 'border-violet-200 bg-violet-50/40 hover:border-violet-300 hover:bg-violet-50'
                          : 'border-rose-200 bg-rose-50/40 hover:border-rose-300 hover:bg-rose-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>
                      {receipt.payerNameRaw ?? '이름 없음'}
                    </p>
                    <p className={`mt-1 flex flex-wrap items-baseline gap-x-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                      <span className={`text-sm font-bold tabular-nums ${active ? 'text-white' : 'text-slate-900'}`}>
                        {formatKrw(receipt.amountKrw)}
                      </span>
                      <span>·</span>
                      <span>{formatDate(receipt.receivedAt)}</span>
                      {receipt.sourceRowNumber != null ? (
                        <>
                          <span>·</span>
                          <span>시트 {receipt.sourceRowNumber}행</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      active
                        ? isNameMismatchTab
                          ? 'border-violet-400 bg-violet-500 text-violet-50'
                          : 'border-slate-600 bg-slate-800 text-slate-100'
                        : isMatched
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : isNameMismatchTab
                            ? 'border-violet-200 bg-violet-50 text-violet-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {chipLabel}
                  </span>
                </div>
                {!isTrashView && receipt.needsReviewReason !== 'AMBIGUOUS_PAYER_NAME' ? (
                  <p className={`mt-2 text-xs ${active ? 'text-slate-200' : 'text-slate-600'}`}>
                    {paymentReviewReasonLabel(receipt.needsReviewReason)}
                  </p>
                ) : null}
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
          </div>
        </Card>

        <div className="grid gap-4">
          {!selectedPaymentItem ? (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              왼쪽에서 입금 row를 선택해주세요.
            </Card>
          ) : (
            <>
              <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold text-slate-900">
                      <span>{selectedPaymentItem.receipt.payerNameRaw ?? '이름 없음'}</span>
                      <span className="text-base font-normal text-slate-400">·</span>
                      <span className="font-bold tabular-nums tracking-tight">
                        {formatKrw(selectedPaymentItem.receipt.amountKrw)}
                      </span>
                    </h2>
                    {(() => {
                      const isMatched = Boolean(selectedPaymentItem.receipt.matchedDocumentNumberNorm);
                      const matchModeBadge = paymentMatchModeBadgeLabel(
                        selectedPaymentItem.receipt.paymentMatchMode,
                        isMatched,
                      );
                      if (!matchModeBadge) {
                        return null;
                      }
                      return (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          {matchModeBadge}
                        </span>
                      );
                    })()}
                  </div>

                {isTrashView ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">
                      {paymentReviewReasonLabel(selectedPaymentItem.receipt.needsReviewReason)} row를 검토에서 제외한 상태입니다.
                    </p>
                    {selectedPaymentItem.receipt.reviewTrashedAt ? (
                      <p className="text-sm text-slate-500">
                        휴지통 이동 · {formatDateTime(selectedPaymentItem.receipt.reviewTrashedAt)}
                      </p>
                    ) : null}
                    {selectedPaymentItem.receipt.reviewTrashReason ? (
                      <p className="text-sm text-slate-600">사유: {selectedPaymentItem.receipt.reviewTrashReason}</p>
                    ) : null}
                  </div>
                ) : null}

                {!isTrashView && activeTab === 'ambiguous' ? (
                  selectedPaymentItem.candidateDocumentNumbers.length > 0 ? (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <p className="text-sm leading-snug text-slate-600">
                          <span className="font-normal">계약서 시트에서 </span>
                          {selectedPaymentItem.receipt.payerNameRaw?.trim() ? (
                            <>
                              <span className="font-normal">&apos;</span>
                              <span className="font-bold text-slate-900">
                                {selectedPaymentItem.receipt.payerNameRaw.trim()}
                              </span>
                              <span className="font-normal">&apos; 님이 속한</span>
                            </>
                          ) : (
                            <span className="font-normal">속한</span>
                          )}
                        </p>
                        <p className="text-sm font-normal leading-snug text-slate-600">
                          문서번호들을 모두 조회했어요
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {selectedPaymentItem.candidateDocumentNumbers.map((candidate) => {
                          const selected = selectedSheetDocumentNumber === candidate.documentNumber;
                          return (
                            <button
                              key={candidate.documentNumber}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => handleSelectCandidateDocumentNumber(candidate.documentNumber)}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatPaymentReviewCandidateLabel(candidate)}
                                </p>
                                {selected ? <RoundedSelectionCheck /> : null}
                              </div>
                              {candidate.memberDeposits.length > 0 ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-medium text-slate-500">팀원</span>
                                  {candidate.memberDeposits.map((deposit) => {
                                    const isMatchedMember =
                                      payerNameKey != null && normalizeContractPersonName(deposit.name) === payerNameKey;
                                    return (
                                      <span
                                        key={deposit.name}
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                          isMatchedMember
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {deposit.name}
                                        {deposit.receivedAmountKrw > 0 ? (
                                          <span className="tabular-nums"> · {formatKrw(deposit.receivedAmountKrw)}</span>
                                        ) : !isMatchedMember && deposit.requiredReferenceAmountKrw != null ? (
                                          <span className="text-slate-400">
                                            {' '}
                                            · 0/{formatKrw(deposit.requiredReferenceAmountKrw)}
                                          </span>
                                        ) : null}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : null}
                              {selected ? (
                                <PaymentReviewCandidateDepositSummary candidate={candidate} />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      계약서 작성자명과 일치하는 문서번호 후보가 없습니다. 아래에서 견적을 검색해 선택하세요.
                    </div>
                  )
                ) : null}
                </div>
              </Card>

              {!isTrashView ? (
              <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">ERP 견적서에 연결해요</p>
                  <p className="mt-1 text-sm text-slate-600">
                    견적 검색으로 찾아 연결할 문서번호를 선택하세요.
                  </p>
                </div>

                <Input
                  value={planSearch}
                  onChange={(event) => setPlanSearch(event.target.value)}
                  placeholder="견적 검색 (고객명, 문서번호, 팀장명)"
                />

                {paymentCandidatesLoading ? (
                  <p className="text-sm text-slate-500">견적 후보를 불러오는 중...</p>
                ) : null}
                {planSearch.trim() && !paymentCandidatesLoading && paymentPlanCandidates.length === 0 ? (
                  <p className="text-sm text-slate-500">연결 가능한 견적서를 찾지 못했어요</p>
                ) : null}

                <div className="grid gap-2">
                  {paymentPlanCandidates.map((candidate) => {
                    const planSelected = selectedPlanDocumentNumber === candidate.documentNumber;
                    return (
                    <button
                      key={candidate.planVersionId}
                      type="button"
                      aria-pressed={planSelected}
                      onClick={() => setSelectedPlanDocumentNumber(candidate.documentNumber)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                          <span>
                            {candidate.userName} · {candidate.documentNumber}
                          </span>
                          {candidate.isCurrent ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              current
                            </span>
                          ) : null}
                        </p>
                        {planSelected ? <RoundedSelectionCheck /> : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        v{candidate.versionNumber} · {candidate.leaderName}
                      </p>
                    </button>
                    );
                  })}
                </div>

                {paymentErrorMessage ? <p className="text-sm text-rose-600">{paymentErrorMessage}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={
                      !(selectedPlanDocumentNumber.trim() || selectedSheetDocumentNumber.trim()) || matchingPayment
                    }
                    onClick={() => void handleMatchPayment()}
                  >
                    {matchingPayment ? '연결 중...' : '이 문서번호에 연결'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={trashingPayment}
                    onClick={() => void handleTrashPayment()}
                  >
                    {trashingPayment ? '이동 중...' : '휴지통으로 이동'}
                  </Button>
                </div>
              </Card>
              ) : (
              <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                {paymentErrorMessage ? <p className="text-sm text-rose-600">{paymentErrorMessage}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={restoringPayment}
                    onClick={() => void handleRestorePayment()}
                  >
                    {restoringPayment ? '복원 중...' : '검토 목록으로 복원'}
                  </Button>
                </div>
              </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function ContractPaymentReviewPage(): JSX.Element {
  const [pageMode, setPageMode] = useState<PageMode>('sheet_review');
  const { counts: paymentTabCounts, refetch: refetchPaymentTabCounts } = useContractPaymentReviewTabCounts();

  const refreshHeaderCounts = async () => {
    await refetchPaymentTabCounts();
  };

  return (
    <PageShell className="grid gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">입금내역 관리</h1>
          <p className="mt-1 text-sm text-slate-600">
            {PAGE_MODE_TABS.find((tab) => tab.key === pageMode)?.description}
            {pageMode === 'sheet_review' && paymentTabCounts?.all != null ? (
              <span className="ml-1 font-medium text-slate-800">검토 필요 {paymentTabCounts.all}건</span>
            ) : null}
          </p>
        </div>
        {pageMode === 'sheet_review' ? (
          <Button variant="outline" onClick={() => void refreshHeaderCounts()}>
            새로고침
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {PAGE_MODE_TABS.map((tab) => {
          const active = tab.key === pageMode;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPageMode(tab.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {pageMode === 'sheet_review' ? <SheetReviewSection /> : <TeamPaymentManageSection />}
    </PageShell>
  );
}
