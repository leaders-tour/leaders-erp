import { Card, Table, Td, Th } from '@tour/ui';
import type { PlanVersionDetail } from '../hooks';
import { isExternalTransferPlanStopRow } from '../plan-stop-row';
import {
  getMovementIntensityMeta,
  resolveMovementIntensityChipColor,
  resolveMovementIntensityForEstimateStop,
} from '../../estimate/model/movement-intensity';
import { useMovementIntensityColorSettings } from '../../app-settings/hooks';

interface VersionSnapshotViewProps {
  version: PlanVersionDetail;
}

export function VersionSnapshotView({ version }: VersionSnapshotViewProps): JSX.Element {
  const { colors: movementIntensityColors } = useMovementIntensityColorSettings();

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">버전 스냅샷 v{version.versionNumber}</h2>
        <p className="mt-1 text-xs text-slate-600">Read-only 일정 본문</p>
      </div>
      <div className="overflow-auto">
        <Table className="min-w-[1200px]">
          <thead>
            <tr>
              <Th>날짜</Th>
              <Th>목적지</Th>
              <Th>시간</Th>
              <Th>일정</Th>
              <Th>숙소</Th>
              <Th>식사</Th>
            </tr>
          </thead>
          <tbody>
            {version.planStops.map((row) => {
              const rowMovementIntensity = isExternalTransferPlanStopRow(row)
                ? null
                : resolveMovementIntensityForEstimateStop(
                    {
                      rowType: row.rowType,
                      movementIntensity: row.movementIntensity,
                      destinationCellText: row.destinationCellText,
                    },
                    null,
                  );
              const intensity = getMovementIntensityMeta(rowMovementIntensity, movementIntensityColors);
              const intensityColor = resolveMovementIntensityChipColor({
                movementIntensity: rowMovementIntensity,
                movementIntensityColorOverride: row.movementIntensityColorOverride,
                destinationMovementIntensityColorOverride: row.destinationMovementIntensityColorOverride,
                colors: movementIntensityColors,
              });

              return (
                <tr key={row.id}>
                  <Td className="whitespace-pre-wrap">{row.dateCellText}</Td>
                  <Td className="whitespace-pre-wrap">
                    <div className="flex items-start gap-2">
                      {!isExternalTransferPlanStopRow(row) ? (
                        <span
                          className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border border-slate-300"
                          aria-label={intensity?.label ?? '이동강도 미지정'}
                          title={intensity?.label ?? '이동강도 미지정'}
                          style={{ backgroundColor: intensityColor }}
                        />
                      ) : null}
                      <span>{row.destinationCellText}</span>
                    </div>
                  </Td>
                  <Td className="whitespace-pre-wrap">{row.timeCellText}</Td>
                  <Td className="whitespace-pre-wrap">{row.scheduleCellText}</Td>
                  <Td className="whitespace-pre-wrap">{row.lodgingCellText}</Td>
                  <Td className="whitespace-pre-wrap">{row.mealCellText}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
