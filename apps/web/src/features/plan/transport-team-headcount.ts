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
