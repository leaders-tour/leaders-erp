import { describe, expect, it } from 'vitest';
import {
  shouldShowTeamPrefixForBaseAmount,
  teamBaseAmountSignature,
  teamPricingsForBaseAmountDisplay,
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
