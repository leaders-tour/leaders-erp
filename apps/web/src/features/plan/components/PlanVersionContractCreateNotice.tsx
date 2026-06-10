import { useMemo } from 'react';
import { useContractDocumentStatuses } from '../../contract/hooks';

const NOTICE_TEXT =
  '이 버전에 연결된 계약서가 있습니다. 새 견적 버전을 만들면 계약서 관리에서 새 견적으로 매칭을 수동으로 변경해 주세요.';

export function buildPlanVersionDocumentNumber(documentNumberBase: string, versionNumber: number): string {
  return `${documentNumberBase}V${versionNumber}`;
}

export function PlanVersionContractCreateNotice({
  documentNumber,
  className,
}: {
  documentNumber: string | null | undefined;
  className?: string;
}): JSX.Element | null {
  const documentNumbers = useMemo(
    () => (documentNumber?.trim() ? [documentNumber.trim()] : []),
    [documentNumber],
  );
  const { statuses, loading } = useContractDocumentStatuses(documentNumbers);
  const hasLinkedContracts = (statuses[0]?.submittedCount ?? 0) > 0;

  if (loading || !hasLinkedContracts) {
    return null;
  }

  return (
    <div
      className={
        className ??
        'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950'
      }
      role="note"
    >
      {NOTICE_TEXT}
    </div>
  );
}
