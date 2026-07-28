export type CustomerDocumentExternalTransferDirection = 'PICKUP' | 'DROP';

export type CustomerDocumentExternalTransfer = {
  direction: CustomerDocumentExternalTransferDirection;
  presetCode: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  departurePlace: string;
  arrivalPlace: string;
  selectedTeamOrderIndexes: number[];
  dateCellTextOverride?: string | null;
  destinationCellTextOverride?: string | null;
  timeCellTextOverride?: string | null;
  scheduleCellTextOverride?: string | null;
  lodgingCellTextOverride?: string | null;
  mealCellTextOverride?: string | null;
};

export type CustomerDocumentExternalTransferTeam = {
  orderIndex?: number;
  teamName: string;
  headcount?: number;
  flightInDate?: string | Date | null;
  flightInTime?: string | null;
  flightOutDate?: string | Date | null;
  flightOutTime?: string | null;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value: string | Date | null | undefined): { month: number; day: number } | null {
  if (!value) {
    return null;
  }

  const trimmed = value instanceof Date ? value.toISOString() : value.trim();
  const datePart = trimmed.includes('T') ? (trimmed.split('T')[0] ?? '') : (trimmed.split(' ')[0] ?? '');
  const match = ISO_DATE_PATTERN.exec(datePart);
  if (!match) {
    return null;
  }

  return {
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function formatExternalTransferLine(transfer: CustomerDocumentExternalTransfer, teamName?: string | null): string {
  const parsed = parseIsoDate(transfer.travelDate);
  const dateLabel = parsed
    ? `${String(parsed.month).padStart(2, '0')}/${String(parsed.day).padStart(2, '0')}`
    : '--/--';
  const trimmedTeamName = teamName?.trim() ?? '';
  const prefix = trimmedTeamName.length > 0 ? `${trimmedTeamName} ` : '';
  return `${prefix}${dateLabel} ${transfer.departureTime} ${transfer.departurePlace} > ${transfer.arrivalTime} ${transfer.arrivalPlace}`;
}

export function buildExternalTransferDirectionText(
  transfers: CustomerDocumentExternalTransfer[] | null | undefined,
  teams: CustomerDocumentExternalTransferTeam[] | null | undefined,
  direction: CustomerDocumentExternalTransferDirection,
): string {
  if (!transfers || !teams || transfers.length === 0 || teams.length === 0) {
    return '-';
  }

  const lines = transfers.flatMap((transfer) => {
    if (transfer.direction !== direction) {
      return [];
    }

    const shouldShowTeamName = teams.length > 1;
    return transfer.selectedTeamOrderIndexes
      .slice()
      .sort((left, right) => left - right)
      .map((teamOrderIndex) => {
        const team = teams[teamOrderIndex];
        if (!team) {
          return null;
        }

        const teamName = shouldShowTeamName ? team.teamName || `${teamOrderIndex + 1}번 팀` : null;
        return formatExternalTransferLine(transfer, teamName);
      })
      .filter((value): value is string => typeof value === 'string');
  });

  return lines.length > 0 ? lines.join('\n') : '-';
}
