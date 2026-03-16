import { Button, Card } from '@tour/ui';
import type { LodgingSelectionLevel } from '../model';

export interface LodgingUpgradeRow {
  dayIndex: number;
  locationLabel: string;
  lodgingSelectionLevel: LodgingSelectionLevel;
  lodgingCellText: string;
  customLodgingId?: string;
}

interface LodgingUpgradeModalProps {
  open: boolean;
  rows: LodgingUpgradeRow[];
  onClose: () => void;
  onChooseLevel: (rowIndex: number, level: Exclude<LodgingSelectionLevel, 'CUSTOM'>) => void;
  onChooseCustom: (rowIndex: number) => void;
}

export function LodgingUpgradeModal({
  open,
  rows,
  onClose,
  onChooseLevel,
  onChooseCustom,
}: LodgingUpgradeModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">숙소 업그레이드</h2>
                <p className="mt-1 text-sm text-slate-600">일차별 숙소 등급 또는 지정 숙소를 선택합니다.</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center text-sm text-slate-500">
                먼저 출발지와 일차별 목적지를 선택해 주세요.
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {rows.map((row, rowIndex) => (
                  <div key={`lodging-upgrade-row-${row.dayIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{row.dayIndex}일차 숙소</div>
                        <div className="mt-1 text-xs text-slate-500">{row.locationLabel}</div>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
                        현재 {row.lodgingSelectionLevel}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(['LV1', 'LV2', 'LV3', 'LV4'] as const).map((level) => (
                        <button
                          key={`lodging-modal-${rowIndex}-${level}`}
                          type="button"
                          onClick={() => onChooseLevel(rowIndex, level)}
                          className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                            row.lodgingSelectionLevel === level
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onChooseCustom(rowIndex)}
                        className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                          row.lodgingSelectionLevel === 'CUSTOM'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        숙소지정
                      </button>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap text-slate-900">
                      {row.lodgingCellText || '-'}
                    </div>
                    {row.lodgingSelectionLevel === 'CUSTOM' && !row.customLodgingId ? (
                      <p className="mt-2 text-xs text-rose-600">숙소지정을 선택한 경우 숙소를 골라야 합니다.</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={onClose}>완료</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
