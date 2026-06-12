function cell(value: string | undefined): string | null {
  const trimmed = value?.normalize('NFKC').trim() ?? '';
  return trimmed || null;
}

function inferYearForMonthDay(month: number, day: number): number {
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate.getTime() > now.getTime()) {
    year -= 1;
  }
  return year;
}

export function parseOptionalDate(value: string | null, yearHint?: number | null): Date | null {
  if (!value) {
    return null;
  }
  const koreanDateTime = value.match(
    /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (koreanDateTime) {
    const [, year, month, day, meridiem, hourRaw, minuteRaw, secondRaw] = koreanDateTime;
    let hour = Number(hourRaw);
    if (meridiem === '오후' && hour < 12) {
      hour += 12;
    }
    if (meridiem === '오전' && hour === 12) {
      hour = 0;
    }
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour,
      Number(minuteRaw),
      Number(secondRaw ?? '0'),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const monthDayTime = value.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (monthDayTime) {
    const [, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw] = monthDayTime;
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const year = yearHint ?? inferYearForMonthDay(month, day);
    const parsed = new Date(
      year,
      month - 1,
      day,
      Number(hourRaw),
      Number(minuteRaw),
      Number(secondRaw ?? '0'),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const PAYMENT_RECEIVED_AT_RAW_KEYS = ['입금일시', '입금일', '거래일시', '거래일자', '날짜', '일시', 'date'];
/** 시트 컬럼명 오타(타임스템프) 포함 — 연도 없는 입금일시 파싱에 사용 */
const PAYMENT_TIMESTAMP_RAW_KEYS = ['타임스탬프', '타임스템프', 'timestamp'];

function parseYearFromTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const koreanDate = value.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (koreanDate) {
    const year = Number(koreanDate[1]);
    return Number.isSafeInteger(year) ? year : null;
  }
  const parsed = parseOptionalDate(value);
  return parsed ? parsed.getFullYear() : null;
}

function paymentTimestampFromRawJson(rawJson: Record<string, string>): string | null {
  for (const key of PAYMENT_TIMESTAMP_RAW_KEYS) {
    const value = cell(rawJson[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

export function parsePaymentReceivedAtFromRawJson(rawJson: Record<string, string>): Date | null {
  const yearHint = parseYearFromTimestamp(paymentTimestampFromRawJson(rawJson));

  for (const key of PAYMENT_RECEIVED_AT_RAW_KEYS) {
    const parsed = parseOptionalDate(cell(rawJson[key]), yearHint);
    if (parsed) {
      return parsed;
    }
  }

  const timestampValue = paymentTimestampFromRawJson(rawJson);
  return timestampValue ? parseOptionalDate(timestampValue) : null;
}

export function paymentReceivedAtEquals(
  left: Date | null | undefined,
  right: Date | null | undefined,
): boolean {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null);
}
