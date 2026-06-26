import { describe, expect, it } from 'vitest';
import {
  applyTeamHeadcountsToGroups,
  distributeHeadcountTotalAcrossTeams,
  redistributeTeamHeadcountsAfterRemoval,
  usesTransportTeamHeadcountModal,
  validateTeamHeadcountDraft,
} from './transport-team-headcount';

describe('usesTransportTeamHeadcountModal', () => {
  it('requires modal from 3 teams', () => {
    expect(usesTransportTeamHeadcountModal(2)).toBe(false);
    expect(usesTransportTeamHeadcountModal(3)).toBe(true);
  });
});

describe('validateTeamHeadcountDraft', () => {
  it('accepts counts that sum to total with minimum 1 per team', () => {
    expect(validateTeamHeadcountDraft([3, 3, 2], 8)).toBeNull();
  });

  it('rejects invalid totals', () => {
    expect(validateTeamHeadcountDraft([3, 3, 3], 8)).toMatch(/일치해야 합니다/);
  });

  it('rejects counts below 1', () => {
    expect(validateTeamHeadcountDraft([0, 4, 4], 8)).toMatch(/최소 1명/);
  });
});

describe('distributeHeadcountTotalAcrossTeams', () => {
  it('distributes evenly when divisible', () => {
    expect(distributeHeadcountTotalAcrossTeams(6, 2)).toEqual([3, 3]);
  });

  it('assigns all headcount to a single team', () => {
    expect(distributeHeadcountTotalAcrossTeams(6, 1)).toEqual([6]);
  });

  it('returns null when total is smaller than team count', () => {
    expect(distributeHeadcountTotalAcrossTeams(2, 3)).toBeNull();
  });
});

describe('redistributeTeamHeadcountsAfterRemoval', () => {
  it('reassigns full headcount when only one team remains', () => {
    expect(redistributeTeamHeadcountsAfterRemoval([3, 3], 1, 6)).toEqual([6]);
    expect(redistributeTeamHeadcountsAfterRemoval([3, 3], 0, 6)).toEqual([6]);
  });

  it('redistributes across remaining teams', () => {
    expect(redistributeTeamHeadcountsAfterRemoval([3, 3, 2], 1, 8)).toEqual([4, 4]);
  });
});

describe('applyTeamHeadcountsToGroups', () => {
  it('updates each team headcount in order', () => {
    const result = applyTeamHeadcountsToGroups(
      [
        { teamName: 'A팀', headcount: 2 },
        { teamName: 'B팀', headcount: 2 },
        { teamName: 'C팀', headcount: 2 },
      ],
      [4, 3, 1],
    );

    expect(result).toEqual([
      { teamName: 'A팀', headcount: 4 },
      { teamName: 'B팀', headcount: 3 },
      { teamName: 'C팀', headcount: 1 },
    ]);
  });
});
