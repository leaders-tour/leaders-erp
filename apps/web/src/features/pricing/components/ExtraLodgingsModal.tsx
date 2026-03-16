import { Button, Card } from '@tour/ui';

interface ExtraLodgingsModalProps {
  open: boolean;
  counts: number[];
  onClose: () => void;
  onChangeCount: (index: number, nextValue: number) => void;
}

export function ExtraLodgingsModal({
  open,
  counts,
  onClose,
  onChangeCount,
}: ExtraLodgingsModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-4xl">
          <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">숙소 추가</h2>
                <p className="mt-1 text-sm text-slate-600">일차별 추가 숙소 수량을 모달 안에서 설정합니다.</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {counts.map((count, index) => (
                  <label key={`extra-lodging-modal-${index + 1}`} className="grid gap-1">
                    <span className="text-xs text-slate-500">{index + 1}일차</span>
                    <input
                      type="number"
                      min={0}
                      value={count}
                      onChange={(event) => onChangeCount(index, Math.max(0, Number(event.target.value) || 0))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                ))}
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
