import { describe, expect, it, vi } from 'vitest';
import { consultationExtractionSchema, type ConsultationExtraction } from '@tour/validation';
import { ConsultationService } from './consultation.service';

function makeService() {
  const prisma = {
    region: { findMany: vi.fn().mockResolvedValue([]) },
    planTemplate: { findMany: vi.fn() },
  } as unknown as ConstructorParameters<typeof ConsultationService>[0];
  return new ConsultationService(prisma, null);
}

function minimalExtraction(overrides: Partial<ConsultationExtraction>): ConsultationExtraction {
  const base: ConsultationExtraction = {
    contact: { name: null, email: null },
    headcount: { total: 5, male: null, female: null, rawText: '5인' },
    destinationPreference: { rawText: '고비', normalizedKeyword: null },
    tourDates: { rawText: '4박 5일', startDate: null, endDate: null },
    flightOrBorder: {
      rawText: '',
    },
    movementIntensity: { level1to5: 4, rawLabel: '높음' },
    lodgingPreference: { rawText: 'Lv4', suggestedLevel: 'LV4' },
    vehicle: { wantsVehicle: true, mentionedTypes: ['스타렉스'] },
    specialRequests: null,
  };
  return consultationExtractionSchema.parse({ ...base, ...overrides });
}

describe('ConsultationService.extractionToDraft', () => {
  it('fills travel dates from inbound/outbound when tourDates are empty', async () => {
    const service = makeService();
    const extraction = minimalExtraction({
      flightOrBorder: {
        rawText: '9/11 입국 / 9/15 출국',
        inbound: { date: '2026-09-11', time: '04:30' },
        outbound: { date: '2026-09-15', time: '18:15' },
      },
    });

    const draft = await service.extractionToDraft(extraction);

    expect(draft.travelStartDate).toBe('2026-09-11');
    expect(draft.travelEndDate).toBe('2026-09-15');
    expect(draft.totalDays).toBe(5);
    expect(draft.flightInDate).toBe('2026-09-11');
    expect(draft.flightOutDate).toBe('2026-09-15');
  });

  it('keeps tourDates when set and still uses flight times', async () => {
    const service = makeService();
    const extraction = minimalExtraction({
      tourDates: {
        rawText: '7/16~7/20',
        startDate: '2026-07-16',
        endDate: '2026-07-20',
      },
      flightOrBorder: {
        rawText: '',
        inbound: { date: '2026-07-16', time: '02:45' },
        outbound: { date: '2026-07-20', time: '08:40' },
      },
    });

    const draft = await service.extractionToDraft(extraction);

    expect(draft.travelStartDate).toBe('2026-07-16');
    expect(draft.travelEndDate).toBe('2026-07-20');
    expect(draft.totalDays).toBe(5);
  });

  it('fills only missing endDate from outbound', async () => {
    const service = makeService();
    const extraction = minimalExtraction({
      tourDates: { rawText: '', startDate: '2026-09-11', endDate: null },
      flightOrBorder: {
        rawText: '',
        outbound: { date: '2026-09-15', time: '18:15' },
      },
    });

    const draft = await service.extractionToDraft(extraction);

    expect(draft.travelStartDate).toBe('2026-09-11');
    expect(draft.travelEndDate).toBe('2026-09-15');
    expect(draft.totalDays).toBe(5);
  });
});
