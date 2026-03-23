import { Button, Card } from '@tour/ui';
import { ExtraLodgingsDayEditor } from './ExtraLodgingsDayEditor';

interface ExtraLodgingsModalProps {
  open: boolean;
  counts: number[];
  dayLabels?: string[];
  onClose: () => void;
  onChangeCount: (index: number, nextValue: number) => void;
  onApplyUniform: (value: number) => void;
}

export function ExtraLodgingsModal({
  open,
  counts,
  dayLabels,
  onClose,
  onChangeCount,
  onApplyUniform,
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
                <p className="mt-1 text-sm text-slate-600">
                  일차별 추가 숙소 수량을 한 화면에서 확인하고 수정합니다. 필요하면 상단에서 전 일차에
                  동일 값을 일괄 적용할 수 있습니다.
                </p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <ExtraLodgingsDayEditor
                counts={counts}
                dayLabels={dayLabels}
                onChangeCount={onChangeCount}
                onApplyUniform={onApplyUniform}
              />
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
