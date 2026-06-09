import { Button, Card, Input, PageShell, StatusBadge } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useContractDocumentReviewItems,
  useContractMatchPlanVersionCandidates,
  useExcludeContractSubmissionFromCount,
  useMatchContractDocument,
  useRestoreContractSubmissionToCount,
  useUnmatchContractDocument,
  type ContractDocumentReviewItemRow,
  type ContractDocumentStatusValue,
  type ContractMatchPlanVersionCandidateRow,
} from '../features/contract/hooks';

const REVIEW_STATUSES: ContractDocumentStatusValue[] = ['NEEDS_REVIEW', 'OVER_SUBMITTED'];

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

function reviewSummary(
  statusRow: ContractDocumentReviewItemRow['statusRow'],
): string {
  if (statusRow.status === 'OVER_SUBMITTED') {
    return `계약서 ${statusRow.submittedCount}/${statusRow.expectedCount ?? '?'} · 예상 인원보다 많이 제출됨`;
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

function buildNewEstimateAction(statusRow: ContractDocumentReviewItemRow['statusRow']): {
  href: string;
  label: string;
  description: string;
} {
  const matchedVersionId = statusRow.effectiveMatchedPlanVersionId;
  const matchedPlanId = statusRow.effectiveMatchedPlanId;
  if (matchedVersionId && matchedPlanId) {
    return {
      href: `/plans/${matchedPlanId}/versions/${matchedVersionId}`,
      label: '매칭 견적에서 새 버전 만들기',
      description: `예상 인원(${statusRow.expectedCount ?? '?'})보다 더 많이 제출되었습니다. 매칭된 견적 상세로 이동해 「이 버전 기반 새 버전 생성」으로 인원에 맞는 견적을 만든 뒤, 이 Review 화면에서 새 견적서에 매칭하세요.`,
    };
  }

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
    description: `예상 인원(${statusRow.expectedCount ?? '?'})보다 더 많이 제출되었습니다. 새 견적서를 만든 뒤 이 Review 화면에서 해당 견적서에 매칭하세요.`,
  };
}

export function ContractDocumentReviewPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<string | null>(null);
  const [planSearch, setPlanSearch] = useState('');
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState<string | null>(null);
  const [matchNote, setMatchNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exclusionTargetId, setExclusionTargetId] = useState<string | null>(null);
  const [exclusionReason, setExclusionReason] = useState('');
  const [submissionActionError, setSubmissionActionError] = useState<string | null>(null);

  const normalizedSearch = search.trim();
  const { items, loading, refetch } = useContractDocumentReviewItems(REVIEW_STATUSES, normalizedSearch);
  const { candidates, loading: candidatesLoading } = useContractMatchPlanVersionCandidates(planSearch);
  const { matchContractDocument, loading: matching } = useMatchContractDocument();
  const { unmatchContractDocument, loading: unmatching } = useUnmatchContractDocument();
  const { excludeContractSubmissionFromCount, loading: excluding } = useExcludeContractSubmissionFromCount();
  const { restoreContractSubmissionToCount, loading: restoring } = useRestoreContractSubmissionToCount();

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
      selectedItem?.statusRow.status === 'OVER_SUBMITTED'
        ? buildNewEstimateAction(selectedItem.statusRow)
        : null,
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
  }, [selectedDocumentNumber]);

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
      await refetch();
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
      await refetch();
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
      await refetch();
    } catch (error) {
      setSubmissionActionError(error instanceof Error ? error.message : '계산 제외 처리에 실패했습니다.');
    }
  };

  const handleRestoreSubmission = async (submissionId: string) => {
    setSubmissionActionError(null);
    try {
      await restoreContractSubmissionToCount(submissionId);
      await refetch();
    } catch (error) {
      setSubmissionActionError(error instanceof Error ? error.message : '제외 해제에 실패했습니다.');
    }
  };

  return (
    <PageShell className="grid gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">계약서 Review 매칭</h1>
          <p className="mt-1 text-sm text-slate-600">
            자동으로 견적서와 연결되지 않은 계약서를 검토하고, 올바른 견적서에 수동 매칭합니다.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          새로고침
        </Button>
      </header>

      <Card className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="문서번호, 작성자명 검색"
        />
        <Button variant="primary" onClick={() => void refetch()}>
          조회
        </Button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="grid max-h-[78vh] gap-2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2 px-2 py-1">
            <div>
              <p className="text-sm font-semibold text-slate-900">Review 대상</p>
              <p className="mt-0.5 text-xs text-slate-500">구글 시트에서 가져온 데이터입니다</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{items.length}</span>
          </div>

          {loading ? <p className="px-2 py-4 text-sm text-slate-500">불러오는 중...</p> : null}
          {!loading && items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">검토가 필요한 계약서가 없습니다.</p>
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
                  <ReviewStatusBadge status={item.statusRow.status} active={active} />
                </div>
                <p className={`mt-2 text-xs ${active ? 'text-slate-200' : 'text-slate-600'}`}>
                  계약서 {item.statusRow.submittedCount}/{item.statusRow.expectedCount ?? '?'} · 작성 {item.submissions.length}건
                </p>
              </button>
            );
          })}
        </Card>

        <div className="grid gap-4">
          {!selectedItem ? (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              왼쪽에서 review 항목을 선택해주세요.
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
                      {reviewSummary(selectedItem.statusRow)} · 최근 작성{' '}
                      {formatDateTime(selectedItem.statusRow.lastSubmittedAt)}
                    </p>
                  </div>
                  <ReviewStatusBadge status={selectedItem.statusRow.status} />
                </div>

                <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-2">
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
                  <div>
                    <span className="text-slate-500">자동 매칭 견적</span>
                    <p className="font-medium text-slate-900">{selectedItem.statusRow.matchedPlanVersionId ?? '없음'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">수동 매칭 견적</span>
                    <p className="font-medium text-slate-900">
                      {selectedItem.statusRow.manualMatchedPlanVersionId ?? '없음'}
                    </p>
                  </div>
                </div>

                {selectedItem.statusRow.manualMatchNote ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    수동 매칭 메모: {selectedItem.statusRow.manualMatchNote}
                  </div>
                ) : null}

                {newEstimateAction ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                    <p className="font-semibold">실제 인원이 늘어난 경우</p>
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
                  {submissionActionError ? <p className="text-sm text-rose-600">{submissionActionError}</p> : null}
                  <div className="grid gap-2">
                    {selectedItem.submissions.map((submission) => {
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
                              <p className={`font-semibold ${isExcluded ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
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
                              {submission.totalCompanionCount != null ? ` · 동반 ${submission.totalCompanionCount}명` : ''}
                            </p>
                            {isExcluded && submission.exclusionReason ? (
                              <p className="mt-1 text-xs text-slate-600">제외 사유: {submission.exclusionReason}</p>
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

              <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">견적서 매칭</p>
                  <p className="mt-1 text-sm text-slate-600">고객명, 견적 문서번호, 팀장명으로 검색해 연결할 견적서를 선택하세요.</p>
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
            </>
          )}
        </div>
      </div>
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
