import { describe, expect, it } from 'vitest';
import type { CustomerPricingSnapshot } from '@tour/domain';
import {
  buildCustomerOutputBaseAmountTeams,
  buildCustomerOutputSummaryTeams,
  buildCustomerPricingSnapshot,
  customerFacingAdjustmentLineRowsFromSnapshot,
  customerFacingTotalsFromSnapshot,
  resolveCustomerOutputTeamPricings,
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

  it('팀별 baseAmountKrw를 customerPricingSnapshot teamPricings에 저장한다', () => {
    const effective = {
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
      originalPricing: {} as EffectivePricingResult['originalPricing'],
      manualPricing: null,
      adjustmentLines: [],
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          headcount: 2,
          baseAmountKrw: 900_000,
          addonAmountKrw: 0,
          totalAmountKrw: 900_000,
          depositAmountKrw: 90_000,
          balanceAmountKrw: 810_000,
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
          headcount: 4,
          baseAmountKrw: 1_100_000,
          addonAmountKrw: 0,
          totalAmountKrw: 1_100_000,
          depositAmountKrw: 110_000,
          balanceAmountKrw: 990_000,
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

    const snap = buildCustomerPricingSnapshot(effective, []);
    expect(snap?.teamPricings[0]?.baseAmountKrw).toBe(900_000);
    expect(snap?.teamPricings[1]?.baseAmountKrw).toBe(1_100_000);
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

describe('resolveCustomerOutputTeamPricings', () => {
  it('스냅샷 팀 행이 없으면 effective pricing 팀 행으로 보완한다', () => {
    const effectiveTeam = {
      teamOrderIndex: 0,
      teamName: 'A팀',
      headcount: 3,
      baseAmountKrw: 1_000_000,
      addonAmountKrw: 40_000,
      totalAmountKrw: 1_048_000,
      depositAmountKrw: 98_000,
      balanceAmountKrw: 950_000,
      securityDepositAmountKrw: 90_000,
      securityDepositUnitPriceKrw: 30_000,
      securityDepositQuantity: 3,
      securityDepositMode: 'PER_PERSON' as const,
      lines: [],
      originalPricing: {} as EffectivePricingResult['teamPricings'][0]['originalPricing'],
      manualPricing: null,
      adjustmentLines: [],
    };
    const rows = resolveCustomerOutputTeamPricings({
      snapshotTeamPricings: [],
      effectiveTeamPricings: [
        effectiveTeam,
        {
          ...effectiveTeam,
          teamOrderIndex: 1,
          teamName: 'B팀',
          addonAmountKrw: 73_300,
          totalAmountKrw: 1_081_300,
          depositAmountKrw: 101_300,
          balanceAmountKrw: 980_000,
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.teamName).toBe('A팀');
    expect(rows[1]?.totalAmountKrw).toBe(1_081_300);
  });
});

describe('buildCustomerOutputSummaryTeams', () => {
  it('팀별 금액이 다르면 A/B 접두사를 붙여 펼친다', () => {
    const summary = buildCustomerOutputSummaryTeams({
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          baseAmountKrw: 900_000,
          totalAmountKrw: 1_048_000,
          depositAmountKrw: 98_000,
          balanceAmountKrw: 950_000,
          securityDepositAmountKrw: 90_000,
          securityDepositUnitKrw: 30_000,
          securityDepositScope: '인당',
        },
        {
          teamOrderIndex: 1,
          teamName: 'B팀',
          baseAmountKrw: 1_100_000,
          totalAmountKrw: 1_081_300,
          depositAmountKrw: 101_300,
          balanceAmountKrw: 980_000,
          securityDepositAmountKrw: 90_000,
          securityDepositUnitKrw: 30_000,
          securityDepositScope: '인당',
        },
      ],
    });
    expect(summary?.rows).toHaveLength(2);
    expect(summary?.showTeamPrefix).toBe(true);
  });
});

describe('buildCustomerOutputBaseAmountTeams', () => {
  it('팀별 기본금이 다르면 A/B 접두사를 붙여 펼친다', () => {
    const summary = buildCustomerOutputBaseAmountTeams({
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          baseAmountKrw: 900_000,
          totalAmountKrw: 948_000,
          depositAmountKrw: 98_000,
          balanceAmountKrw: 850_000,
          securityDepositAmountKrw: 0,
          securityDepositUnitKrw: 0,
          securityDepositScope: '-',
        },
        {
          teamOrderIndex: 1,
          teamName: 'B팀',
          baseAmountKrw: 1_100_000,
          totalAmountKrw: 1_181_300,
          depositAmountKrw: 101_300,
          balanceAmountKrw: 1_080_000,
          securityDepositAmountKrw: 0,
          securityDepositUnitKrw: 0,
          securityDepositScope: '-',
        },
      ],
    });
    expect(summary?.rows).toHaveLength(2);
    expect(summary?.showTeamPrefix).toBe(true);
  });

  it('팀별 기본금이 같으면 한 줄만 반환한다', () => {
    const summary = buildCustomerOutputBaseAmountTeams({
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          baseAmountKrw: 1_000_000,
          totalAmountKrw: 1_048_000,
          depositAmountKrw: 98_000,
          balanceAmountKrw: 950_000,
          securityDepositAmountKrw: 0,
          securityDepositUnitKrw: 0,
          securityDepositScope: '-',
        },
        {
          teamOrderIndex: 1,
          teamName: 'B팀',
          baseAmountKrw: 1_000_000,
          totalAmountKrw: 1_081_300,
          depositAmountKrw: 101_300,
          balanceAmountKrw: 980_000,
          securityDepositAmountKrw: 0,
          securityDepositUnitKrw: 0,
          securityDepositScope: '-',
        },
      ],
    });
    expect(summary?.rows).toHaveLength(1);
    expect(summary?.showTeamPrefix).toBe(false);
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
          baseAmountKrw: 1,
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
