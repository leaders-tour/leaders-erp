import { Button, Card, Input, PageShell, StatusBadge } from '@tour/ui';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useApproveOutreachDraft,
  useCafeLead,
  useEditAndApproveOutreachDraft,
  useHoldCafeLead,
  useRegenerateOutreachDraft,
  useSkipCafeLead,
} from '../features/outreach/hooks';

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ko-KR');
}

export function OutreachLeadDetailPage(): JSX.Element {
  const { leadId = '' } = useParams();
  const { lead, loading, refetch } = useCafeLead(leadId);
  const { approveDraft, loading: approving } = useApproveOutreachDraft();
  const { editAndApproveDraft, loading: editingApprove } = useEditAndApproveOutreachDraft();
  const { holdLead, loading: holding } = useHoldCafeLead();
  const { skipLead, loading: skipping } = useSkipCafeLead();
  const { regenerateDraft, loading: regenerating } = useRegenerateOutreachDraft();
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!lead?.latestDraft) {
      return;
    }

    setSubject(lead.latestDraft.subject);
    setPreviewText(lead.latestDraft.previewText ?? '');
    setBodyText(lead.latestDraft.bodyText);
    setBodyHtml(lead.latestDraft.bodyHtml);
  }, [lead?.latestDraft]);

  const canApprove = Boolean(lead?.latestDraft && lead.contactEmail && !lead.isSuppressed);

  return (
    <PageShell className="grid gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/outreach/leads" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            ← 리스트로 돌아가기
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{lead?.title ?? '리드 상세'}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {lead?.articleId ?? '-'} · {lead?.authorNickname ?? '작성자 미확인'} · {formatDate(lead?.postedAt ?? lead?.postedAtRaw)}
          </p>
        </div>
        {lead ? <StatusBadge tone={lead.status === 'FAILED' ? 'warning' : lead.status === 'SENT' ? 'success' : 'override'} label={lead.status} /> : null}
      </header>

      {feedback ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</p> : null}
      {errorMessage ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p> : null}

      {loading || !lead ? (
        <Card>리드를 불러오는 중...</Card>
      ) : (
        <>
          {!lead.contactEmail ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">이메일이 없어 승인과 발송은 막혀 있습니다.</p> : null}
          {lead.isSuppressed ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">수신거부 대상이라 승인할 수 없습니다.</p> : null}

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">원문 게시글</h2>
                <a href={lead.articleUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
                  네이버 카페 원문 열기
                </a>
              </div>
              <div className="grid gap-2 text-sm text-slate-700">
                <p>이메일: {lead.contactEmail ?? '-'}</p>
                <p>전화: {lead.contactPhone ?? '-'}</p>
                <p>카카오 ID: {lead.contactKakaoId ?? '-'}</p>
                <p>조회수: {lead.views ?? '-'}</p>
                <p>댓글수: {lead.commentCount ?? '-'}</p>
                <p>HTML artifact: {lead.artifactHtmlPath ?? '-'}</p>
                <p>Screenshot artifact: {lead.artifactScreenshotPath ?? '-'}</p>
              </div>
              <pre className="max-h-[560px] overflow-auto rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                {lead.rawText ?? '본문이 아직 수집되지 않았습니다.'}
              </pre>
            </Card>

            <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Parsed Needs</h2>
                <p className="mt-1 text-sm text-slate-600">AI가 구조화한 여행 요구사항입니다.</p>
              </div>
              <dl className="grid gap-2 text-sm text-slate-700">
                <div className="flex justify-between gap-4"><dt>출발일</dt><dd>{lead.parsedNeeds?.departureDate ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>도착일</dt><dd>{lead.parsedNeeds?.returnDate ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>박수</dt><dd>{lead.parsedNeeds?.durationNights ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>일수</dt><dd>{lead.parsedNeeds?.durationDays ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>인원</dt><dd>{lead.parsedNeeds?.travelerCount ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>여행 타입</dt><dd>{lead.parsedNeeds?.travelerType ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>목적지</dt><dd>{lead.parsedNeeds?.destinations.join(', ') || '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>예산</dt><dd>{lead.parsedNeeds?.budget ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>관심사</dt><dd>{lead.parsedNeeds?.interests.join(', ') || '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>특이사항</dt><dd>{lead.parsedNeeds?.specialRequests.join(', ') || '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>긴급도</dt><dd>{lead.parsedNeeds?.urgency ?? '-'}</dd></div>
                <div className="flex justify-between gap-4"><dt>리드 점수</dt><dd>{lead.parsedNeeds?.leadScore ?? lead.leadScore ?? '-'}</dd></div>
              </dl>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                발송 이력 {lead.outboundMessages.length}건
                {lead.outboundMessages.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {lead.outboundMessages.map((message) => (
                      <li key={message.id}>
                        {message.deliveryStatus} · {message.toEmail} · {formatDate(message.sentAt ?? message.createdAt)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2">아직 발송되지 않았습니다.</p>
                )}
              </div>
            </Card>

            <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">AI 메일 초안</h2>
                <p className="mt-1 text-sm text-slate-600">수정 후 승인도 가능합니다.</p>
              </div>
              <div className="grid gap-3">
                <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="제목" />
                <Input value={previewText} onChange={(event) => setPreviewText(event.target.value)} placeholder="Preview text" />
                <textarea value={bodyText} onChange={(event) => setBodyText(event.target.value)} className="min-h-[260px] rounded-2xl border border-slate-200 px-3 py-3 text-sm" placeholder="본문 텍스트" />
                <textarea value={bodyHtml} onChange={(event) => setBodyHtml(event.target.value)} className="min-h-[180px] rounded-2xl border border-slate-200 px-3 py-3 font-mono text-xs" placeholder="본문 HTML" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={!canApprove || !lead.latestDraft || approving}
                  onClick={async () => {
                    if (!lead.latestDraft) {
                      return;
                    }
                    setErrorMessage(null);
                    setFeedback(null);
                    try {
                      await approveDraft(lead.latestDraft.id);
                      await refetch();
                      setFeedback('초안을 승인했습니다.');
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : '승인에 실패했습니다.');
                    }
                  }}
                >
                  승인
                </Button>
                <Button
                  variant="outline"
                  disabled={!canApprove || !lead.latestDraft || editingApprove}
                  onClick={async () => {
                    if (!lead.latestDraft) {
                      return;
                    }
                    setErrorMessage(null);
                    setFeedback(null);
                    try {
                      await editAndApproveDraft(lead.latestDraft.id, { subject, previewText, bodyText, bodyHtml });
                      await refetch();
                      setFeedback('수정 후 승인했습니다.');
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : '수정 후 승인에 실패했습니다.');
                    }
                  }}
                >
                  수정 후 승인
                </Button>
                <Button
                  variant="outline"
                  disabled={holding}
                  onClick={async () => {
                    setErrorMessage(null);
                    setFeedback(null);
                    try {
                      await holdLead(lead.id);
                      await refetch();
                      setFeedback('리드를 보류 상태로 돌렸습니다.');
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : '보류 처리에 실패했습니다.');
                    }
                  }}
                >
                  보류
                </Button>
                <Button
                  variant="destructive"
                  disabled={skipping}
                  onClick={async () => {
                    setErrorMessage(null);
                    setFeedback(null);
                    try {
                      await skipLead(lead.id, '관리자 제외');
                      await refetch();
                      setFeedback('리드를 제외했습니다.');
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : '제외 처리에 실패했습니다.');
                    }
                  }}
                >
                  제외
                </Button>
                <Button
                  variant="outline"
                  disabled={regenerating}
                  onClick={async () => {
                    setErrorMessage(null);
                    setFeedback(null);
                    try {
                      await regenerateDraft(lead.id);
                      await refetch();
                      setFeedback('재생성 요청을 등록했습니다. worker-ai를 다시 실행하면 새 초안이 만들어집니다.');
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : '재생성 요청에 실패했습니다.');
                    }
                  }}
                >
                  다시 생성
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}
