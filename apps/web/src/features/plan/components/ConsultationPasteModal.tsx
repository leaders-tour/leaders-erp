import { useMutation } from '@apollo/client';
import { Button, Card } from '@tour/ui';
import { useCallback, useState } from 'react';
import {
  ExtractConsultationFormDocument,
  type ConsultationDraft,
} from '../../../generated/graphql';

export interface ConsultationPasteModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (draft: ConsultationDraft) => void;
}

export function ConsultationPasteModal({
  open,
  onClose,
  onApply,
}: ConsultationPasteModalProps): JSX.Element | null {
  const [rawText, setRawText] = useState('');
  const [draft, setDraft] = useState<ConsultationDraft | null>(null);

  const [extract, { loading, error, reset: resetExtractMutation }] = useMutation(
    ExtractConsultationFormDocument,
    {
      onCompleted(data) {
        setDraft(data.extractConsultationForm);
      },
    },
  );

  const handleExtract = useCallback(() => {
    if (!rawText.trim()) return;
    setDraft(null);
    extract({ variables: { rawText: rawText.trim() } });
  }, [rawText, extract]);

  const handleApply = useCallback(() => {
    if (draft) {
      onApply(draft);
      onClose();
    }
  }, [draft, onApply, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleNewPaste = useCallback(() => {
    resetExtractMutation();
    setRawText('');
    setDraft(null);
  }, [resetExtractMutation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <h2 className="min-w-0 flex-1 text-lg font-bold text-slate-900">상담 내용 붙여넣기</h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" className="text-sm" onClick={handleNewPaste}>
              초기화
            </Button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="닫기"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-600">
              채팅 채널에서 고객이 보낸 상담 폼 응답을 복사해 붙여넣으세요.
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="▶ 성함 : 김희지&#10;▶ 인원, 성비 : 5명 남2여3&#10;..."
              rows={8}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400"
              disabled={loading}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {error.message}
              {error.message.includes('OPENAI') && ' .env에 OPENAI_API_KEY를 설정해주세요.'}
            </div>
          ) : null}

          {!draft ? (
            <Button
              onClick={handleExtract}
              disabled={loading || !rawText.trim()}
              aria-busy={loading}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="relative inline-flex h-4 w-4 shrink-0"
                    aria-hidden
                  >
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                  <span className="inline-flex items-baseline gap-0.5">
                    생각중
                    <span className="inline-flex translate-y-px gap-px">
                      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                    </span>
                  </span>
                </span>
              ) : (
                '추출'
              )}
            </Button>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold text-slate-600">이렇게 이해했습니다</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-500">대표자</dt>
                  <dd className="font-medium text-slate-900">{draft.leaderName || '-'}</dd>
                  <dt className="text-slate-500">인원</dt>
                  <dd className="text-slate-900">
                    {draft.headcountTotal}명 (남 {draft.headcountMale} / 여 {draft.headcountFemale})
                  </dd>
                  <dt className="text-slate-500">지역</dt>
                  <dd className="text-slate-900">{draft.regionName || '-'}</dd>
                  <dt className="text-slate-500">여행 기간</dt>
                  <dd className="text-slate-900">
                    {draft.travelStartDate && draft.travelEndDate
                      ? `${draft.travelStartDate} ~ ${draft.travelEndDate}`
                      : '-'}
                  </dd>
                  <dt className="text-slate-500">일수</dt>
                  <dd className="text-slate-900">{draft.totalDays}일</dd>
                  <dt className="text-slate-500">차량</dt>
                  <dd className="text-slate-900">{draft.vehicleType ?? '-'}</dd>
                  <dt className="text-slate-500">입국</dt>
                  <dd className="text-slate-900">
                    {draft.flightInDate && draft.flightInTime
                      ? `${draft.flightInDate} ${draft.flightInTime}`
                      : '-'}
                  </dd>
                  <dt className="text-slate-500">출국</dt>
                  <dd className="text-slate-900">
                    {draft.flightOutDate && draft.flightOutTime
                      ? `${draft.flightOutDate} ${draft.flightOutTime}`
                      : '-'}
                  </dd>
                  <dt className="text-slate-500">이동강도</dt>
                  <dd className="text-slate-900">{draft.movementIntensity ?? '-'}</dd>
                  <dt className="text-slate-500">숙소등급</dt>
                  <dd className="text-slate-900">{draft.lodgingLevel ?? '-'}</dd>
                  {draft.specialNote ? (
                    <>
                      <dt className="text-slate-500">특이사항</dt>
                      <dd className="whitespace-pre-wrap text-slate-900">{draft.specialNote}</dd>
                    </>
                  ) : null}
                </dl>
                {draft.warnings.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-amber-700">
                    {draft.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs font-medium text-slate-500">추천 템플릿</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {draft.recommendedTemplateName?.trim()
                      ? draft.recommendedTemplateName
                      : draft.regionId
                        ? '해당 지역·일수에 맞는 활성 템플릿 없음 또는 미선택'
                        : '-'}
                  </p>
                  {draft.recommendedTemplateReason?.trim() ? (
                    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/90 px-3 py-2.5 shadow-sm">
                      <p className="text-xs font-medium text-violet-700">추천이유 *ai</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-violet-950">
                        {draft.recommendedTemplateReason.trim()}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleApply}>적용</Button>
                <Button variant="outline" onClick={handleClose}>
                  취소
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
