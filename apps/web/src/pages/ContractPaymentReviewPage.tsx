import { Button, Card, Input, PageShell } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  useContractMatchPlanVersionCandidates,
  useContractPaymentReviewReceipts,
  useContractPaymentReviewTabCount,
  useMatchContractPaymentReceipt,
  useUnmatchContractPaymentReceipt,
} from '../features/contract/hooks';

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ko-KR');
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

export function ContractPaymentReviewPage(): JSX.Element {
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [documentNumberDraft, setDocumentNumberDraft] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  const normalizedPaymentSearch = paymentSearch.trim();
  const { count: paymentReviewCount, refetch: refetchPaymentReviewCount } = useContractPaymentReviewTabCount();
  const { items: paymentItems, loading: paymentLoading, refetch: refetchPaymentItems } =
    useContractPaymentReviewReceipts(normalizedPaymentSearch);
  const { matchContractPaymentReceipt, loading: matchingPayment } = useMatchContractPaymentReceipt();
  const { unmatchContractPaymentReceipt, loading: unmatchingPayment } = useUnmatchContractPaymentReceipt();
  const { candidates: paymentPlanCandidates, loading: paymentCandidatesLoading } =
    useContractMatchPlanVersionCandidates(planSearch);

  useEffect(() => {
    setSelectedReceiptId(null);
  }, [normalizedPaymentSearch]);

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

  const handleSelectCandidateDocumentNumber = (documentNumber: string) => {
    setDocumentNumberDraft(documentNumber);
    setPlanSearch(documentNumber);
    setPaymentErrorMessage(null);
  };

  const refreshPage = async () => {
    await Promise.all([refetchPaymentItems(), refetchPaymentReviewCount()]);
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
            {paymentReviewCount != null ? (
              <span className="ml-1 font-medium text-slate-800">검토 필요 {paymentReviewCount}건</span>
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

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="grid max-h-[78vh] gap-2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2 px-2 py-1">
            <div>
              <p className="text-sm font-semibold text-slate-900">입금 검토</p>
              <p className="mt-0.5 text-xs text-slate-500">미매칭 또는 확인 필요한 입금 row</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {paymentReviewCount ?? paymentItems.length}
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
                          onClick={() => handleSelectCandidateDocumentNumber(documentNumber)}
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
                    계약서 작성자명과 일치하는 문서번호 후보가 없습니다. 아래에서 견적을 검색해 선택하세요.
                  </div>
                )}
              </Card>

              <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">문서번호 연결</p>
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
    </PageShell>
  );
}
