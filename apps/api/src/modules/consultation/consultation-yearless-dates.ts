import type { ConsultationExtraction } from '@tour/validation';

/** 상담 추출 시 "오늘" 기준(한국 시간). */
export function formatReferenceDateKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parseIsoYmd(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function isReasonableMonthDay(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** ref 이후(당일 포함)로 가장 가까운 해당 월·일의 YYYY-MM-DD (UTC 달력 기준). */
export function inferIsoFromMonthDay(
  month: number,
  day: number,
  ref: { y: number; m: number; d: number },
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tRef = Date.UTC(ref.y, ref.m - 1, ref.d);
  let y = ref.y;
  let cand = Date.UTC(y, month - 1, day);
  if (cand < tRef) {
    y += 1;
    cand = Date.UTC(y, month - 1, day);
  }
  return `${y}-${pad(month)}-${pad(day)}`;
}

/**
 * 원문에 4자리 연도(19xx/20xx)가 없고, 입출국 줄에 `M/D`가 두 번 이상이면
 * LLM 출력과 무관하게 서버 규칙으로 tourDates·flight 날짜를 맞춘다.
 * (모델이 2023 등 임의 과거 연도를 넣는 경우 방지)
 */
export function applyYearlessSlashDateFallback(
  rawText: string,
  extraction: ConsultationExtraction,
  referenceDateIso: string,
): ConsultationExtraction {
  if (/\b(19|20)\d{2}\b/.test(rawText)) {
    return extraction;
  }

  const ref = parseIsoYmd(referenceDateIso);
  if (!ref) return extraction;

  const line =
    rawText
      .split('\n')
      .map((l) => l.trim())
      .find((l) => /입출국|입국/.test(l) && /출국/.test(l)) ?? rawText;

  const matches = [...line.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)];
  const first = matches[0];
  const second = matches[1];
  if (!first || !second) return extraction;

  const month0 = Number(first[1]);
  const day0 = Number(first[2]);
  const month1 = Number(second[1]);
  const day1 = Number(second[2]);
  if (!isReasonableMonthDay(month0, day0) || !isReasonableMonthDay(month1, day1)) {
    return extraction;
  }

  const startIso = inferIsoFromMonthDay(month0, day0, ref);
  const endIso = inferIsoFromMonthDay(month1, day1, ref);

  const inbound = extraction.flightOrBorder.inbound;
  const outbound = extraction.flightOrBorder.outbound;

  return {
    ...extraction,
    tourDates: {
      ...extraction.tourDates,
      startDate: startIso,
      endDate: endIso,
    },
    flightOrBorder: {
      ...extraction.flightOrBorder,
      inbound: {
        date: startIso,
        time: inbound?.time ?? null,
      },
      outbound: {
        date: endIso,
        time: outbound?.time ?? null,
      },
    },
  };
}
