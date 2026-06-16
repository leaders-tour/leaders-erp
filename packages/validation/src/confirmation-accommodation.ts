const DISPLAY_LODGING_LEVEL = 'LV4';

function isLv4Level(value: string | null | undefined): boolean {
  return value?.trim() === DISPLAY_LODGING_LEVEL;
}

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

export function resolveConfirmationAccommodationLevelTag(input: {
  lodgingType?: string | null;
  optionLevel?: string | null;
  planLodgingSelectionLevel?: string | null;
}): string | null {
  if (isLv4Level(input.lodgingType)) {
    return DISPLAY_LODGING_LEVEL;
  }
  if (isLv4Level(input.planLodgingSelectionLevel)) {
    return DISPLAY_LODGING_LEVEL;
  }
  if (isLv4Level(input.optionLevel)) {
    return DISPLAY_LODGING_LEVEL;
  }
  return null;
}

export function lodgingSelectionLevelByDay(lodgingSelections: unknown): Map<number, string> {
  const byDay = new Map<number, string>();
  if (!Array.isArray(lodgingSelections)) {
    return byDay;
  }

  for (const item of lodgingSelections) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const dayIndex = Number((item as { dayIndex?: unknown }).dayIndex);
    const level = (item as { level?: unknown }).level;
    if (!Number.isFinite(dayIndex) || typeof level !== 'string') {
      continue;
    }
    const trimmedLevel = level.trim();
    if (trimmedLevel) {
      byDay.set(dayIndex, trimmedLevel);
    }
  }

  return byDay;
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

function buildAccommodationSpec(
  roomCount: number,
  capacity?: number | null,
  roomType?: string | null,
  levelTag?: string | null,
): string {
  const count = roomCount > 0 ? roomCount : 1;
  const capacityLabel = resolveRoomCapacityLabel(capacity, roomType);
  const levelSuffix = levelTag?.trim() === DISPLAY_LODGING_LEVEL ? ` ${DISPLAY_LODGING_LEVEL}` : '';
  if (capacityLabel) {
    return `${capacityLabel} ${count}개${levelSuffix}`;
  }
  return `${count}개${levelSuffix}`;
}

export function normalizeConfirmationAccommodationLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return '';
  }

  const formattedMatch = trimmed.match(/^(.+?)\s+(\d+인실\s+\d+개(?:\s+LV4)?|\d+개(?:\s+LV4)?)$/);
  if (formattedMatch?.[1] && formattedMatch[2]) {
    const name = resolveConfirmationAccommodationName(formattedMatch[1]);
    return `${name} ${formattedMatch[2]}`;
  }

  return resolveConfirmationAccommodationName(trimmed);
}

export function splitConfirmationAccommodationDisplay(line: string): { name: string; spec: string } {
  const normalized = normalizeConfirmationAccommodationLine(line);
  if (!normalized) {
    return { name: '', spec: '' };
  }

  const withCapacity = normalized.match(/^(.+?)\s+(\d+인실\s+\d+개(?:\s+LV4)?)$/);
  if (withCapacity?.[1] && withCapacity[2]) {
    return { name: withCapacity[1], spec: withCapacity[2] };
  }

  const countOnly = normalized.match(/^(.+?)\s+(\d+개(?:\s+LV4)?)$/);
  if (countOnly?.[1] && countOnly[2]) {
    return { name: countOnly[1], spec: countOnly[2] };
  }

  return { name: normalized, spec: '' };
}

export function formatConfirmationAccommodationLine(input: {
  name: string;
  roomCount: number;
  capacity?: number | null;
  roomType?: string | null;
  levelTag?: string | null;
}): string {
  const name = input.name.trim();
  if (!name) {
    return '';
  }
  const spec = buildAccommodationSpec(input.roomCount, input.capacity, input.roomType, input.levelTag);
  return `${name} ${spec}`;
}

export function accommodationLineGroupKey(input: {
  name: string;
  capacity?: number | null;
  roomType?: string | null;
  levelTag?: string | null;
}): string {
  const name = input.name.trim();
  const capacityLabel = resolveRoomCapacityLabel(input.capacity, input.roomType);
  const roomType = input.roomType?.trim() ?? '';
  const levelTag = input.levelTag?.trim() === DISPLAY_LODGING_LEVEL ? DISPLAY_LODGING_LEVEL : '';
  return `${name}|${capacityLabel ?? roomType}|${levelTag}`;
}
