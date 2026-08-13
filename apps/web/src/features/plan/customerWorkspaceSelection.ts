/**
 * Customer workspace auto-selection helpers.
 * Plans from API are already ordered by createdAt desc; versions by versionNumber.
 */

export function resolveSelectedPlanId(
  planIds: readonly string[],
  currentSelectedId: string | null | undefined,
): string | null {
  if (planIds.length === 0) {
    return null;
  }
  if (currentSelectedId && planIds.includes(currentSelectedId)) {
    return currentSelectedId;
  }
  return planIds[0] ?? null;
}

export function resolveSelectedVersionId(
  versions: readonly { id: string; versionNumber: number }[],
  currentSelectedId: string | null | undefined,
): string | null {
  if (versions.length === 0) {
    return null;
  }
  if (currentSelectedId && versions.some((version) => version.id === currentSelectedId)) {
    return currentSelectedId;
  }
  const latest = versions.reduce((best, version) =>
    version.versionNumber > best.versionNumber ? version : best,
  );
  return latest.id;
}

/**
 * Pick a version id from plan list payload so estimate can start
 * without waiting for a separate planVersions round-trip.
 */
export function resolveVersionIdFromPlanSummary(
  plan:
    | {
        currentVersionId?: string | null;
        currentVersion?: { id: string; versionNumber: number } | null;
        versions?: Array<{ id: string; versionNumber: number }> | null;
      }
    | null
    | undefined,
  currentSelectedId?: string | null,
): string | null {
  if (!plan) {
    return null;
  }
  if (plan.versions && plan.versions.length > 0) {
    return resolveSelectedVersionId(plan.versions, currentSelectedId);
  }
  if (currentSelectedId && plan.currentVersionId === currentSelectedId) {
    return currentSelectedId;
  }
  if (currentSelectedId && plan.currentVersion?.id === currentSelectedId) {
    return currentSelectedId;
  }
  return plan.currentVersionId ?? plan.currentVersion?.id ?? null;
}

export function pickLatestPlanId(planIds: readonly string[]): string | null {
  return planIds[0] ?? null;
}

export function pickLatestVersionId(
  versions: readonly { id: string; versionNumber: number }[],
): string | null {
  return resolveSelectedVersionId(versions, null);
}
