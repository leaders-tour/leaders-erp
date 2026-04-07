export interface MultiDayBlockRegionSummaryLocation {
  regionId: string;
  regionName?: string | null;
}

export interface MultiDayBlockRegionSummaryDay {
  dayOrder: number;
  displayLocationId?: string | null;
  displayLocation?: MultiDayBlockRegionSummaryLocation | null;
}

export function getMultiDayBlockRegionEntries<TLocation extends MultiDayBlockRegionSummaryLocation>(
  days: MultiDayBlockRegionSummaryDay[],
  locationById?: Map<string, TLocation>,
): Array<{ id: string; name: string }> {
  const entries = new Map<string, string>();

  days
    .slice()
    .sort((left, right) => left.dayOrder - right.dayOrder)
    .forEach((day) => {
      const displayLocation = day.displayLocation ?? (day.displayLocationId ? locationById?.get(day.displayLocationId) : undefined);
      if (!displayLocation?.regionId) {
        return;
      }

      entries.set(displayLocation.regionId, displayLocation.regionName?.trim() || displayLocation.regionId);
    });

  return Array.from(entries.entries()).map(([id, name]) => ({ id, name }));
}

export function formatMultiDayBlockRegionSummary(
  entries: Array<{ id: string; name: string }>,
): string {
  return entries.map((entry) => entry.name).join(', ');
}
