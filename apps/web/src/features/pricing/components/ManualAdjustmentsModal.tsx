import { Button, Card } from '@tour/ui';

export interface ManualAdjustmentDraftRow {
  kind: 'ADD' | 'DISCOUNT';
  description: string;
  amountKrw: string;
}

interface ManualAdjustmentsModalProps {
  open: boolean;
  rows: ManualAdjustmentDraftRow[];
  onClose: () => void;
  onAddRow: (kind: 'ADD' | 'DISCOUNT') => void;
  onUpdateRow: (index: number, field: 'description' | 'amountKrw', value: string) => void;
  onRemoveRow: (index: number) => void;
}

function SectionTitle({ title, description }: { title: string; description: string }): JSX.Element {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function ManualAdjustmentsModal({
  open,
  rows,
  onClose,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: ManualAdjustmentsModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  const additions = rows
    .map((row, index) => ({ ...row, index }))
    .filter((row) => row.kind === 'ADD');
  const discounts = rows
    .map((row, index) => ({ ...row, index }))
    .filter((row) => row.kind === 'DISCOUNT');

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">기타 금액</h2>
                <p className="mt-1 text-sm text-slate-600">추가 금액과 할인 금액을 모달 안에서 정리합니다.</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <SectionTitle title="추가" description="총액에 더해질 금액입니다." />
                  <Button variant="outline" onClick={() => onAddRow('ADD')}>
                    추가하기
                  </Button>
                </div>
                <div className="mt-4 grid gap-2">
                  {additions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      추가 항목이 없습니다.
                    </div>
                  ) : (
                    additions.map((row) => (
                      <div key={`manual-add-${row.index}`} className="grid grid-cols-[1fr_140px_auto] gap-2">
                        <input
                          value={row.description}
                          onChange={(event) => onUpdateRow(row.index, 'description', event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="내용"
                        />
                        <input
                          type="number"
                          min={0}
                          value={row.amountKrw}
                          onChange={(event) => onUpdateRow(row.index, 'amountKrw', event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="금액"
                        />
                        <Button variant="destructive" onClick={() => onRemoveRow(row.index)}>
                          삭제
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <SectionTitle title="할인" description="총액에서 차감될 금액입니다." />
                  <Button variant="outline" onClick={() => onAddRow('DISCOUNT')}>
                    추가하기
                  </Button>
                </div>
                <div className="mt-4 grid gap-2">
                  {discounts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      할인 항목이 없습니다.
                    </div>
                  ) : (
                    discounts.map((row) => (
                      <div key={`manual-discount-${row.index}`} className="grid grid-cols-[1fr_140px_auto] gap-2">
                        <input
                          value={row.description}
                          onChange={(event) => onUpdateRow(row.index, 'description', event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="내용"
                        />
                        <input
                          type="number"
                          min={0}
                          value={row.amountKrw}
                          onChange={(event) => onUpdateRow(row.index, 'amountKrw', event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="금액"
                        />
                        <Button variant="destructive" onClick={() => onRemoveRow(row.index)}>
                          삭제
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={onClose}>완료</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
