import { describe, expect, it } from 'vitest';
import { catalogPlaceCreateSchema, catalogPlaceUpdateSchema } from './catalog.schema';

describe('catalog place visit judgment', () => {
  it('keeps stay minutes for stay-type places', () => {
    const result = catalogPlaceCreateSchema.safeParse({
      name: 'A캠프',
      placeType: 'LODGING',
      visitJudgmentType: 'STAY',
      visitRadiusM: 50,
      visitMinStayMinutes: 3,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visitJudgmentType).toBe('STAY');
      expect(result.data.visitRadiusM).toBe(50);
      expect(result.data.visitMinStayMinutes).toBe(3);
    }
  });

  it('drops stay minutes when the place is pass-type', () => {
    const result = catalogPlaceCreateSchema.safeParse({
      name: 'A캠프 출입구',
      placeType: 'GATE',
      visitJudgmentType: 'PASS',
      visitRadiusM: 35,
      visitMinStayMinutes: 3,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visitJudgmentType).toBe('PASS');
      expect(result.data.visitRadiusM).toBe(35);
      expect(result.data.visitMinStayMinutes).toBeNull();
    }
  });

  it('allows restaurants to link an accommodation', () => {
    const result = catalogPlaceCreateSchema.safeParse({
      name: 'A캠프 식당',
      placeType: 'RESTAURANT',
      accommodationId: 'acc-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects accommodation links on experience places', () => {
    const result = catalogPlaceCreateSchema.safeParse({
      name: 'ATV',
      placeType: 'EXPERIENCE',
      accommodationId: 'acc-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a zero visit radius', () => {
    const result = catalogPlaceUpdateSchema.safeParse({
      visitRadiusM: 0,
    });

    expect(result.success).toBe(false);
  });
});
