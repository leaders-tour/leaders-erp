import { Button, Card } from '@tour/ui';
import {
  MOVEMENT_INTENSITY_ORDER,
  getMovementIntensityMeta,
  matchMovementIntensityPaletteLevel,
  type MovementIntensityColorSetting,
  type MovementIntensityValue,
} from '../model/movement-intensity';

export interface MovementIntensityColorSelectModalProps {
  open: boolean;
  rowLabel: string;
  colors: readonly MovementIntensityColorSetting[];
  currentOverride: string | null | undefined;
  onClose: () => void;
  onSelect: (color: string | null) => void;
}

export function MovementIntensityColorSelectModal({
  open,
  rowLabel,
  colors,
  currentOverride,
  onClose,
  onSelect,
}: MovementIntensityColorSelectModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  const selectedLevel = matchMovementIntensityPaletteLevel(currentOverride, colors);

  const handleSelect = (level: MovementIntensityValue | null): void => {
    if (level == null) {
      onSelect(null);
      onClose();
      return;
    }
    const meta = getMovementIntensityMeta(level, colors);
    onSelect(meta?.color ?? null);
    onClose();
  };

  return (
    <div
      className="estimate-movement-intensity-color-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">이동강도 색상</h2>
            <p className="mt-1 text-sm text-slate-600">{rowLabel}</p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">전역 기본 색상 중 하나를 선택하세요.</p>

        <div className="mt-4 grid gap-2">
          {MOVEMENT_INTENSITY_ORDER.map((level) => {
            const meta = getMovementIntensityMeta(level, colors);
            const isSelected = selectedLevel === level;

            return (
              <button
                key={level}
                type="button"
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => handleSelect(level)}
              >
                <span
                  className="inline-block h-5 w-5 shrink-0 rounded-sm border border-slate-300"
                  style={{ backgroundColor: meta?.color }}
                  aria-hidden
                />
                <span className="text-sm font-medium text-slate-900">{meta?.label ?? level}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={() => handleSelect(null)}>
            기본 색상으로 초기화
          </Button>
        </div>
      </Card>
    </div>
  );
}
