import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { formatRegionLodgingPrice, type RegionLodgingOption } from '../model';

interface RegionLodgingSelectModalProps {
  open: boolean;
  dayIndex: number | null;
  lodgings: RegionLodgingOption[];
  initialSelectedId?: string | null;
  onClose: () => void;
  onSubmit: (lodgingId: string) => void;
}

export function RegionLodgingSelectModal({
  open,
  dayIndex,
  lodgings,
  initialSelectedId = null,
  onClose,
  onSubmit,
}: RegionLodgingSelectModalProps): JSX.Element | null {
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId ?? '');

  useEffect(() => {
    if (!open) {
      setSelectedId('');
      return;
    }

    setSelectedId(initialSelectedId ?? lodgings[0]?.id ?? '');
  }, [initialSelectedId, lodgings, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const selected = useMemo(() => lodgings.find((lodging) => lodging.id === selectedId) ?? null, [lodgings, selectedId]);

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
                <h2 className="text-xl font-semibold text-slate-900">숙소 지정</h2>
                <p className="mt-1 text-sm text-slate-600">{dayIndex ? `${dayIndex}일차에 적용할 숙소를 선택합니다.` : '숙소를 선택합니다.'}</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            {lodgings.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center text-sm text-slate-500">
                선택 가능한 지역 숙소가 없습니다.
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {selected ? `${selected.name} · ${formatRegionLodgingPrice(selected)}` : '숙소를 선택해 주세요.'}
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {lodgings.map((lodging) => {
                    const isSelected = lodging.id === selectedId;
                    return (
                      <button
                        key={lodging.id}
                        type="button"
                        onClick={() => setSelectedId(lodging.id)}
                        className={`rounded-3xl border px-4 py-4 text-left transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-sm font-semibold">{lodging.name}</div>
                        <div className={`mt-2 text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                          {formatRegionLodgingPrice(lodging)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button onClick={() => selectedId && onSubmit(selectedId)} disabled={!selectedId || lodgings.length === 0}>
                적용
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
