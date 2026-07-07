import { describe, expect, it } from 'vitest';
import { confirmationDocumentSnapshotSchema } from './confirmation-document.schema';

const baseSnapshot = {
  leaderName: '홍길동',
  destination: '중부',
  headcountText: '4명',
  travelPeriodText: '2026.07.01 ~ 2026.07.05',
  vehicleType: '스타렉스',
  flightInText: 'KE123',
  flightOutText: 'KE456',
  pickupText: '공항',
  dropText: '공항',
  externalPickupDropText: '',
  specialNote: '',
  rentalItemsText: '',
  eventNames: '',
  remark: '',
  balancePerPersonText: '100,000원',
  guideName: '',
  meetingPlace: '공항',
  travelers: [{ name: '홍길동' }],
  accommodationLines: ['Day1 호텔'],
};

describe('confirmationDocumentSnapshotSchema', () => {
  it('accepts snapshots without appendixPlanStops', () => {
    const result = confirmationDocumentSnapshotSchema.safeParse(baseSnapshot);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appendixPlanStops).toBeUndefined();
    }
  });

  it('accepts appendixPlanStops: null from GraphQL or legacy JSON and normalizes to undefined', () => {
    const result = confirmationDocumentSnapshotSchema.safeParse({
      ...baseSnapshot,
      appendixPlanStops: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appendixPlanStops).toBeUndefined();
    }
  });

  it('accepts appendixPlanStops rows when present', () => {
    const result = confirmationDocumentSnapshotSchema.safeParse({
      ...baseSnapshot,
      appendixPlanStops: [
        {
          dateCellText: 'Day1',
          destinationCellText: '울란바토르',
          timeCellText: '09:00',
          scheduleCellText: '도착',
          lodgingCellText: '호텔',
          mealCellText: '중식',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appendixPlanStops).toHaveLength(1);
    }
  });
});
