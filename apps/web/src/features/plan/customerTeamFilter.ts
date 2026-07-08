import type { UserRow } from './hooks';

type UserPlanRow = NonNullable<UserRow['plans']>[number];

export function getPlanTeamCount(plan: UserPlanRow): number {
  const pricing = plan.currentVersion?.pricing;
  if (!pricing) {
    return 0;
  }

  const snapshotTeamCount = pricing.manualPricing?.customerPricingSnapshot?.teamPricings?.length ?? 0;
  if (snapshotTeamCount > 0) {
    return snapshotTeamCount;
  }

  return pricing.teamPricings?.length ?? 0;
}

export function getCustomerMaxTeamCount(user: UserRow): number {
  const teamCounts = (user.plans ?? []).map(getPlanTeamCount);
  if (teamCounts.length === 0) {
    return 0;
  }
  return Math.max(...teamCounts);
}

export function customerHasMinTeams(user: UserRow, minTeams: number): boolean {
  return getCustomerMaxTeamCount(user) >= minTeams;
}

export function customerHasMultipleTeams(user: UserRow, minTeams = 2): boolean {
  return customerHasMinTeams(user, minTeams);
}

export function countCustomersWithMinTeams(users: UserRow[], minTeams: number): number {
  return users.filter((user) => customerHasMinTeams(user, minTeams)).length;
}

export function countCustomersWithMultipleTeams(users: UserRow[], minTeams = 2): number {
  return countCustomersWithMinTeams(users, minTeams);
}

export type CustomerMinTeamsFilter = 2 | 3;

export function parseCustomerMinTeamsFilter(raw: string | null, legacyMultiTeam: boolean): CustomerMinTeamsFilter | null {
  if (raw === '2' || raw === '3') {
    return Number(raw) as CustomerMinTeamsFilter;
  }
  if (legacyMultiTeam) {
    return 2;
  }
  return null;
}
