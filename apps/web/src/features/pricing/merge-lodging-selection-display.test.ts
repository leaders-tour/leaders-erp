import { describe, expect, it } from 'vitest';
import { mergeLodgingSelectionDisplayLines } from './merge-lodging-selection-display';
import type { PricingViewLine } from './view-model';

function line(partial: Partial<PricingViewLine> & Pick<PricingViewLine, 'lineCode' | 'amountKrw'>): PricingViewLine {
  return {
    sourceType: 'MANUAL',
    description: null,
    unitPriceKrw: null,
    quantity: 1,
    ...partial,
  };
}

describe('mergeLodgingSelectionDisplayLines', () => {
  it('merges same LV tier across days at first occurrence and preserves other lines order', () => {
    const hiace = line({ lineCode: 'HIACE', unitPriceKrw: 5000, quantity: 6, amountKrw: 30_000, description: null });
    const lv4a = line({
      lineCode: 'LODGING_SELECTION',
      description: '5일차 LV4',
      unitPriceKrw: 50_000,
      quantity: 1,
      amountKrw: 50_000,
    });
    const lv4b = line({
      lineCode: 'LODGING_SELECTION',
      description: '6일차 LV4',
      unitPriceKrw: 50_000,
      quantity: 1,
      amountKrw: 50_000,
    });
    const early = line({ lineCode: 'EARLY', unitPriceKrw: 40_000, quantity: 1, amountKrw: 40_000, description: null });

    const merged = mergeLodgingSelectionDisplayLines([hiace, lv4a, lv4b, early]);

    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({ lineCode: 'HIACE', amountKrw: 30_000 });
    expect(merged[1]).toMatchObject({
      lineCode: 'LODGING_SELECTION',
      description: '숙소 업그레이드',
      unitPriceKrw: 50_000,
      quantity: 2,
      amountKrw: 100_000,
      quantityDisplaySuffix: '박',
    });
    expect(merged[2]).toMatchObject({ lineCode: 'EARLY', amountKrw: 40_000 });
  });

  it('does not merge when only one day of a tier', () => {
    const lv4 = line({
      lineCode: 'LODGING_SELECTION',
      description: '3일차 LV4',
      unitPriceKrw: 50_000,
      quantity: 1,
      amountKrw: 50_000,
    });
    const merged = mergeLodgingSelectionDisplayLines([lv4]);
    expect(merged).toHaveLength(1);
    const row = merged[0];
    expect(row).toBeDefined();
    expect(row).toMatchObject({ description: '3일차 LV4' });
    expect(row?.quantityDisplaySuffix).toBeUndefined();
  });

  it('keeps LV2 and LV4 as separate groups', () => {
    const lv2 = line({
      lineCode: 'LODGING_SELECTION',
      description: '1일차 LV2',
      unitPriceKrw: -30_000,
      quantity: 1,
      amountKrw: -30_000,
    });
    const lv4a = line({
      lineCode: 'LODGING_SELECTION',
      description: '5일차 LV4',
      unitPriceKrw: 50_000,
      quantity: 1,
      amountKrw: 50_000,
    });
    const lv4b = line({
      lineCode: 'LODGING_SELECTION',
      description: '6일차 LV4',
      unitPriceKrw: 50_000,
      quantity: 1,
      amountKrw: 50_000,
    });

    const merged = mergeLodgingSelectionDisplayLines([lv2, lv4a, lv4b]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ description: '1일차 LV2' });
    expect(merged[1]).toMatchObject({ description: '숙소 업그레이드', quantity: 2, amountKrw: 100_000 });
  });

  it('ignores CUSTOM lodging descriptions', () => {
    const custom = line({
      lineCode: 'LODGING_SELECTION',
      description: '2일차 숙소지정: 테스트',
      unitPriceKrw: 80_000,
      quantity: 1,
      amountKrw: 80_000,
    });
    const merged = mergeLodgingSelectionDisplayLines([custom, custom]);
    expect(merged).toHaveLength(2);
  });
});
