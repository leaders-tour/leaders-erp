import { normalizeConfirmationBirthCodeDisplay } from '@tour/validation';
import { useState } from 'react';
import type { ContractSubmissionRow } from '../hooks';

const ATTENTION_KIND_LABELS: Record<string, string> = {
  SPECIAL_NOTE: '특이사항',
  CONSULTATION: '상담',
  DECLINED_CONSENT: '미동의',
  ACTIVITY_OPT_OUT: '액티비티 제외',
  INCOMPLETE: '미완료',
};

function attentionBadgeClass(severity: string): string {
  return severity === 'HIGH'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';
}

function formatProfileLine(submission: ContractSubmissionRow): string | null {
  const parts: string[] = [];
  if (submission.travelerGender?.trim()) {
    parts.push(submission.travelerGender.trim());
  }
  const birthCode = normalizeConfirmationBirthCodeDisplay(submission.travelerBirthCode);
  if (birthCode) {
    parts.push(birthCode);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function hasVisibleContent(submission: ContractSubmissionRow): boolean {
  return Boolean(
    submission.reviewSummary.hasAttentionItems
    || formatProfileLine(submission)
    || submission.reviewSummary.formResponses.length > 0,
  );
}

export function ContractSubmissionDetailPanel({
  submission,
  variant = 'default',
}: {
  submission: ContractSubmissionRow;
  variant?: 'compact' | 'default' | 'modal';
}) {
  const [expanded, setExpanded] = useState(false);

  if (!hasVisibleContent(submission)) {
    return null;
  }

  const profileLine = formatProfileLine(submission);
  const { reviewSummary } = submission;
  const isCompact = variant === 'compact';
  const isModal = variant === 'modal';
  const showFormResponses = isModal || expanded;

  return (
    <div className={isCompact ? 'mt-2 grid gap-2 border-t border-slate-200/80 pt-2' : 'grid gap-3'}>
      {reviewSummary.hasAttentionItems ? (
        <div className="grid gap-2">
          <p className={`font-semibold text-slate-900 ${isCompact ? 'text-xs' : 'text-sm'}`}>
            주의 {reviewSummary.attentionItems.length}건
          </p>
          <div className="grid gap-2">
            {reviewSummary.attentionItems.map((item) => (
              <div
                key={`${item.kind}-${item.sourceHeader}-${item.detail}`}
                className={`rounded-xl border px-3 py-2 ${attentionBadgeClass(item.severity)}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {ATTENTION_KIND_LABELS[item.kind] ?? item.kind}
                  </span>
                  <span className={`font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>{item.label}</span>
                </div>
                <p className={`mt-1 whitespace-pre-wrap ${isCompact ? 'text-xs' : 'text-sm'}`}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {profileLine ? (
        <p className={`text-slate-600 ${isCompact ? 'text-xs' : 'text-sm'}`}>
          <span className="text-slate-500">프로필 </span>
          {profileLine}
        </p>
      ) : null}

      {reviewSummary.formResponses.length > 0 ? (
        <div className="grid gap-2">
          {isModal ? (
            <p className={`font-semibold text-slate-900 ${isCompact ? 'text-xs' : 'text-sm'}`}>
              작성 내용 {reviewSummary.formResponses.length}건
            </p>
          ) : (
            <button
              type="button"
              className={`inline-flex w-fit items-center gap-1 font-medium text-slate-600 hover:text-slate-900 ${isCompact ? 'text-xs' : 'text-sm'}`}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? '작성 내용 접기' : `작성 내용 ${reviewSummary.formResponses.length}건 보기`}
            </button>
          )}
          {showFormResponses ? (
            <div
              className={`grid gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 ${isModal ? 'max-h-[min(60vh,32rem)]' : isCompact ? 'max-h-48' : 'max-h-64'}`}
            >
              {reviewSummary.formResponses.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className={`whitespace-pre-wrap text-slate-600 ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
                    {item.label}
                  </p>
                  <p className={`mt-1 font-medium text-slate-900 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
