import type { ExternalTransfer, ExternalTransferTeamLike } from './external-transfer';
import type { PlanStopRowBase } from './plan-stop-row';

function resolveTransferDestinationLabel(place: string): string {
  const trimmed = place.trim();
  if (trimmed === '공항') {
    return '칭기즈칸 공항';
  }
  if (trimmed === '오즈하우스') {
    return '오즈게스트하우스';
  }
  return trimmed || '-';
}

function appendDirectionParticle(value: string): string {
  const trimmed = value.trim();
  const lastChar = trimmed[trimmed.length - 1];
  if (!lastChar) {
    return trimmed;
  }

  const codePoint = lastChar.charCodeAt(0);
  const hangulBase = 0xac00;
  const hangulLast = 0xd7a3;
  if (codePoint < hangulBase || codePoint > hangulLast) {
    return `${trimmed}로`;
  }

  const jongseongIndex = (codePoint - hangulBase) % 28;
  const suffix = jongseongIndex === 0 || jongseongIndex === 8 ? '로' : '으로';
  return `${trimmed}${suffix}`;
}

function buildTransferPickupSubject(transfer: ExternalTransfer, teams: ExternalTransferTeamLike[]): string {
  const selectedTeams = Array.from(new Set(transfer.selectedTeamOrderIndexes))
    .sort((left, right) => left - right)
    .map((teamOrderIndex) => ({
      teamOrderIndex,
      team: teams[teamOrderIndex],
    }))
    .filter(
      (entry): entry is { teamOrderIndex: number; team: ExternalTransferTeamLike } =>
        Number.isInteger(entry.teamOrderIndex) && Boolean(entry.team),
    );

  if (selectedTeams.length === 0) {
    return '팀 미지정';
  }

  if (teams.length > 0 && selectedTeams.length === teams.length) {
    return '전원';
  }

  return selectedTeams
    .map(({ team, teamOrderIndex }) => {
      const teamName = team.teamName?.trim() || `${teamOrderIndex + 1}번 팀`;
      const headcount = Number.isFinite(team.headcount) ? Math.max(0, Number(team.headcount)) : null;
      return headcount && headcount > 0 ? `${teamName} ${headcount}인` : teamName;
    })
    .join(', ');
}

function buildTransferScheduleText(transfer: ExternalTransfer, teams: ExternalTransferTeamLike[]): string {
  const destination = resolveTransferDestinationLabel(transfer.arrivalPlace);
  const pickupSubject = buildTransferPickupSubject(transfer, teams);
  return `${pickupSubject} 픽업 후 ${appendDirectionParticle(destination)} 출발\n${destination} 드랍`;
}

function buildTransferLodgingText(destination: string): string {
  if (destination.includes('게하') || destination.includes('게스트하우스')) {
    return '오즈게스트하우스';
  }
  if (destination.includes('울란바토르') || destination.includes('공항')) {
    return '숙소미포함';
  }
  return '-';
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
      dateCellText: '기간외',
      destinationCellText: resolveTransferDestinationLabel(transfer.arrivalPlace),
      timeCellText: `${transfer.departureTime || '-'}\n${transfer.arrivalTime || '-'}`,
      scheduleCellText: buildTransferScheduleText(transfer, teams),
      lodgingCellText: buildTransferLodgingText(resolveTransferDestinationLabel(transfer.arrivalPlace)),
      mealCellText: 'X',
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
