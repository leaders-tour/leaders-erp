import { describe, expect, it } from 'vitest';
import {
  customerHasMinTeams,
  customerHasMultipleTeams,
  getCustomerMaxTeamCount,
  getPlanTeamCount,
  parseCustomerMinTeamsFilter,
} from './customerTeamFilter';
import type { UserRow } from './hooks';

function buildUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    ownerEmployeeId: 'emp-1',
    ownerEmployee: {
      id: 'emp-1',
      name: '김담당',
      email: 'owner@example.com',
      role: 'STAFF',
      isActive: true,
    },
    dealStage: 'CONTRACT_CONFIRMED',
    dealStageOrder: 0,
    attachments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('customerTeamFilter', () => {
  it('counts teams from pricing rows when snapshot is absent', () => {
    const plan = {
      id: 'plan-1',
      currentVersion: {
        meta: null,
        pricing: {
          id: 'pricing-1',
          totalAmountKrw: 0,
          depositAmountKrw: 0,
          balanceAmountKrw: 0,
          securityDepositAmountKrw: 0,
          securityDepositUnitPriceKrw: 0,
          securityDepositMode: 'NONE' as const,
          teamPricings: [
            { teamOrderIndex: 0, teamName: 'A팀', headcount: 10, totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitPriceKrw: 0, securityDepositMode: 'NONE' as const },
            { teamOrderIndex: 1, teamName: 'B팀', headcount: 8, totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitPriceKrw: 0, securityDepositMode: 'NONE' as const },
          ],
        },
      },
    };

    expect(getPlanTeamCount(plan)).toBe(2);
    expect(getCustomerMaxTeamCount(buildUser({ plans: [plan] }))).toBe(2);
    expect(customerHasMultipleTeams(buildUser({ plans: [plan] }))).toBe(true);
  });

  it('prefers snapshot team count over pricing rows', () => {
    const plan = {
      id: 'plan-1',
      currentVersion: {
        meta: null,
        pricing: {
          id: 'pricing-1',
          totalAmountKrw: 0,
          depositAmountKrw: 0,
          balanceAmountKrw: 0,
          securityDepositAmountKrw: 0,
          securityDepositUnitPriceKrw: 0,
          securityDepositMode: 'NONE' as const,
          manualPricing: {
            customerPricingSnapshot: {
              totalAmountKrw: 0,
              depositAmountKrw: 0,
              balanceAmountKrw: 0,
              securityDepositTotalKrw: 0,
              securityDepositUnitKrw: 0,
              securityDepositMode: 'NONE' as const,
              teamPricings: [
                { teamOrderIndex: 0, teamName: 'A팀', totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitKrw: 0, securityDepositScope: 'NONE' },
                { teamOrderIndex: 1, teamName: 'B팀', totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitKrw: 0, securityDepositScope: 'NONE' },
                { teamOrderIndex: 2, teamName: 'C팀', totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitKrw: 0, securityDepositScope: 'NONE' },
              ],
            },
          },
          teamPricings: [
            { teamOrderIndex: 0, teamName: 'A팀', headcount: 10, totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitPriceKrw: 0, securityDepositMode: 'NONE' as const },
          ],
        },
      },
    };

    expect(getPlanTeamCount(plan)).toBe(3);
    expect(customerHasMultipleTeams(buildUser({ plans: [plan] }))).toBe(true);
  });

  it('uses max team count across plans', () => {
    const singleTeamPlan = {
      id: 'plan-1',
      currentVersion: {
        meta: null,
        pricing: {
          id: 'pricing-1',
          totalAmountKrw: 0,
          depositAmountKrw: 0,
          balanceAmountKrw: 0,
          securityDepositAmountKrw: 0,
          securityDepositUnitPriceKrw: 0,
          securityDepositMode: 'NONE' as const,
          teamPricings: [
            { teamOrderIndex: 0, teamName: 'A팀', headcount: 10, totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitPriceKrw: 0, securityDepositMode: 'NONE' as const },
          ],
        },
      },
    };
    const multiTeamPlan = {
      id: 'plan-2',
      currentVersion: {
        meta: null,
        pricing: {
          id: 'pricing-2',
          totalAmountKrw: 0,
          depositAmountKrw: 0,
          balanceAmountKrw: 0,
          securityDepositAmountKrw: 0,
          securityDepositUnitPriceKrw: 0,
          securityDepositMode: 'NONE' as const,
          teamPricings: [
            { teamOrderIndex: 0, teamName: 'A팀', headcount: 10, totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitPriceKrw: 0, securityDepositMode: 'NONE' as const },
            { teamOrderIndex: 1, teamName: 'B팀', headcount: 8, totalAmountKrw: 0, depositAmountKrw: 0, balanceAmountKrw: 0, securityDepositAmountKrw: 0, securityDepositUnitPriceKrw: 0, securityDepositMode: 'NONE' as const },
          ],
        },
      },
    };

    expect(getCustomerMaxTeamCount(buildUser({ plans: [singleTeamPlan, multiTeamPlan] }))).toBe(2);
    expect(customerHasMultipleTeams(buildUser({ plans: [singleTeamPlan] }))).toBe(false);
    expect(customerHasMinTeams(buildUser({ plans: [multiTeamPlan] }), 3)).toBe(false);
  });

  it('parses minTeams query param and legacy multiTeam flag', () => {
    expect(parseCustomerMinTeamsFilter('2', false)).toBe(2);
    expect(parseCustomerMinTeamsFilter('3', false)).toBe(3);
    expect(parseCustomerMinTeamsFilter(null, true)).toBe(2);
    expect(parseCustomerMinTeamsFilter(null, false)).toBeNull();
  });
});
