const PATH_PAD_MS = 90 * 60 * 1000;

export interface VisitLinkNeighborSource {
  id: string;
  projectId: string;
  startedAt: string;
}

export interface DatedLocationPoint {
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export function findVisitNeighbors<T extends VisitLinkNeighborSource>(
  rows: readonly T[],
  selected: VisitLinkNeighborSource | null,
): { prev: T | null; next: T | null } {
  if (!selected) return { prev: null, next: null };
  const sameProject = rows
    .filter((row) => row.projectId === selected.projectId)
    .slice()
    .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime());
  const index = sameProject.findIndex((row) => row.id === selected.id);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: sameProject[index - 1] ?? null,
    next: sameProject[index + 1] ?? null,
  };
}

export function visitPathWindowMs(input: {
  selectedStartedAt: string;
  selectedEndedAt: string;
  prevStartedAt?: string | null;
  nextEndedAt?: string | null;
}): { fromMs: number; toMs: number } {
  const fromMs = input.prevStartedAt
    ? new Date(input.prevStartedAt).getTime()
    : new Date(input.selectedStartedAt).getTime() - PATH_PAD_MS;
  const toMs = input.nextEndedAt
    ? new Date(input.nextEndedAt).getTime()
    : new Date(input.selectedEndedAt).getTime() + PATH_PAD_MS;
  return { fromMs, toMs };
}

export function sliceLocationPath<T extends DatedLocationPoint>(
  path: readonly T[],
  fromMs: number,
  toMs: number,
): T[] {
  return path.filter((point) => {
    const at = new Date(point.recordedAt).getTime();
    return at >= fromMs && at <= toMs;
  });
}
