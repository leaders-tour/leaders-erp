import { describe, expect, it } from 'vitest';
import type { CustomerPricingSnapshot } from '@tour/domain';
import {
  buildCustomerPricingSnapshot,
  customerFacingAdjustmentLineRowsFromSnapshot,
  customerFacingTotalsFromSnapshot,
} from './customer-pricing-snapshot';
import type { EffectivePricingResult, PricingAdjustmentLineRow } from './manual-pricing';

function line(partial: Partial<PricingAdjustmentLineRow> & Pick<PricingAdjustmentLineRow, 'label'>): PricingAdjustmentLineRow {
  return {
    id: partial.id ?? 'x',
    type: partial.type ?? 'MANUAL',
    rowKey: partial.rowKey ?? null,
    teamOrderIndex: partial.teamOrderIndex ?? null,
    teamName: partial.teamName ?? null,
    headcount: partial.headcount ?? null,
    label: partial.label,
    leadAmountKrw: partial.leadAmountKrw ?? 0,
    formula: partial.formula ?? '',
    strikethrough: partial.strikethrough ?? false,
    deleted: partial.deleted ?? false,
    isManual: partial.isManual ?? true,
  };
}

describe('buildCustomerPricingSnapshot', () => {
  it('공유 할인 줄은 teamName 없이 스냅샷에 남긴다', () => {
    const adjustmentLines: PricingAdjustmentLineRow[] = [
      line({
        id: '1',
        label: '조기종료',
        leadAmountKrw: -30_000,
        teamOrderIndex: 0,
        teamName: 'A팀',
      }),
    ];
    const effective = {
      baseAmountKrw: 1_000_000,
      addonAmountKrw: 99_000,
      totalAmountKrw: 1_099_000,
      depositAmountKrw: 99_000,
      balanceAmountKrw: 1_000_000,
      securityDepositAmountKrw: 300_000,
      securityDepositUnitPriceKrw: 300_000,
      securityDepositQuantity: 1,
      securityDepositMode: 'PER_TEAM' as const,
      lines: [],
      originalPricing: {} as EffectivePricingResult['originalPricing'],
      manualPricing: null,
      adjustmentLines,
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          headcount: 2,
          baseAmountKrw: 1_000_000,
          addonAmountKrw: 99_000,
          totalAmountKrw: 1_099_000,
          depositAmountKrw: 99_000,
          balanceAmountKrw: 1_000_000,
          securityDepositAmountKrw: 300_000,
          securityDepositUnitPriceKrw: 300_000,
          securityDepositQuantity: 1,
          securityDepositMode: 'PER_TEAM' as const,
          lines: [],
          originalPricing: {} as EffectivePricingResult['teamPricings'][0]['originalPricing'],
          manualPricing: null,
          adjustmentLines,
        },
      ],
    } satisfies EffectivePricingResult;

    const displayed = [
      {
        ...line({
          id: 'g1',
          label: '조기종료',
          leadAmountKrw: -30_000,
          teamOrderIndex: null,
          teamName: null,
        }),
        sourceLines: adjustmentLines,
        teamOrderIndexes: [0],
        teamNames: ['A팀'],
        isSharedAcrossTeams: true,
      },
    ];

    const snap = buildCustomerPricingSnapshot(effective, displayed);
    expect(snap?.adjustmentLines[0]?.teamName).toBeNull();
    expect(snap?.adjustmentLines[0]?.label).toBe('조기종료');
    expect(snap?.depositAmountKrw).toBe(99_000);
    expect(snap?.teamPricings[0]?.depositAmountKrw).toBe(99_000);
  });
});

describe('customerFacingTotalsFromSnapshot', () => {
  it('보증금 필드를 EffectiveTotalsSlice 형태로 매핑한다', () => {
    const snap: CustomerPricingSnapshot = {
      baseAmountKrw: 1,
      totalAmountKrw: 2,
      depositAmountKrw: 3,
      balanceAmountKrw: 4,
      securityDepositTotalKrw: 300,
      securityDepositUnitKrw: 100,
      securityDepositMode: 'PER_PERSON',
      adjustmentLines: [],
      teamPricings: [],
    };
    const slice = customerFacingTotalsFromSnapshot(snap);
    expect(slice.securityDepositAmountKrw).toBe(300);
    expect(slice.securityDepositUnitPriceKrw).toBe(100);
    expect(slice.securityDepositMode).toBe('PER_PERSON');
  });
});

describe('customerFacingAdjustmentLineRowsFromSnapshot', () => {
  it('스냅샷 teamName을 그대로 쓴다', () => {
    const snap: CustomerPricingSnapshot = {
      baseAmountKrw: 1,
      totalAmountKrw: 2,
      depositAmountKrw: 3,
      balanceAmountKrw: 4,
      securityDepositTotalKrw: 0,
      securityDepositUnitKrw: 0,
      securityDepositMode: 'NONE',
      adjustmentLines: [{ teamName: 'B팀', label: '할인', leadAmountKrw: -1, formula: 'x' }],
      teamPricings: [],
    };
    const rows = customerFacingAdjustmentLineRowsFromSnapshot(snap);
    expect(rows[0]?.teamName).toBe('B팀');
  });
});
