import { Button, Card, Input } from '@tour/ui';
import { useState } from 'react';
import {
  buildCustomerDeleteSummary,
  isCustomerDeleteConfirmationValid,
  type CustomerDeleteSummaryInput,
} from '../customer-delete-summary';
interface CustomerDeletePanelProps {
  user: CustomerDeleteSummaryInput & {
    id: string;
    email: string | null;
    ownerEmployee: { name: string } | null;
  };
  deleting?: boolean;
  onCancel: () => void;
  onConfirmDelete: () => Promise<void>;
}

export function CustomerDeletePanel({
  user,
  deleting = false,
  onCancel,
  onConfirmDelete,
}: CustomerDeletePanelProps): JSX.Element {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summary = buildCustomerDeleteSummary(user);
  const canDelete = isCustomerDeleteConfirmationValid(user.name, confirmationInput) && !deleting;

  return (
    <Card className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-rose-900">고객 삭제</h2>
          <p className="mt-1 text-sm text-rose-800">
            이 작업은 되돌릴 수 없습니다. 고객과 연결된 일정, 확정여행, 노트, TODO, 배정/숙소/가격 데이터가 함께
            삭제됩니다.
          </p>
          <p className="mt-2 text-sm text-rose-800">
            외부 계약서/입금 동기화 원천 데이터는 보존되며, 이 고객과 연결된 매칭 참조만 해제됩니다.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{summary.customerName}</p>
          <ul className="mt-2 grid gap-1">
            <li>일정 {summary.planCount}개</li>
            <li>
              확정여행 {summary.confirmedTripCount}개
              {summary.activeConfirmedTripCount > 0 ? ` (진행 중 ${summary.activeConfirmedTripCount}개)` : ''}
            </li>
            <li>TODO {summary.dealTodoCount}개</li>
            <li>담당자: {user.ownerEmployee?.name ?? '미지정'}</li>
            {user.email ? <li>이메일: {user.email}</li> : null}
          </ul>
        </div>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>삭제를 확인하려면 고객명을 정확히 입력하세요</span>
          <Input
            value={confirmationInput}
            onChange={(event) => {
              setConfirmationInput(event.target.value);
              setErrorMessage(null);
            }}
            placeholder={user.name}
            disabled={deleting}
          />
        </label>

        {errorMessage ? <p className="rounded-2xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{errorMessage}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={deleting} onClick={onCancel}>
            취소
          </Button>
          <Button
            variant="primary"
            disabled={!canDelete}
            onClick={async () => {
              setErrorMessage(null);
              try {
                await onConfirmDelete();
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : '고객 삭제에 실패했습니다.');
              }
            }}
          >
            {deleting ? '삭제 중...' : '고객 삭제'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
