import { describe, expect, it } from 'vitest';
import type { PricingManualSourceLine } from '@tour/domain';
import { buildEffectivePricing, resolveAdjustmentLinesForCustomerDocument, sliceEffectiveTotalsForUi } from './manual-pricing';

describe('buildEffectivePricing', () => {
  it('applies manual output overrides to merged display rows', () => {
    const autoPricing = buildEffectivePricing({
      baseAmountKrw: 100_000,
      addonAmountKrw: 100_000,
      totalAmountKrw: 200_000,
      depositAmountKrw: 20_000,
      balanceAmountKrw: 180_000,
      securityDepositAmountKrw: 0,
      securityDepositEvent: null,
      securityDepositUnitPriceKrw: 0,
      securityDepositQuantity: 0,
      securityDepositMode: 'NONE',
      lines: [
        {
          ruleType: 'BASE',
          lineCode: 'BASE',
          sourceType: 'RULE',
          description: '기본금',
          ruleId: 'rule-base',
          unitPriceKrw: 100_000,
          quantity: 1,
          amountKrw: 100_000,
        },
        {
          ruleType: 'CONDITIONAL_ADDON',
          lineCode: 'LODGING_SELECTION',
          sourceType: 'RULE',
          description: '2일차 LV4',
          ruleId: 'rule-lv4-a',
          unitPriceKrw: 50_000,
          quantity: 1,
          amountKrw: 50_000,
        },
        {
          ruleType: 'CONDITIONAL_ADDON',
          lineCode: 'LODGING_SELECTION',
          sourceType: 'RULE',
          description: '3일차 LV4',
          ruleId: 'rule-lv4-b',
          unitPriceKrw: 50_000,
          quantity: 1,
          amountKrw: 50_000,
        },
      ],
    }, { headcountTotal: 6, totalDays: 6 });

    const lodgingRow = autoPricing.adjustmentLines.find((line) => line.rowKey != null);
    expect(lodgingRow).toBeDefined();
    expect(lodgingRow?.leadAmountKrw).toBe(100_000);

    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 100_000,
        addonAmountKrw: 100_000,
        totalAmountKrw: 200_000,
        depositAmountKrw: 20_000,
        balanceAmountKrw: 180_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 100_000,
            quantity: 1,
            amountKrw: 100_000,
          },
          {
            ruleType: 'CONDITIONAL_ADDON',
            lineCode: 'LODGING_SELECTION',
            sourceType: 'RULE',
            description: '2일차 LV4',
            ruleId: 'rule-lv4-a',
            unitPriceKrw: 50_000,
            quantity: 1,
            amountKrw: 50_000,
          },
          {
            ruleType: 'CONDITIONAL_ADDON',
            lineCode: 'LODGING_SELECTION',
            sourceType: 'RULE',
            description: '3일차 LV4',
            ruleId: 'rule-lv4-b',
            unitPriceKrw: 50_000,
            quantity: 1,
            amountKrw: 50_000,
          },
        ],
      },
      {
        headcountTotal: 6,
        totalDays: 6,
      },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'manual-auto-row',
            type: 'AUTO',
            rowKey: lodgingRow!.rowKey,
            label: lodgingRow!.label,
            leadAmountKrw: 120_000,
            formula: lodgingRow!.formula,
          },
        ],
        summary: {
          totalAmountKrw: 220_000,
          depositAmountKrw: 30_000,
          balanceAmountKrw: 190_000,
          securityDepositAmountKrw: 0,
        },
      },
    );

    expect(effectivePricing.baseAmountKrw).toBe(100_000);
    expect(effectivePricing.addonAmountKrw).toBe(120_000);
    expect(effectivePricing.totalAmountKrw).toBe(220_000);
    expect(effectivePricing.depositAmountKrw).toBe(30_000);
    expect(effectivePricing.balanceAmountKrw).toBe(190_000);
    expect(
      effectivePricing.adjustmentLines.find((line) => line.rowKey === lodgingRow!.rowKey)?.leadAmountKrw,
    ).toBe(120_000);
  });

  it('builds team-specific effective totals and overrides', () => {
    const effectivePricing = buildEffectivePricing<PricingManualSourceLine>(
      {
        baseAmountKrw: 1_000_000,
        addonAmountKrw: 40_000,
        totalAmountKrw: 1_040_000,
        depositAmountKrw: 90_000,
        balanceAmountKrw: 950_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 1_000_000,
            quantity: 1,
            amountKrw: 1_000_000,
          },
        ],
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 2,
            baseAmountKrw: 1_000_000,
            addonAmountKrw: 50_000,
            totalAmountKrw: 1_050_000,
            depositAmountKrw: 100_000,
            balanceAmountKrw: 950_000,
            securityDepositAmountKrw: 0,
            securityDepositUnitPriceKrw: 0,
            securityDepositQuantity: 0,
            securityDepositMode: 'NONE',
            securityDepositEvent: null,
            lines: [
              {
                ruleType: 'BASE',
                lineCode: 'BASE',
                sourceType: 'RULE',
                description: '기본금',
                ruleId: 'rule-base',
                unitPriceKrw: 1_000_000,
                quantity: 1,
                amountKrw: 1_000_000,
                teamOrderIndex: 0,
                teamName: 'A팀',
                headcount: 2,
              },
              {
                ruleType: 'CONDITIONAL_ADDON',
                lineCode: 'PICKUP_DROP',
                sourceType: 'RULE',
                description: '픽드랍',
                ruleId: 'rule-pickup',
                unitPriceKrw: 100_000,
                quantity: 1,
                amountKrw: 50_000,
                displayBasis: 'TEAM_DIV_PERSON',
                displayUnitAmountKrw: 100_000,
                displayCount: 1,
                displayDivisorPerson: 2,
                teamOrderIndex: 0,
                teamName: 'A팀',
                headcount: 2,
              },
            ],
          },
          {
            teamOrderIndex: 1,
            teamName: 'B팀',
            headcount: 4,
            baseAmountKrw: 1_000_000,
            addonAmountKrw: 0,
            totalAmountKrw: 1_000_000,
            depositAmountKrw: 100_000,
            balanceAmountKrw: 900_000,
            securityDepositAmountKrw: 0,
            securityDepositUnitPriceKrw: 0,
            securityDepositQuantity: 0,
            securityDepositMode: 'NONE',
            securityDepositEvent: null,
            lines: [
              {
                ruleType: 'BASE',
                lineCode: 'BASE',
                sourceType: 'RULE',
                description: '기본금',
                ruleId: 'rule-base',
                unitPriceKrw: 1_000_000,
                quantity: 1,
                amountKrw: 1_000_000,
                teamOrderIndex: 1,
                teamName: 'B팀',
                headcount: 4,
              },
            ],
          },
        ],
      },
      { headcountTotal: 6, totalDays: 1 },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'a-team-pickup',
            type: 'AUTO',
            teamOrderIndex: 0,
            rowKey:
              'ADDON|PICKUP_DROP|CONDITIONAL_ADDON|rule-pickup|0|A팀||픽드랍|TEAM_DIV_PERSON||100000|100000|1|2|1|#1',
            label: '픽드랍',
            leadAmountKrw: 60_000,
            formula: '100,000원/2인',
          },
        ],
        teamSummaries: [
          {
            teamOrderIndex: 0,
            totalAmountKrw: 1_060_000,
            depositAmountKrw: 110_000,
          },
        ],
      },
    );

    expect(effectivePricing.teamPricings).toHaveLength(2);
    expect(effectivePricing.teamPricings[0]).toMatchObject({
      teamOrderIndex: 0,
      totalAmountKrw: 1_060_000,
      depositAmountKrw: 110_000,
    });
    expect(effectivePricing.teamPricings[1]).toMatchObject({
      teamOrderIndex: 1,
      totalAmountKrw: 1_000_000,
    });
    expect(effectivePricing.teamPricings[0]?.adjustmentLines[0]).toMatchObject({
      teamOrderIndex: 0,
      leadAmountKrw: 60_000,
    });
  });

  it('keeps strikethrough lines visible while excluding them from totals', () => {
    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 1_000_000,
        addonAmountKrw: 40_000,
        totalAmountKrw: 1_040_000,
        depositAmountKrw: 100_000,
        balanceAmountKrw: 940_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 1_000_000,
            quantity: 1,
            amountKrw: 1_000_000,
          },
        ],
      },
      { headcountTotal: 6, totalDays: 1 },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'manual-discount-line',
            type: 'MANUAL',
            label: '얼리 스타트',
            leadAmountKrw: 40_000,
            formula: '240,000원/6인',
            strikethrough: true,
          },
        ],
      },
    );

    expect(effectivePricing.totalAmountKrw).toBe(1_000_000);
    expect(effectivePricing.addonAmountKrw).toBe(0);
    expect(effectivePricing.adjustmentLines[0]).toMatchObject({
      label: '얼리 스타트',
      leadAmountKrw: 40_000,
      strikethrough: true,
    });
  });

  it('rounds auto base total to nearest ₩1,000 for totals', () => {
    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 813_750,
        addonAmountKrw: 30_000,
        totalAmountKrw: 843_750,
        depositAmountKrw: 0,
        balanceAmountKrw: 0,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 813_750,
            quantity: 1,
            amountKrw: 813_750,
          },
          {
            ruleType: 'CONDITIONAL_ADDON',
            lineCode: 'EARLY',
            sourceType: 'RULE',
            description: '얼리 스타트',
            ruleId: 'rule-early',
            unitPriceKrw: 30_000,
            quantity: 1,
            amountKrw: 30_000,
          },
        ],
      },
      { headcountTotal: 8, totalDays: 1 },
    );

    expect(effectivePricing.baseAmountKrw).toBe(814_000);
    expect(effectivePricing.addonAmountKrw).toBe(30_000);
    expect(effectivePricing.totalAmountKrw).toBe(844_000);
    expect(effectivePricing.depositAmountKrw).toBe(94_000);
    expect(effectivePricing.balanceAmountKrw).toBe(750_000);
  });

  it('applies manual securityDepositMode PER_TEAM for display (same total)', () => {
    const autoPricing = buildEffectivePricing(
      {
        baseAmountKrw: 500_000,
        addonAmountKrw: 0,
        totalAmountKrw: 500_000,
        depositAmountKrw: 50_000,
        balanceAmountKrw: 450_000,
        securityDepositAmountKrw: 180_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 30_000,
        securityDepositQuantity: 6,
        securityDepositMode: 'PER_PERSON',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 500_000,
            quantity: 1,
            amountKrw: 500_000,
          },
        ],
      },
      { headcountTotal: 6, totalDays: 2 },
    );

    expect(autoPricing.securityDepositMode).toBe('PER_PERSON');
    expect(autoPricing.securityDepositQuantity).toBe(6);
    expect(autoPricing.securityDepositUnitPriceKrw).toBe(30_000);

    const manualTeam = buildEffectivePricing(
      {
        baseAmountKrw: 500_000,
        addonAmountKrw: 0,
        totalAmountKrw: 500_000,
        depositAmountKrw: 50_000,
        balanceAmountKrw: 450_000,
        securityDepositAmountKrw: 180_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 30_000,
        securityDepositQuantity: 6,
        securityDepositMode: 'PER_PERSON',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 500_000,
            quantity: 1,
            amountKrw: 500_000,
          },
        ],
      },
      { headcountTotal: 6, totalDays: 2 },
      {
        enabled: true,
        adjustmentLines: [],
        summary: {
          securityDepositAmountKrw: 180_000,
          securityDepositMode: 'PER_TEAM',
        },
      },
    );

    expect(manualTeam.securityDepositMode).toBe('PER_TEAM');
    expect(manualTeam.securityDepositQuantity).toBe(1);
    expect(manualTeam.securityDepositUnitPriceKrw).toBe(180_000);
    expect(manualTeam.securityDepositAmountKrw).toBe(180_000);
  });

  it('keeps manual security deposit amount as display unit when mode is PER_PERSON', () => {
    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 500_000,
        addonAmountKrw: 0,
        totalAmountKrw: 500_000,
        depositAmountKrw: 50_000,
        balanceAmountKrw: 450_000,
        securityDepositAmountKrw: 180_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 180_000,
        securityDepositQuantity: 1,
        securityDepositMode: 'PER_TEAM',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 500_000,
            quantity: 1,
            amountKrw: 500_000,
          },
        ],
      },
      { headcountTotal: 5, totalDays: 2 },
      {
        enabled: true,
        adjustmentLines: [],
        summary: {
          securityDepositAmountKrw: 30_000,
          securityDepositMode: 'PER_PERSON',
        },
      },
    );

    expect(effectivePricing.securityDepositMode).toBe('PER_PERSON');
    expect(effectivePricing.securityDepositQuantity).toBe(5);
    expect(effectivePricing.securityDepositUnitPriceKrw).toBe(30_000);
    expect(effectivePricing.securityDepositAmountKrw).toBe(30_000);
  });

  it('applies manual securityDepositMode PER_PERSON for team slice without dividing manual amount', () => {
    const effectivePricing = buildEffectivePricing<PricingManualSourceLine>(
      {
        baseAmountKrw: 1_000_000,
        addonAmountKrw: 0,
        totalAmountKrw: 1_000_000,
        depositAmountKrw: 100_000,
        balanceAmountKrw: 900_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 1_000_000,
            quantity: 1,
            amountKrw: 1_000_000,
          },
        ],
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 4,
            baseAmountKrw: 1_000_000,
            addonAmountKrw: 0,
            totalAmountKrw: 1_000_000,
            depositAmountKrw: 100_000,
            balanceAmountKrw: 900_000,
            securityDepositAmountKrw: 50_000,
            securityDepositUnitPriceKrw: 50_000,
            securityDepositQuantity: 1,
            securityDepositMode: 'PER_TEAM',
            securityDepositEvent: null,
            lines: [
              {
                ruleType: 'BASE',
                lineCode: 'BASE',
                sourceType: 'RULE',
                description: '기본금',
                ruleId: 'rule-base',
                unitPriceKrw: 1_000_000,
                quantity: 1,
                amountKrw: 1_000_000,
                teamOrderIndex: 0,
                teamName: 'A팀',
                headcount: 4,
              },
            ],
          },
        ],
      },
      { headcountTotal: 4, totalDays: 1 },
      {
        enabled: true,
        adjustmentLines: [],
        teamSummaries: [
          {
            teamOrderIndex: 0,
            securityDepositAmountKrw: 50_000,
            securityDepositMode: 'PER_PERSON',
          },
        ],
      },
    );

    const team = effectivePricing.teamPricings[0];
    expect(team?.securityDepositMode).toBe('PER_PERSON');
    expect(team?.securityDepositQuantity).toBe(4);
    expect(team?.securityDepositUnitPriceKrw).toBe(50_000);
    expect(team?.securityDepositAmountKrw).toBe(50_000);
  });

  it('단일 팀일 때 글로벌 수동 summary 기본금을 팀 슬라이스에 폴백한다', () => {
    const commonLines: PricingManualSourceLine[] = [
      {
        ruleType: 'BASE',
        lineCode: 'BASE',
        sourceType: 'RULE',
        description: '기본금',
        ruleId: 'rule-base',
        unitPriceKrw: 813_750,
        quantity: 1,
        amountKrw: 813_750,
      },
      {
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'EARLY',
        sourceType: 'RULE',
        description: '얼리',
        ruleId: 'rule-early',
        unitPriceKrw: 30_000,
        quantity: 1,
        amountKrw: 30_000,
      },
      {
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'LODGING_SELECTION',
        sourceType: 'RULE',
        description: '숙소',
        ruleId: 'rule-lv',
        unitPriceKrw: 50_000,
        quantity: 2,
        amountKrw: 100_000,
      },
    ];

    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 814_000,
        addonAmountKrw: 130_000,
        totalAmountKrw: 944_000,
        depositAmountKrw: 74_000,
        balanceAmountKrw: 870_000,
        securityDepositAmountKrw: 300_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 300_000,
        securityDepositQuantity: 1,
        securityDepositMode: 'PER_TEAM',
        lines: commonLines,
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 8,
            baseAmountKrw: 814_000,
            addonAmountKrw: 130_000,
            totalAmountKrw: 944_000,
            depositAmountKrw: 74_000,
            balanceAmountKrw: 870_000,
            securityDepositAmountKrw: 300_000,
            securityDepositUnitPriceKrw: 300_000,
            securityDepositQuantity: 1,
            securityDepositMode: 'PER_TEAM',
            securityDepositEvent: null,
            lines: commonLines.map((line) => ({
              ...line,
              teamOrderIndex: 0,
              teamName: 'A팀',
              headcount: 8,
            })),
          },
        ],
      },
      { headcountTotal: 8, totalDays: 4 },
      {
        enabled: true,
        adjustmentLines: [],
        summary: {
          baseAmountKrw: 1_000_000,
          totalAmountKrw: 1_130_000,
          depositAmountKrw: 74_000,
          balanceAmountKrw: 1_056_000,
        },
        teamSummaries: [{ teamOrderIndex: 0 }],
      },
    );

    expect(effectivePricing.teamPricings).toHaveLength(1);
    expect(sliceEffectiveTotalsForUi(effectivePricing).baseAmountKrw).toBe(1_000_000);
    expect(sliceEffectiveTotalsForUi(effectivePricing).totalAmountKrw).toBe(1_130_000);
  });

  it('글로벌 summary에 남은 총액이 팀 재계산을 덮어쓰지 않아 수동 할인 줄이 총액에 반영된다', () => {
    const teamLines: PricingManualSourceLine[] = [
      {
        ruleType: 'BASE',
        lineCode: 'BASE',
        sourceType: 'RULE',
        description: '기본금',
        ruleId: 'rule-base',
        unitPriceKrw: 756_000,
        quantity: 1,
        amountKrw: 756_000,
        teamOrderIndex: 0,
        teamName: 'A팀',
        headcount: 5,
      },
      {
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'CONDITIONAL',
        sourceType: 'RULE',
        description: '추가',
        ruleId: 'rule-addon',
        unitPriceKrw: 6_000,
        quantity: 1,
        amountKrw: 6_000,
        teamOrderIndex: 0,
        teamName: 'A팀',
        headcount: 5,
      },
    ];

    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 756_000,
        addonAmountKrw: 6_000,
        totalAmountKrw: 762_000,
        depositAmountKrw: 72_000,
        balanceAmountKrw: 690_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: teamLines.map(({ teamOrderIndex: _ti, teamName: _tn, headcount: _h, ...line }) => line),
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 5,
            baseAmountKrw: 756_000,
            addonAmountKrw: 6_000,
            totalAmountKrw: 762_000,
            depositAmountKrw: 72_000,
            balanceAmountKrw: 690_000,
            securityDepositAmountKrw: 0,
            securityDepositUnitPriceKrw: 0,
            securityDepositQuantity: 0,
            securityDepositMode: 'NONE',
            securityDepositEvent: null,
            lines: teamLines,
          },
        ],
      },
      { headcountTotal: 5, totalDays: 3 },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'disc-1',
            type: 'MANUAL',
            label: '조건부',
            leadAmountKrw: -30_000,
            formula: '마지막 일정 할인',
          },
          {
            id: 'disc-2',
            type: 'MANUAL',
            label: '2일차 LV2',
            leadAmountKrw: -30_000,
            formula: '-30,000원*1박',
          },
        ],
        summary: {
          baseAmountKrw: 756_000,
          totalAmountKrw: 762_000,
          depositAmountKrw: 72_000,
          balanceAmountKrw: 690_000,
        },
        teamSummaries: [],
      },
    );

    expect(sliceEffectiveTotalsForUi(effectivePricing).totalAmountKrw).toBe(702_000);
  });

  it('단일 팀이면 고객 문서용 adjustmentLines는 글로벌이 아닌 팀 스코프 줄을 쓴다', () => {
    const teamLines: PricingManualSourceLine[] = [
      {
        ruleType: 'BASE',
        lineCode: 'BASE',
        sourceType: 'RULE',
        description: '기본금',
        ruleId: 'rule-base',
        unitPriceKrw: 500_000,
        quantity: 1,
        amountKrw: 500_000,
        teamOrderIndex: 0,
        teamName: 'A팀',
        headcount: 4,
      },
    ];

    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 500_000,
        addonAmountKrw: 0,
        totalAmountKrw: 500_000,
        depositAmountKrw: 50_000,
        balanceAmountKrw: 450_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: teamLines.map(({ teamOrderIndex: _t, teamName: _n, headcount: _h, ...rest }) => rest),
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 4,
            baseAmountKrw: 500_000,
            addonAmountKrw: 0,
            totalAmountKrw: 500_000,
            depositAmountKrw: 50_000,
            balanceAmountKrw: 450_000,
            securityDepositAmountKrw: 0,
            securityDepositUnitPriceKrw: 0,
            securityDepositQuantity: 0,
            securityDepositMode: 'NONE',
            securityDepositEvent: null,
            lines: teamLines,
          },
        ],
      },
      { headcountTotal: 4, totalDays: 2 },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'team-only-manual',
            type: 'MANUAL',
            teamOrderIndex: 0,
            label: '팀 전용 할인',
            leadAmountKrw: -25_000,
            formula: '테스트',
          },
        ],
      },
    );

    expect(effectivePricing.adjustmentLines.some((l) => l.label === '팀 전용 할인')).toBe(false);
    const docLines = resolveAdjustmentLinesForCustomerDocument(effectivePricing);
    expect(docLines.some((l) => l.label === '팀 전용 할인')).toBe(true);
    expect(docLines.find((l) => l.label === '팀 전용 할인')?.leadAmountKrw).toBe(-25_000);
  });

  it('여러 팀의 최종 요약이 같으면 UI 합계는 글로벌 재계산 대신 대표 팀 요약을 쓴다', () => {
    const commonLine: PricingManualSourceLine = {
      ruleType: 'BASE',
      lineCode: 'BASE',
      sourceType: 'RULE',
      description: '기본금',
      ruleId: 'rule-base',
      unitPriceKrw: 1_019_000,
      quantity: 1,
      amountKrw: 1_019_000,
    };

    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 1_019_000,
        addonAmountKrw: 80_000,
        totalAmountKrw: 1_099_000,
        depositAmountKrw: 119_000,
        balanceAmountKrw: 980_000,
        securityDepositAmountKrw: 300_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 300_000,
        securityDepositQuantity: 1,
        securityDepositMode: 'PER_TEAM',
        lines: [commonLine],
        teamPricings: [0, 1].map((teamOrderIndex) => ({
          teamOrderIndex,
          teamName: teamOrderIndex === 0 ? 'A팀' : 'B팀',
          headcount: teamOrderIndex === 0 ? 5 : 3,
          baseAmountKrw: 1_019_000,
          addonAmountKrw: 80_000,
          totalAmountKrw: 1_099_000,
          depositAmountKrw: 119_000,
          balanceAmountKrw: 980_000,
          securityDepositAmountKrw: 300_000,
          securityDepositUnitPriceKrw: 300_000,
          securityDepositQuantity: 1,
          securityDepositMode: 'PER_TEAM' as const,
          securityDepositEvent: null,
          lines: [
            {
              ...commonLine,
              teamOrderIndex,
              teamName: teamOrderIndex === 0 ? 'A팀' : 'B팀',
              headcount: teamOrderIndex === 0 ? 5 : 3,
            },
          ],
        })),
      },
      { headcountTotal: 8, totalDays: 6 },
      {
        enabled: true,
        adjustmentLines: [],
        summary: {
          baseAmountKrw: 1_019_000,
          totalAmountKrw: 1_099_000,
        },
        teamSummaries: [
          {
            teamOrderIndex: 0,
            totalAmountKrw: 1_099_000,
            depositAmountKrw: 99_000,
            balanceAmountKrw: 1_000_000,
            securityDepositAmountKrw: 300_000,
            securityDepositMode: 'PER_TEAM',
          },
          {
            teamOrderIndex: 1,
            totalAmountKrw: 1_099_000,
            depositAmountKrw: 99_000,
            balanceAmountKrw: 1_000_000,
            securityDepositAmountKrw: 300_000,
            securityDepositMode: 'PER_TEAM',
          },
        ],
      },
    );

    const totals = sliceEffectiveTotalsForUi(effectivePricing);
    expect(totals.totalAmountKrw).toBe(1_099_000);
    expect(totals.depositAmountKrw).toBe(99_000);
    expect(totals.balanceAmountKrw).toBe(1_000_000);
    expect(totals.securityDepositAmountKrw).toBe(300_000);
  });
});
