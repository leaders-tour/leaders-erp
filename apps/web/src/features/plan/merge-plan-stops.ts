import type { ExternalTransfer, ExternalTransferTeamLike } from './external-transfer';
import type { PlanStopRowBase } from './plan-stop-row';

function formatMonthDayLabel(value: string): string {
  const trimmed = value.trim();
  const parts = trimmed.split('-');
  if (parts.length !== 3) {
    return trimmed || '-';
  }

  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return trimmed;
  }

  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

function buildTransferTeamLabel(
  transfer: ExternalTransfer,
  teams: ExternalTransferTeamLike[],
): string {
  const labels = transfer.selectedTeamOrderIndexes
    .slice()
    .sort((left, right) => left - right)
    .map((teamOrderIndex) => teams[teamOrderIndex]?.teamName?.trim() || `${teamOrderIndex + 1}번 팀`);

  return labels.length > 0 ? labels.join(', ') : '팀 미지정';
}

function buildTransferScheduleLabel(transfer: ExternalTransfer): string {
  return transfer.direction === 'PICKUP' ? '실투어 외 픽업' : '실투어 외 드랍';
}

function buildTransferRows(
  transfers: ExternalTransfer[],
  teams: ExternalTransferTeamLike[],
  direction: 'PICKUP' | 'DROP',
): PlanStopRowBase[] {
  return transfers
    .filter((transfer) => transfer.direction === direction)
    .slice()
    .sort(
      (left, right) =>
        left.travelDate.localeCompare(right.travelDate) ||
        left.departureTime.localeCompare(right.departureTime) ||
        left.arrivalTime.localeCompare(right.arrivalTime),
    )
    .map((transfer) => ({
      rowType: 'EXTERNAL_TRANSFER' as const,
      locationId: null,
      locationVersionId: null,
      movementIntensity: null,
      dateCellText: `${formatMonthDayLabel(transfer.travelDate)}\n일정외`,
      destinationCellText: `${transfer.departurePlace || '-'} → ${transfer.arrivalPlace || '-'}`,
      timeCellText: `${transfer.departureTime || '-'}\n${transfer.arrivalTime || '-'}`,
      scheduleCellText: `${buildTransferScheduleLabel(transfer)}\n${buildTransferTeamLabel(transfer, teams)}`,
      lodgingCellText: '-',
      mealCellText: '-',
    }));
}

export function buildMergedPlanStops<T extends PlanStopRowBase>(
  mainRows: T[],
  transfers: ExternalTransfer[] | null | undefined,
  teams: ExternalTransferTeamLike[] | null | undefined,
): Array<T | PlanStopRowBase> {
  const normalizedTransfers = transfers ?? [];
  const normalizedTeams = teams ?? [];
  if (normalizedTransfers.length === 0) {
    return mainRows;
  }

  const pickupRows = buildTransferRows(normalizedTransfers, normalizedTeams, 'PICKUP');
  const dropRows = buildTransferRows(normalizedTransfers, normalizedTeams, 'DROP');
  return [...pickupRows, ...mainRows, ...dropRows];
}
