function resolveRoomCapacityLabel(capacity: number | null | undefined, roomType?: string | null): string | null {
  if (capacity != null && capacity > 0) {
    return `${capacity}인실`;
  }
  const roomTypeText = roomType?.trim();
  if (!roomTypeText) {
    return null;
  }
  const match = roomTypeText.match(/(\d+)\s*인(?:실)?/);
  if (match?.[1]) {
    return `${match[1]}인실`;
  }
  return null;
}

export function resolveConfirmationAccommodationName(
  lodgingNameSnapshot: string,
  accommodationName?: string | null,
): string {
  const linkedName = accommodationName?.trim();
  if (linkedName) {
    return linkedName;
  }
  const snapshot = lodgingNameSnapshot.trim();
  const dashIndex = snapshot.indexOf(' - ');
  if (dashIndex > 0) {
    return snapshot.slice(0, dashIndex).trim();
  }
  return snapshot;
}

export function normalizeConfirmationAccommodationLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return '';
  }

  const formattedMatch = trimmed.match(/^(.+?)\s+(\d+인실)\s+(\d+개)$/);
  if (formattedMatch?.[1] && formattedMatch[2] && formattedMatch[3]) {
    const name = resolveConfirmationAccommodationName(formattedMatch[1]);
    return `${name} ${formattedMatch[2]} ${formattedMatch[3]}`;
  }

  const countOnlyMatch = trimmed.match(/^(.+?)\s+(\d+개)$/);
  if (countOnlyMatch?.[1] && countOnlyMatch[2]) {
    const name = resolveConfirmationAccommodationName(countOnlyMatch[1]);
    return `${name} ${countOnlyMatch[2]}`;
  }

  return resolveConfirmationAccommodationName(trimmed);
}

export function formatConfirmationAccommodationLine(input: {
  name: string;
  roomCount: number;
  capacity?: number | null;
  roomType?: string | null;
}): string {
  const name = input.name.trim();
  if (!name) {
    return '';
  }
  const roomCount = input.roomCount > 0 ? input.roomCount : 1;
  const capacityLabel = resolveRoomCapacityLabel(input.capacity, input.roomType);
  if (capacityLabel) {
    return `${name} ${capacityLabel} ${roomCount}개`;
  }
  return `${name} ${roomCount}개`;
}

export function accommodationLineGroupKey(input: {
  name: string;
  capacity?: number | null;
  roomType?: string | null;
}): string {
  const name = input.name.trim();
  const capacityLabel = resolveRoomCapacityLabel(input.capacity, input.roomType);
  const roomType = input.roomType?.trim() ?? '';
  return `${name}|${capacityLabel ?? roomType}`;
}
