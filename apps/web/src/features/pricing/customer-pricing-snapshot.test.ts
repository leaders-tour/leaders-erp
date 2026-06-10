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
  it('단일 팀 견적 줄은 teamName 없이 스냅샷에 남긴다', () => {
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
        isSharedAcrossTeams: false,
      },
    ];

    const snap = buildCustomerPricingSnapshot(effective, displayed);
    expect(snap?.adjustmentLines[0]?.teamName).toBeNull();
    expect(snap?.adjustmentLines[0]?.label).toBe('조기종료');
    expect(snap?.depositAmountKrw).toBe(99_000);
    expect(snap?.teamPricings[0]?.depositAmountKrw).toBe(99_000);
  });

  it('복수 팀의 특정 팀 견적 줄은 teamName을 스냅샷에 남긴다', () => {
    const effective = {
      baseAmountKrw: 1_000_000,
      addonAmountKrw: 50_000,
      totalAmountKrw: 1_050_000,
      depositAmountKrw: 105_000,
      balanceAmountKrw: 945_000,
      securityDepositAmountKrw: 0,
      securityDepositUnitPriceKrw: 0,
      securityDepositQuantity: 0,
      securityDepositMode: 'NONE' as const,
      lines: [],
      originalPricing: {} as EffectivePricingResult['originalPricing'],
      manualPricing: null,
      adjustmentLines: [],
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          headcount: 2,
          baseAmountKrw: 1_000_000,
          addonAmountKrw: 50_000,
          totalAmountKrw: 1_050_000,
          depositAmountKrw: 105_000,
          balanceAmountKrw: 945_000,
          securityDepositAmountKrw: 0,
          securityDepositUnitPriceKrw: 0,
          securityDepositQuantity: 0,
          securityDepositMode: 'NONE' as const,
          lines: [],
          originalPricing: {} as EffectivePricingResult['teamPricings'][0]['originalPricing'],
          manualPricing: null,
          adjustmentLines: [],
        },
        {
          teamOrderIndex: 1,
          teamName: 'B팀',
          headcount: 2,
          baseAmountKrw: 1_000_000,
          addonAmountKrw: 0,
          totalAmountKrw: 1_000_000,
          depositAmountKrw: 100_000,
          balanceAmountKrw: 900_000,
          securityDepositAmountKrw: 0,
          securityDepositUnitPriceKrw: 0,
          securityDepositQuantity: 0,
          securityDepositMode: 'NONE' as const,
          lines: [],
          originalPricing: {} as EffectivePricingResult['teamPricings'][0]['originalPricing'],
          manualPricing: null,
          adjustmentLines: [],
        },
      ],
    } satisfies EffectivePricingResult;

    const displayed = [
      {
        ...line({ label: 'A팀 숙소 추가', leadAmountKrw: 50_000 }),
        sourceLines: [],
        teamOrderIndexes: [0],
        teamNames: ['A팀'],
        isSharedAcrossTeams: false,
      },
    ];

    const snap = buildCustomerPricingSnapshot(effective, displayed);
    expect(snap?.adjustmentLines[0]?.teamName).toBe('A팀');
  });

  it('PER_PERSON 수동 보증금 30,000원·6명이면 총액 180,000·단가 30,000으로 스냅샷에 저장한다', () => {
    const effective = {
      baseAmountKrw: 500_000,
      addonAmountKrw: 0,
      totalAmountKrw: 500_000,
      depositAmountKrw: 50_000,
      balanceAmountKrw: 450_000,
      securityDepositAmountKrw: 180_000,
      securityDepositUnitPriceKrw: 30_000,
      securityDepositQuantity: 6,
      securityDepositMode: 'PER_PERSON' as const,
      lines: [],
      originalPricing: {} as EffectivePricingResult['originalPricing'],
      manualPricing: null,
      adjustmentLines: [],
      teamPricings: [],
    } satisfies EffectivePricingResult;

    const snap = buildCustomerPricingSnapshot(effective, []);
    expect(snap?.securityDepositUnitKrw).toBe(30_000);
    expect(snap?.securityDepositTotalKrw).toBe(180_000);
    expect(snap?.securityDepositMode).toBe('PER_PERSON');
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
  it('단일 팀 스냅샷은 저장된 teamName이 있어도 숨긴다', () => {
    const snap: CustomerPricingSnapshot = {
      baseAmountKrw: 1,
      totalAmountKrw: 2,
      depositAmountKrw: 3,
      balanceAmountKrw: 4,
      securityDepositTotalKrw: 0,
      securityDepositUnitKrw: 0,
      securityDepositMode: 'NONE',
      adjustmentLines: [{ teamName: 'B팀', label: '할인', leadAmountKrw: -1, formula: 'x' }],
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'B팀',
          totalAmountKrw: 2,
          depositAmountKrw: 1,
          balanceAmountKrw: 1,
          securityDepositAmountKrw: 0,
          securityDepositUnitKrw: 0,
          securityDepositScope: '-',
        },
      ],
    };
    const rows = customerFacingAdjustmentLineRowsFromSnapshot(snap);
    expect(rows[0]?.teamName).toBeNull();
  });
});
