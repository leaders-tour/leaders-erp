import { describe, expect, it } from 'vitest';
import { externalTransferInputSchema } from './plan.schema';

const baseTransfer = {
  direction: 'PICKUP' as const,
  presetCode: 'PICKUP_AIRPORT_OZHOUSE' as const,
  travelDate: '2026-07-01T00:00:00.000Z',
  departureTime: '13:45',
  arrivalTime: '15:15',
  departurePlace: '공항',
  arrivalPlace: '오즈하우스',
  selectedTeamOrderIndexes: [0],
};

describe('externalTransferInputSchema customer-document overrides', () => {
  it('keeps optional schedule cell overrides', () => {
    const parsed = externalTransferInputSchema.parse({
      ...baseTransfer,
      dateCellTextOverride: '기간외',
      destinationCellTextOverride: '직접 입력 목적지',
      timeCellTextOverride: '13:50\n15:20',
      scheduleCellTextOverride: '직접 입력 일정',
      lodgingCellTextOverride: '',
      mealCellTextOverride: '아침: X\n점심: X\n저녁: X',
    });

    expect(parsed).toMatchObject({
      destinationCellTextOverride: '직접 입력 목적지',
      scheduleCellTextOverride: '직접 입력 일정',
      lodgingCellTextOverride: '',
    });
  });

  it('accepts legacy transfers without overrides', () => {
    expect(externalTransferInputSchema.safeParse(baseTransfer).success).toBe(true);
  });
});
