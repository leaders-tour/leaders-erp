export interface TimeParts {
  hour: number;
  minute: number;
}

export interface TimePickerViewState {
  hour: number;
  minute: number;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function getCurrentLocalHour(now: Date = new Date()): number {
  return now.getHours();
}

export function getCurrentLocalMinute(now: Date = new Date()): number {
  return now.getMinutes();
}

export function parseTimeValue(value: string | null | undefined): TimeParts | null {
  const trimmed = value?.trim() ?? '';
  const match = TIME_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function formatTimeValue(parts: TimeParts): string {
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function formatTimeTriggerLabel(value: string | null | undefined): string {
  const parsed = parseTimeValue(value);
  return parsed ? formatTimeValue(parsed) : '';
}

export function buildAllowedMinuteOptions(allowedMinutes?: readonly number[]): number[] {
  if (!allowedMinutes || allowedMinutes.length === 0) {
    return Array.from({ length: 12 }, (_, index) => index * 5);
  }

  const unique = Array.from(
    new Set(
      allowedMinutes.filter((minute) => Number.isInteger(minute) && minute >= 0 && minute <= 59).map((minute) => Number(minute)),
    ),
  ).sort((left, right) => left - right);

  return unique.length > 0 ? unique : Array.from({ length: 12 }, (_, index) => index * 5);
}

export function getNearestAllowedMinute(minute: number, allowedMinutes?: readonly number[]): number {
  const options = buildAllowedMinuteOptions(allowedMinutes);
  let nearest = options[0] ?? 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  options.forEach((option) => {
    const distance = Math.abs(option - minute);
    if (distance < nearestDistance) {
      nearest = option;
      nearestDistance = distance;
    }
  });

  return nearest;
}

export function getInitialTimePickerView(
  value: string | null | undefined,
  allowedMinutes?: readonly number[],
  now: Date = new Date(),
): TimePickerViewState {
  const parsed = parseTimeValue(value);
  if (parsed) {
    return {
      hour: parsed.hour,
      minute: getNearestAllowedMinute(parsed.minute, allowedMinutes),
    };
  }

  return {
    hour: getCurrentLocalHour(now),
    minute: getNearestAllowedMinute(getCurrentLocalMinute(now), allowedMinutes),
  };
}
