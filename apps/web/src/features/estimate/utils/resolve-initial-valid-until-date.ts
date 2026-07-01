import { ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import { addDays, isoDatePart, todayIsoDate } from './format';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const EXTENSION_DAYS_PER_WEEK = 3;

function utcDateMs(value: string): number | null {
  const datePart = isoDatePart(value);
  if (!datePart) {
    return null;
  }

  const parsed = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function resolveParentValidUntilDate(
  parentValidUntilDate: string | null | undefined,
  parentMetaCreatedAt: string,
): string {
  if (parentValidUntilDate) {
    const datePart = isoDatePart(parentValidUntilDate);
    if (datePart) {
      return datePart;
    }
  }

  const createdPart = isoDatePart(parentMetaCreatedAt);
  if (!createdPart) {
    return addDays(todayIsoDate(), ESTIMATE_VALIDITY_DAYS) ?? todayIsoDate();
  }

  return addDays(createdPart, ESTIMATE_VALIDITY_DAYS) ?? createdPart;
}

export function resolveInitialValidUntilDateForNewVersion(input: {
  parentMetaCreatedAt: string;
  parentValidUntilDate: string | null | undefined;
  referenceDate?: string;
}): string {
  const referenceDate = input.referenceDate ?? todayIsoDate();
  const baseValidUntil = resolveParentValidUntilDate(input.parentValidUntilDate, input.parentMetaCreatedAt);

  const parentCreatedMs = utcDateMs(input.parentMetaCreatedAt);
  const referenceMs = utcDateMs(referenceDate);
  if (parentCreatedMs === null || referenceMs === null) {
    return clampValidUntilToReference(baseValidUntil, referenceDate);
  }

  const elapsedDays = Math.floor((referenceMs - parentCreatedMs) / MS_PER_DAY);
  const completedWeeks = Math.floor(elapsedDays / DAYS_PER_WEEK);
  const candidate =
    completedWeeks < 1
      ? baseValidUntil
      : addDays(baseValidUntil, completedWeeks * EXTENSION_DAYS_PER_WEEK) ?? baseValidUntil;

  return clampValidUntilToReference(candidate, referenceDate);
}

/** 연장 결과가 오늘보다 과거면, 오늘 기준 +14일로 새 유효기간을 부여한다. */
function clampValidUntilToReference(candidate: string, referenceDate: string): string {
  const candidateMs = utcDateMs(candidate);
  const referenceMs = utcDateMs(referenceDate);
  if (candidateMs === null || referenceMs === null) {
    return candidate;
  }

  if (candidateMs < referenceMs) {
    return addDays(referenceDate, ESTIMATE_VALIDITY_DAYS) ?? referenceDate;
  }

  return candidate;
}
