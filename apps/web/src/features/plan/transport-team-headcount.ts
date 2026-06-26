export const TEAM_HEADCOUNT_MODAL_MIN_TEAMS = 3;

export interface TransportTeamHeadcountRow {
  teamName: string;
  headcount: number;
}

export function usesTransportTeamHeadcountModal(teamCount: number): boolean {
  return teamCount >= TEAM_HEADCOUNT_MODAL_MIN_TEAMS;
}

export function sumTeamHeadcounts(counts: number[]): number {
  return counts.reduce((sum, count) => sum + count, 0);
}

/** 팀당 최소 1명을 유지하면서 total을 teamCount팀에 나눕니다. 합은 항상 total과 같습니다. total < teamCount이면 null. */
export function distributeHeadcountTotalAcrossTeams(
  total: number,
  teamCount: number,
): number[] | null {
  if (teamCount < 1) {
    return [];
  }
  if (total < teamCount) {
    return null;
  }
  const afterMin = total - teamCount;
  const base = Math.floor(afterMin / teamCount);
  const rem = afterMin % teamCount;
  return Array.from({ length: teamCount }, (_, i) => 1 + base + (i < rem ? 1 : 0));
}

/** 팀 삭제 후 남은 팀에 전체 인원을 다시 균등 분배합니다. */
export function redistributeTeamHeadcountsAfterRemoval(
  currentCounts: number[],
  removedIndex: number,
  headcountTotal: number,
): number[] {
  const filtered = currentCounts.filter((_, index) => index !== removedIndex);
  if (filtered.length === 0) {
    return filtered;
  }
  const counts = distributeHeadcountTotalAcrossTeams(headcountTotal, filtered.length);
  if (!counts) {
    return filtered.map((_, index) => (index === 0 ? headcountTotal : 1));
  }
  return counts;
}

export function validateTeamHeadcountDraft(
  counts: number[],
  headcountTotal: number,
): string | null {
  if (counts.length === 0) {
    return '팀 정보가 없습니다.';
  }

  if (counts.some((count) => !Number.isInteger(count) || count < 1)) {
    return '각 팀은 최소 1명 이상이어야 합니다.';
  }

  const sum = sumTeamHeadcounts(counts);
  if (sum !== headcountTotal) {
    return `팀별 인원 합계(${sum}명)가 전체 인원(${headcountTotal}명)과 일치해야 합니다.`;
  }

  return null;
}

export function applyTeamHeadcountsToGroups<T extends { headcount: number }>(
  groups: T[],
  counts: number[],
): T[] {
  return groups.map((group, index) => ({
    ...group,
    headcount: counts[index] ?? group.headcount,
  }));
}
