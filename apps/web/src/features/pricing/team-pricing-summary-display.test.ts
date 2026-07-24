import { describe, expect, it } from 'vitest';
import {
  shouldShowTeamPrefixForBaseAmount,
  shouldShowTeamPrefixForSecurityDeposit,
  teamBaseAmountSignature,
  teamPricingsForBaseAmountDisplay,
  teamPricingsForSecurityDepositDisplay,
  teamSecurityDepositSignature,
} from './team-pricing-summary-display';

describe('team-pricing-summary-display base amount helpers', () => {
  it('teamBaseAmountSignature는 기본금만 비교한다', () => {
    expect(teamBaseAmountSignature({ baseAmountKrw: 900_000 })).toBe('900000');
  });

  it('shouldShowTeamPrefixForBaseAmount는 기본금이 다를 때 true', () => {
    expect(
      shouldShowTeamPrefixForBaseAmount([
        { baseAmountKrw: 900_000 },
        { baseAmountKrw: 1_100_000 },
      ]),
    ).toBe(true);
    expect(
      shouldShowTeamPrefixForBaseAmount([
        { baseAmountKrw: 1_000_000 },
        { baseAmountKrw: 1_000_000 },
      ]),
    ).toBe(false);
  });

  it('teamPricingsForBaseAmountDisplay는 기본금이 같으면 대표 팀 1개만 반환한다', () => {
    const teams = [
      { baseAmountKrw: 1_000_000, teamOrderIndex: 0 },
      { baseAmountKrw: 1_000_000, teamOrderIndex: 1 },
    ];
    expect(teamPricingsForBaseAmountDisplay(teams)).toHaveLength(1);
  });
});

describe('team-pricing-summary-display security deposit helpers', () => {
  const sharedDeposit = {
    securityDepositMode: 'PER_TEAM',
    securityDepositAmountKrw: 300_000,
    securityDepositUnitPriceKrw: 300_000,
  };

  it('보증금 단위와 표시 단가만 비교한다', () => {
    expect(teamSecurityDepositSignature(sharedDeposit)).toBe('PER_TEAM|300000');
  });

  it('다른 요약 금액과 무관하게 보증금 표시가 같으면 대표 팀 한 개만 반환한다', () => {
    const teams = [
      { ...sharedDeposit, teamOrderIndex: 0, totalAmountKrw: 1_000_000 },
      { ...sharedDeposit, teamOrderIndex: 1, totalAmountKrw: 1_200_000 },
    ];

    expect(shouldShowTeamPrefixForSecurityDeposit(teams)).toBe(false);
    expect(teamPricingsForSecurityDepositDisplay(teams)).toEqual([teams[0]]);
  });

  it('보증금 단가가 다르면 팀별 행을 유지한다', () => {
    const teams = [
      { ...sharedDeposit, teamOrderIndex: 0 },
      {
        ...sharedDeposit,
        teamOrderIndex: 1,
        securityDepositAmountKrw: 500_000,
        securityDepositUnitPriceKrw: 500_000,
      },
    ];

    expect(shouldShowTeamPrefixForSecurityDeposit(teams)).toBe(true);
    expect(teamPricingsForSecurityDepositDisplay(teams)).toEqual(teams);
  });
});
