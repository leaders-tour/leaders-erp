import { Button, Card, Input, PageShell } from '@tour/ui';
import { normalizeContractPersonName } from '@tour/validation';
import { useEffect, useMemo, useState } from 'react';
import {
  useContractMatchPlanVersionCandidates,
  useContractPaymentReviewReceipts,
  useContractPaymentReviewTabCounts,
  useMatchContractPaymentReceipt,
  useUnmatchContractPaymentReceipt,
  type ContractPaymentReviewTabCountsRow,
} from '../features/contract/hooks';

type PaymentReviewTabKey = 'ambiguous' | 'name_mismatch';

const PAYMENT_REVIEW_TABS: Array<{
  key: PaymentReviewTabKey;
  label: string;
  description: string;
  reasons: string[];
}> = [
  {
    key: 'ambiguous',
    label: '동명이인',
    description: '같은 이름의 계약서가 여러 건이라 문서번호를 특정할 수 없습니다',
    reasons: ['AMBIGUOUS_PAYER_NAME'],
  },
  {
    key: 'name_mismatch',
    label: '이름불일치',
    description: '입금자명과 일치하는 계약서 작성자명 후보가 없습니다',
    reasons: ['NO_MATCHED_CONTRACT_SUBMISSION_NAME', 'MISSING_PAYER_NAME', 'INVALID_AMOUNT'],
  },
];

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
): string {
  if (matched) {
    return '연결됨';
  }
  if (tab === 'ambiguous') {
    return '동명이인';
  }
  return '이름불일치';
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

export function ContractPaymentReviewPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<PaymentReviewTabKey>('ambiguous');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [documentNumberDraft, setDocumentNumberDraft] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  const activeTabConfig = PAYMENT_REVIEW_TABS.find((tab) => tab.key === activeTab) ?? PAYMENT_REVIEW_TABS[0]!;
  const normalizedPaymentSearch = paymentSearch.trim();
  const { counts: paymentTabCounts, refetch: refetchPaymentTabCounts } = useContractPaymentReviewTabCounts();
  const { items: paymentItems, loading: paymentLoading, refetch: refetchPaymentItems } =
    useContractPaymentReviewReceipts(normalizedPaymentSearch, activeTabConfig.reasons);
  const { matchContractPaymentReceipt, loading: matchingPayment } = useMatchContractPaymentReceipt();
  const { unmatchContractPaymentReceipt, loading: unmatchingPayment } = useUnmatchContractPaymentReceipt();
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
      setDocumentNumberDraft('');
      setPlanSearch('');
      setPaymentErrorMessage(null);
      return;
    }
    const initialDocumentNumber =
      selectedPaymentItem.receipt.matchedDocumentNumberNorm
        ?? selectedPaymentItem.candidateDocumentNumbers[0]?.documentNumber
        ?? '';
    setDocumentNumberDraft(initialDocumentNumber);
    setPlanSearch(
      activeTab === 'ambiguous' && initialDocumentNumber && !selectedPaymentItem.receipt.matchedDocumentNumberNorm
        ? initialDocumentNumber
        : '',
    );
    setPaymentErrorMessage(null);
  }, [activeTab, selectedPaymentItem?.receipt.id]);

  const handleSelectCandidateDocumentNumber = (documentNumber: string) => {
    setDocumentNumberDraft(documentNumber);
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
    const documentNumber = documentNumberDraft.trim();
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">입금내역 관리</h1>
          <p className="mt-1 text-sm text-slate-600">
            입금 시트에서 가져온 미매칭·중복 row를 확인하고 계약 문서번호에 수동 연결합니다.
            {paymentTabCounts?.all != null ? (
              <span className="ml-1 font-medium text-slate-800">검토 필요 {paymentTabCounts.all}건</span>
            ) : null}
          </p>
        </div>
        <Button variant="outline" onClick={() => void refreshPage()}>
          새로고침
        </Button>
      </header>

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

      <div className="flex flex-wrap gap-2">
        {PAYMENT_REVIEW_TABS.map((tab) => {
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="grid max-h-[78vh] gap-2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2 px-2 py-1">
            <div>
              <p className="text-sm font-semibold text-slate-900">{activeTabConfig.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{activeTabConfig.description}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {paymentTabCount(activeTab, paymentTabCounts) ?? paymentItems.length}
            </span>
          </div>

          {paymentLoading ? <p className="px-2 py-4 text-sm text-slate-500">불러오는 중...</p> : null}
          {!paymentLoading && paymentItems.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">표시할 입금 row가 없습니다.</p>
          ) : null}

          {paymentItems.map((item) => {
            const active = item.receipt.id === selectedReceiptId;
            const receipt = item.receipt;
            const isNameMismatchTab = activeTab === 'name_mismatch';
            const isMatched = Boolean(receipt.matchedDocumentNumberNorm);
            return (
              <button
                key={receipt.id}
                type="button"
                onClick={() => setSelectedReceiptId(receipt.id)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? isNameMismatchTab
                      ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                      : 'border-slate-900 bg-slate-900 text-white shadow-sm'
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
                    {paymentReceiptStatusChipLabel(isMatched, activeTab)}
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
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">선택된 입금</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {selectedPaymentItem.receipt.payerNameRaw ?? '이름 없음'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {paymentReviewReasonLabel(selectedPaymentItem.receipt.needsReviewReason)}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                    {formatKrw(selectedPaymentItem.receipt.amountKrw)}
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

                {activeTab === 'ambiguous' ? (
                  selectedPaymentItem.candidateDocumentNumbers.length > 0 ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-semibold text-slate-900">계약서 시트에서 찾았어요</p>
                      <div className="grid gap-2">
                        {selectedPaymentItem.candidateDocumentNumbers.map((candidate) => {
                          const selected = documentNumberDraft === candidate.documentNumber;
                          return (
                            <button
                              key={candidate.documentNumber}
                              type="button"
                              onClick={() => handleSelectCandidateDocumentNumber(candidate.documentNumber)}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                selected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>
                                {formatPaymentReviewCandidateLabel(candidate)}
                              </p>
                              {candidate.teamMemberNames.length > 0 ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`text-[11px] font-medium ${
                                      selected ? 'text-slate-300' : 'text-slate-500'
                                    }`}
                                  >
                                    팀원
                                  </span>
                                  {candidate.teamMemberNames.map((name) => {
                                    const isMatchedMember =
                                      payerNameKey != null && normalizeContractPersonName(name) === payerNameKey;
                                    return (
                                    <span
                                      key={name}
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                        isMatchedMember
                                          ? selected
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-emerald-100 text-emerald-800'
                                          : selected
                                            ? 'bg-slate-800 text-slate-200'
                                            : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {name}
                                    </span>
                                    );
                                  })}
                                </div>
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
              </Card>

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
    </PageShell>
  );
}
