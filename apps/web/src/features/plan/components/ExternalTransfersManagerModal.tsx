import { Button, Card } from '@tour/ui';
import type { ExternalTransfer, ExternalTransferTeamLike } from '../external-transfer';

interface ExternalTransfersManagerModalProps {
  open: boolean;
  externalTransfers: ExternalTransfer[];
  transportGroups: ExternalTransferTeamLike[];
  externalPickupText: string;
  externalDropText: string;
  onClose: () => void;
  onComplete: () => void;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function ExternalTransfersManagerModal({
  open,
  externalTransfers,
  transportGroups,
  externalPickupText,
  externalDropText,
  onClose,
  onComplete,
  onAdd,
  onEdit,
  onRemove,
}: ExternalTransfersManagerModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-40 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">실투어 외 픽업 / 드랍</h2>
                <p className="mt-1 text-sm text-slate-600">preset 또는 수동입력으로 외부 이동 항목을 팀별로 관리하고, 금액은 가격 규칙에서 계산합니다.</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-500">픽업 표시</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{externalPickupText}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-500">드랍 표시</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{externalDropText}</div>
              </div>
            </div>

            <div className="mt-5">
              {externalTransfers.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <button
                    type="button"
                    onClick={onAdd}
                    className="flex flex-col items-center gap-3 text-slate-600 transition hover:text-slate-900"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl font-light shadow-sm">+</span>
                    <span className="text-sm font-medium">추가하기</span>
                  </button>
                  <p className="mt-4 text-sm text-slate-500">아직 추가된 외부 이동 항목이 없습니다.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {externalTransfers.map((transfer, index) => {
                    const teamNames = transfer.selectedTeamOrderIndexes
                      .map((teamOrderIndex) => transportGroups[teamOrderIndex]?.teamName || `${teamOrderIndex + 1}번 팀`)
                      .join(', ');

                    return (
                      <div key={`external-transfer-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {transfer.direction === 'PICKUP' ? '픽업' : '드랍'} · {transfer.departurePlace} → {transfer.arrivalPlace}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {transfer.travelDate} {transfer.departureTime} → {transfer.arrivalTime} · {teamNames || '-'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onEdit(index)}>
                              수정
                            </Button>
                            <Button variant="outline" onClick={() => onRemove(index)}>
                              삭제
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={onAdd}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                    >
                      + 추가하기
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={onComplete}>완료하기</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
