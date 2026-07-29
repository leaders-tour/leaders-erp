import {
  CUSTOM_VEHICLE_TYPE,
  CUSTOM_VEHICLE_TYPE_LABEL,
  PLAN_VEHICLE_TYPES,
  type AssignmentVehicleType,
  type VehicleAssignment,
} from '@tour/validation';
import { Button } from '@tour/ui';

interface VehicleAssignmentsEditorProps {
  assignments: VehicleAssignment[];
  headcountTotal: number;
  onChange: (assignments: VehicleAssignment[]) => void;
  maxRows?: number;
}

export function VehicleAssignmentsEditor({
  assignments,
  headcountTotal,
  onChange,
  maxRows = 10,
}: VehicleAssignmentsEditorProps): JSX.Element {
  const updateRow = (index: number, patch: Partial<VehicleAssignment>): void => {
    onChange(
      assignments.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (index: number): void => {
    if (assignments.length <= 1) {
      return;
    }
    onChange(assignments.filter((_, rowIndex) => rowIndex !== index));
  };

  const addRow = (): void => {
    if (assignments.length >= maxRows) {
      return;
    }
    onChange([...assignments, { vehicleType: '스타렉스', count: 1 }]);
  };

  return (
    <div className="grid gap-2">
      {assignments.map((row, index) => {
        const hiaceDisabled = headcountTotal < 2;
        return (
          <div key={`vehicle-row-${index}`} className="flex flex-wrap items-center gap-2">
            <select
              value={row.vehicleType}
              onChange={(event) => {
                const nextType = event.target.value as AssignmentVehicleType;
                if (nextType === '하이에이스' && hiaceDisabled) {
                  return;
                }
                if (nextType === CUSTOM_VEHICLE_TYPE) {
                  updateRow(index, {
                    vehicleType: CUSTOM_VEHICLE_TYPE,
                    vehicleTypeCustomText: row.vehicleTypeCustomText ?? '',
                  });
                  return;
                }
                updateRow(index, {
                  vehicleType: nextType,
                  vehicleTypeCustomText: undefined,
                });
              }}
              className="min-w-[7.5rem] rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
            >
              {PLAN_VEHICLE_TYPES.map((vehicleType) => (
                <option
                  key={vehicleType}
                  value={vehicleType}
                  disabled={vehicleType === '하이에이스' && hiaceDisabled}
                >
                  {vehicleType}
                </option>
              ))}
              <option value={CUSTOM_VEHICLE_TYPE}>{CUSTOM_VEHICLE_TYPE_LABEL}</option>
            </select>
            {row.vehicleType === CUSTOM_VEHICLE_TYPE ? (
              <input
                type="text"
                value={row.vehicleTypeCustomText ?? ''}
                onChange={(event) => updateRow(index, { vehicleTypeCustomText: event.target.value })}
                placeholder="차종명 입력"
                className="min-w-[8rem] flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                aria-label="직접입력 차종명"
              />
            ) : null}
            <input
              type="number"
              min={1}
              max={10}
              value={row.count}
              onChange={(event) => {
                const nextCount = Math.max(1, Math.min(10, Number(event.target.value) || 1));
                updateRow(index, { count: nextCount });
              }}
              className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
              aria-label="대수"
            />
            <span className="text-xs text-slate-500">대</span>
            <Button
              type="button"
              variant="outline"
              disabled={assignments.length <= 1}
              onClick={() => removeRow(index)}
            >
              삭제
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={assignments.length >= maxRows}
        onClick={addRow}
      >
        + 차량 추가
      </Button>
    </div>
  );
}
