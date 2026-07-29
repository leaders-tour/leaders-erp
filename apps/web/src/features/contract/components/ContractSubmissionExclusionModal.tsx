import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import type { ContractSubmissionRow } from '../hooks';

function submissionPersonLabel(submission: ContractSubmissionRow): string {
  return submission.travelerName ?? submission.leaderName ?? '이름 없음';
}

interface ContractSubmissionExclusionModalProps {
  submission: ContractSubmissionRow;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => Promise<void>;
}

export function ContractSubmissionExclusionModal({
  submission,
  loading = false,
  onClose,
  onConfirm,
}: ContractSubmissionExclusionModalProps): JSX.Element {
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      await onConfirm(reason.trim() || null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '계산 제외 처리에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="grid gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">계산에서 제외</h3>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{submissionPersonLabel(submission)}</span>
              님을 인원 계산과 확정서 여행객 명단에서 제외합니다.
            </p>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">제외 사유 (선택)</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder="예: 중복 제출, 다른 문서번호로 재작성"
              disabled={loading}
            />
          </label>

          {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button variant="primary" onClick={() => void handleConfirm()} disabled={loading}>
              {loading ? '처리 중...' : '제외 확정'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
