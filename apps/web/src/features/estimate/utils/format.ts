import type { EstimateSecurityDepositMode, EstimateSecurityDepositScope } from '../model/types';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const dateOnly = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(value: string | null | undefined, days: number): string | null {
  const baseDate = toDate(value);
  if (!baseDate) {
    return null;
  }

  const next = new Date(baseDate.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return toIsoDate(next);
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function formatDateKorean(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '-';
  }

  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

export function formatDateShort(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '-';
  }

  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function formatTravelPeriod(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) {
    return '-';
  }

  const diffMs = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);

  if (diffDays < 0) {
    return '-';
  }

  const nights = diffDays;
  const days = diffDays + 1;
  return `${formatDateKorean(startDate)} ~ ${formatDateKorean(endDate)} (${nights}박${days}일)`;
}

export function formatHeadcount(total: number | null, male: number | null, female: number | null): string {
  if (total === null || male === null || female === null) {
    return '-';
  }

  return `${total}명 / 남 ${male} 여 ${female}`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${currencyFormatter.format(value)}원`;
}

export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

export function formatFlightText(date: string | null | undefined, time: string | null | undefined): string {
  const normalizedTime = time?.trim() ?? '';
  if (!date && normalizedTime.length === 0) {
    return '-';
  }

  if (!date) {
    return normalizedTime;
  }

  if (normalizedTime.length === 0) {
    return formatDateShort(date);
  }

  return `${formatDateShort(date)} - ${normalizedTime}`;
}

export function formatCalculationBasis(unitPriceKrw: number | null, quantity: number): string {
  if (unitPriceKrw === null) {
    return quantity > 0 ? `${quantity}회` : '-';
  }

  return `${formatCurrency(unitPriceKrw)} * ${quantity}`;
}

export function toSecurityDepositScope(mode: EstimateSecurityDepositMode): EstimateSecurityDepositScope {
  if (mode === 'PER_PERSON') {
    return '인당';
  }

  if (mode === 'PER_TEAM') {
    return '팀당';
  }

  return '-';
}

export function normalizeMultilineText(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}
