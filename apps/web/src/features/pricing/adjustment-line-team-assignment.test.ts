import { describe, expect, it } from 'vitest';
import type { PricingManualSourceLine } from '@tour/domain';
import {
  assignDisplayedAdjustmentLineTeam,
  type ManualPricingAdjustmentState,
} from './adjustment-line-team-assignment';
import { buildDisplayedPricingAdjustmentLines, buildEffectivePricing } from './manual-pricing';

describe('assignDisplayedAdjustmentLineTeam', () => {
  const pickupDropLine = (
    ruleId: string,
    teamOrderIndex: number,
    teamName: string,
    headcount: number,
  ): PricingManualSourceLine => ({
    ruleType: 'CONDITIONAL_ADDON',
    lineCode: 'PICKUP_DROP',
    sourceType: 'RULE',
    description: '실투어 외 픽드랍 (기본울바)',
    ruleId,
    unitPriceKrw: 100_000,
    quantity: 1,
    amountKrw: 16_700,
    displayBasis: 'TEAM_DIV_PERSON',
    displayLabel: '실투어 외 픽드랍 (기본울바)',
    displayUnitAmountKrw: 100_000,
    displayCount: 1,
    displayDivisorPerson: headcount,
    teamOrderIndex,
    teamName,
    headcount,
  });

  const pricingPreview = {
    baseAmountKrw: 1_200_000,
    addonAmountKrw: 200_000,
    totalAmountKrw: 1_400_000,
    depositAmountKrw: 140_000,
    balanceAmountKrw: 1_260_000,
    securityDepositAmountKrw: 0,
    securityDepositUnitPriceKrw: 0,
    securityDepositQuantity: 0,
    securityDepositMode: 'NONE' as const,
    securityDepositEvent: null,
    lines: [],
    teamPricings: [
      {
        teamOrderIndex: 0,
        teamName: 'A팀',
        headcount: 3,
        baseAmountKrw: 600_000,
        addonAmountKrw: 100_000,
        totalAmountKrw: 700_000,
        depositAmountKrw: 70_000,
        balanceAmountKrw: 630_000,
        securityDepositAmountKrw: 0,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE' as const,
        securityDepositEvent: null,
        lines: [
          pickupDropLine('rule-pickup-a', 0, 'A팀', 3),
          pickupDropLine('rule-drop-a', 0, 'A팀', 3),
        ],
      },
      {
        teamOrderIndex: 1,
        teamName: 'B팀',
        headcount: 3,
        baseAmountKrw: 600_000,
        addonAmountKrw: 100_000,
        totalAmountKrw: 700_000,
        depositAmountKrw: 70_000,
        balanceAmountKrw: 630_000,
        securityDepositAmountKrw: 0,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE' as const,
        securityDepositEvent: null,
        lines: [
          pickupDropLine('rule-pickup-b', 1, 'B팀', 3),
          pickupDropLine('rule-drop-b', 1, 'B팀', 3),
        ],
      },
    ],
  };

  const context = { pricingPreview, totalDays: 5 };

  function buildDisplayed(manualPricing: ManualPricingAdjustmentState & { enabled: boolean }) {
    const effective = buildEffectivePricing(
      pricingPreview,
      { headcountTotal: 6, totalDays: 5 },
      { enabled: manualPricing.enabled, adjustmentLines: manualPricing.adjustmentLines },
    );
    return buildDisplayedPricingAdjustmentLines(effective);
  }

  it('keeps a single shared row after B -> 전체 when both teams have auto lines', () => {
    let manualPricing: ManualPricingAdjustmentState & { enabled: boolean } = { enabled: true, adjustmentLines: [] };
    let displayed = buildDisplayed(manualPricing);
    const bTeamLine = displayed.find((line) => line.label === '실투어 외 픽드랍 (기본울바)' && line.teamOrderIndexes.includes(1));
    expect(bTeamLine).toBeDefined();

    manualPricing = {
      enabled: true,
      ...assignDisplayedAdjustmentLineTeam(manualPricing, bTeamLine!, null, context),
    };
    displayed = buildDisplayed(manualPricing);
    const pickupRows = displayed.filter((line) => line.label === '실투어 외 픽드랍 (기본울바)');
    expect(pickupRows).toHaveLength(1);
    expect(pickupRows[0]?.isSharedAcrossTeams).toBe(true);
    expect(manualPricing.adjustmentLines.filter((row) => row.type === 'MANUAL')).toHaveLength(0);
  });

  it('keeps a single A-team row after B -> 전체 -> A', () => {
    let manualPricing: ManualPricingAdjustmentState & { enabled: boolean } = { enabled: true, adjustmentLines: [] };
    let displayed = buildDisplayed(manualPricing);
    const bTeamLine = displayed.find((line) => line.label === '실투어 외 픽드랍 (기본울바)' && line.teamOrderIndexes.includes(1));
    expect(bTeamLine).toBeDefined();

    manualPricing = {
      enabled: true,
      ...assignDisplayedAdjustmentLineTeam(manualPricing, bTeamLine!, null, context),
    };
    displayed = buildDisplayed(manualPricing);
    const sharedLine = displayed.find((line) => line.label === '실투어 외 픽드랍 (기본울바)');
    expect(sharedLine?.isSharedAcrossTeams).toBe(true);

    manualPricing = {
      enabled: true,
      ...assignDisplayedAdjustmentLineTeam(manualPricing, sharedLine!, 0, context),
    };
    displayed = buildDisplayed(manualPricing);
    const pickupRows = displayed.filter((line) => line.label === '실투어 외 픽드랍 (기본울바)');
    expect(pickupRows).toHaveLength(1);
    expect(pickupRows[0]?.teamOrderIndexes).toEqual([0]);
    expect(pickupRows[0]?.type).toBe('MANUAL');
    expect(manualPricing.adjustmentLines.filter((row) => row.type === 'MANUAL')).toHaveLength(1);
  });
});
