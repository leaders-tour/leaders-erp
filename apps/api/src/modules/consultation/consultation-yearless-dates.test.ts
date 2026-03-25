import { describe, expect, it } from 'vitest';
import { consultationExtractionSchema, type ConsultationExtraction } from '@tour/validation';
import {
  applyYearlessSlashDateFallback,
  inferIsoFromMonthDay,
} from './consultation-yearless-dates';

const sampleForm = `▶ 성함 : 전이지
▶ 입출국일, 시간 : 9/11 몽골항공 4:30 입국 / 9/15 몽골항공 18:15 출국
▶ 희망 이동 강도 : 4`;

const sampleWithYear = `○ 여행기간 : 2026년 7월 16일(목) ~ 20일(월)
○ 항공편 : 7월 16일(목) 02:45 도착`;

function emptyExtraction(): ConsultationExtraction {
  return consultationExtractionSchema.parse({
    contact: { name: null, email: null },
    headcount: { total: 1, male: null, female: null, rawText: '' },
    destinationPreference: { rawText: '' },
    tourDates: { rawText: '', startDate: '2023-09-11', endDate: '2023-09-15' },
    flightOrBorder: {
      rawText: '',
      inbound: { date: '2023-09-11', time: '04:30' },
      outbound: { date: '2023-09-15', time: '18:15' },
    },
    movementIntensity: { level1to5: null, rawLabel: '' },
    lodgingPreference: { rawText: '' },
    vehicle: {},
    specialRequests: null,
  });
}

describe('consultation-yearless-dates', () => {
  it('inferIsoFromMonthDay uses same year when date is on or after ref', () => {
    expect(inferIsoFromMonthDay(9, 11, { y: 2026, m: 3, d: 25 })).toBe('2026-09-11');
  });

  it('inferIsoFromMonthDay rolls to next year when month/day already passed', () => {
    expect(inferIsoFromMonthDay(3, 10, { y: 2026, m: 3, d: 25 })).toBe('2027-03-10');
  });

  it('applyYearlessSlashDateFallback overwrites stale years when raw has no 4-digit year', () => {
    const next = applyYearlessSlashDateFallback(sampleForm, emptyExtraction(), '2026-03-25');
    expect(next.tourDates.startDate).toBe('2026-09-11');
    expect(next.tourDates.endDate).toBe('2026-09-15');
    expect(next.flightOrBorder.inbound?.date).toBe('2026-09-11');
    expect(next.flightOrBorder.outbound?.date).toBe('2026-09-15');
    expect(next.flightOrBorder.inbound?.time).toBe('04:30');
  });

  it('does not override when raw text contains explicit year', () => {
    const next = applyYearlessSlashDateFallback(sampleWithYear, emptyExtraction(), '2026-03-25');
    expect(next.tourDates.startDate).toBe('2023-09-11');
  });
});
