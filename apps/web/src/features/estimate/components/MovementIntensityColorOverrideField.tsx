import { Button } from '@tour/ui';
import { useState } from 'react';
import { useMovementIntensityColorSettings } from '../../app-settings/hooks';
import { getMovementIntensityMeta, matchMovementIntensityPaletteLevel } from '../model/movement-intensity';
import { MovementIntensityColorSelectModal } from './MovementIntensityColorSelectModal';

export interface MovementIntensityColorOverrideFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  title?: string;
  description?: string;
  modalRowLabel?: string;
  compact?: boolean;
}

export function MovementIntensityColorOverrideField({
  value,
  onChange,
  title = '이동강도 색상',
  description = '설정 시 이 항목이 포함된 일정표 행에 전역 기본 색상 대신 적용됩니다. 일정표 행별 수동 색상이 있으면 그것이 우선 적용됩니다.',
  modalRowLabel = '이동강도 색상',
  compact = false,
}: MovementIntensityColorOverrideFieldProps): JSX.Element {
  const { colors: movementIntensityColors } = useMovementIntensityColorSettings();
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const selectedLevel = matchMovementIntensityPaletteLevel(value, movementIntensityColors);
  const selectedMeta = selectedLevel ? getMovementIntensityMeta(selectedLevel, movementIntensityColors) : null;

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex h-8 w-8 rounded-sm border border-slate-300"
          aria-label={selectedMeta?.label ?? '이동강도 색상 미지정'}
          title={selectedMeta?.label ?? '이동강도 색상 미지정'}
          style={{
            backgroundColor: value ?? '#e2e8f0',
          }}
          onClick={() => setColorModalOpen(true)}
        />
        <span className="text-sm text-slate-600">
          {selectedMeta?.label ?? '미지정 (레벨 기반 색상 사용)'}
        </span>
        {value ? (
          <Button type="button" variant="outline" onClick={() => onChange(null)}>
            색상 해제
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setColorModalOpen(true)}>
          색상 선택
        </Button>
      </div>
      <MovementIntensityColorSelectModal
        open={colorModalOpen}
        rowLabel={modalRowLabel}
        colors={movementIntensityColors}
        currentOverride={value}
        onClose={() => setColorModalOpen(false)}
        onSelect={(color) => {
          onChange(color);
          setColorModalOpen(false);
        }}
      />
    </>
  );

  if (compact) {
    return content;
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      {content}
    </div>
  );
}
