import { buildMainPlanRowPhysicalIndexes, isMainPlanStopRow } from './plan-stop-row';

export interface PlanRowSourceFields {
  rowType?: 'MAIN' | 'EXTERNAL_TRANSFER' | null;
  segmentId?: string | null;
  segmentVersionId?: string | null;
  overnightStayId?: string | null;
  overnightStayDayOrder?: number | null;
  multiDayBlockId?: string | null;
  multiDayBlockDayOrder?: number | null;
  multiDayBlockConnectionId?: string | null;
  multiDayBlockConnectionVersionId?: string | null;
  locationId?: string | null;
  locationVersionId?: string | null;
  movementIntensity?: string | null;
}

export interface PlanRowMergeFields extends PlanRowSourceFields {
  dateCellText?: string;
  destinationCellText?: string;
  timeCellText?: string;
  scheduleCellText?: string;
  mealCellText?: string;
  lodgingSelectionLevel?: string | null;
  customLodgingId?: string | null;
  customLodgingNameSnapshot?: string | null;
  lodgingCellText?: string;
  movementIntensityColorOverride?: string | null;
}

export const PRESERVED_PLAN_ROW_FIELDS = [
  'dateCellText',
  'destinationCellText',
  'timeCellText',
  'scheduleCellText',
  'mealCellText',
  'lodgingSelectionLevel',
  'customLodgingId',
  'customLodgingNameSnapshot',
  'lodgingCellText',
  'movementIntensityColorOverride',
] as const satisfies ReadonlyArray<keyof PlanRowMergeFields>;

export type PreservedPlanRowField = (typeof PRESERVED_PLAN_ROW_FIELDS)[number];

/** Auto-fill never owns lodging upgrades — keep current values whenever the route source is unchanged. */
export const ALWAYS_PRESERVED_PLAN_ROW_FIELDS = [
  'lodgingSelectionLevel',
  'customLodgingId',
  'customLodgingNameSnapshot',
  'lodgingCellText',
] as const satisfies ReadonlyArray<PreservedPlanRowField>;

const ALWAYS_PRESERVED_PLAN_ROW_FIELD_SET = new Set<string>(ALWAYS_PRESERVED_PLAN_ROW_FIELDS);

export function getPlanRowSourceKey(row: PlanRowSourceFields): string {
  return JSON.stringify({
    segmentId: row.segmentId ?? null,
    segmentVersionId: row.segmentVersionId ?? null,
    overnightStayId: row.overnightStayId ?? null,
    overnightStayDayOrder: row.overnightStayDayOrder ?? null,
    multiDayBlockId: row.multiDayBlockId ?? null,
    multiDayBlockDayOrder: row.multiDayBlockDayOrder ?? null,
    multiDayBlockConnectionId: row.multiDayBlockConnectionId ?? null,
    multiDayBlockConnectionVersionId: row.multiDayBlockConnectionVersionId ?? null,
    rowType: row.rowType ?? 'MAIN',
    locationId: row.locationId ?? null,
    locationVersionId: row.locationVersionId ?? null,
    movementIntensity: row.movementIntensity ?? null,
  });
}

export function getDirtyPlanRowFieldKey(sourceKey: string, field: PreservedPlanRowField | string): string {
  return `${sourceKey}::${field}`;
}

export function parseDirtyPlanRowFieldKey(key: string): { sourceKey: string; field: string } | null {
  const separatorIndex = key.lastIndexOf('::');
  if (separatorIndex <= 0) {
    return null;
  }

  return {
    sourceKey: key.slice(0, separatorIndex),
    field: key.slice(separatorIndex + 2),
  };
}

export function isSamePlanRowSource(
  left: PlanRowSourceFields | undefined,
  right: PlanRowSourceFields | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }

  return getPlanRowSourceKey(left) === getPlanRowSourceKey(right);
}

export function mergeAutoRowsWithDirtyValues<T extends PlanRowMergeFields>(
  current: T[],
  autoRows: T[],
  dirtyFieldKeys: Set<string>,
): T[] {
  const mainPhysicalIndexes = buildMainPlanRowPhysicalIndexes(current);
  const currentMainRowBySource = new Map<string, T>();
  mainPhysicalIndexes.forEach((physicalIndex) => {
    const row = current[physicalIndex];
    if (row && isMainPlanStopRow(row)) {
      currentMainRowBySource.set(getPlanRowSourceKey(row), row);
    }
  });

  const mergedMainRows = autoRows.map((autoRow, mainIndex) => {
    const physicalIndex = mainPhysicalIndexes[mainIndex];
    const positionalCurrentRow = physicalIndex !== undefined ? current[physicalIndex] : undefined;
    const currentRow =
      currentMainRowBySource.get(getPlanRowSourceKey(autoRow)) ?? positionalCurrentRow;

    if (!currentRow || !isSamePlanRowSource(currentRow, autoRow)) {
      return autoRow;
    }

    const mergedRow = { ...autoRow };
    const sourceKey = getPlanRowSourceKey(currentRow);
    for (const field of PRESERVED_PLAN_ROW_FIELDS) {
      if (
        ALWAYS_PRESERVED_PLAN_ROW_FIELD_SET.has(field) ||
        dirtyFieldKeys.has(getDirtyPlanRowFieldKey(sourceKey, field))
      ) {
        (mergedRow as Record<string, unknown>)[field] = currentRow[field];
      }
    }
    return mergedRow;
  });

  if (mainPhysicalIndexes.length === 0) {
    return mergedMainRows.length > 0 ? mergedMainRows : current;
  }

  const result: T[] = [];
  let mergedMainIndex = 0;
  for (let physicalIndex = 0; physicalIndex < current.length; physicalIndex += 1) {
    const row = current[physicalIndex]!;
    if (!isMainPlanStopRow(row)) {
      result.push(row);
      continue;
    }
    if (mergedMainIndex < mergedMainRows.length) {
      result.push(mergedMainRows[mergedMainIndex]!);
      mergedMainIndex += 1;
    }
  }
  while (mergedMainIndex < mergedMainRows.length) {
    result.push(mergedMainRows[mergedMainIndex]!);
    mergedMainIndex += 1;
  }
  return result;
}

export function collectDirtySourceKeys(dirtyFieldKeys: Set<string>): Set<string> {
  const sourceKeys = new Set<string>();
  for (const key of dirtyFieldKeys) {
    const parsed = parseDirtyPlanRowFieldKey(key);
    if (parsed) {
      sourceKeys.add(parsed.sourceKey);
    }
  }
  return sourceKeys;
}

export function clearDirtyKeysForRemovedSources(
  dirtyFieldKeys: Set<string>,
  nextAutoRows: PlanRowSourceFields[],
): void {
  const nextSourceKeys = new Set(
    nextAutoRows.filter((row) => isMainPlanStopRow(row)).map((row) => getPlanRowSourceKey(row)),
  );

  for (const key of [...dirtyFieldKeys]) {
    const parsed = parseDirtyPlanRowFieldKey(key);
    if (parsed && !nextSourceKeys.has(parsed.sourceKey)) {
      dirtyFieldKeys.delete(key);
    }
  }
}

export function getRouteChangeResetSummary(
  current: PlanRowMergeFields[],
  nextAutoRows: PlanRowMergeFields[],
  dirtyFieldKeys: Set<string>,
): { affectedDayLabels: string[]; lostSourceKeys: Set<string> } {
  const nextSourceKeys = new Set(
    nextAutoRows.filter((row) => isMainPlanStopRow(row)).map((row) => getPlanRowSourceKey(row)),
  );
  const lostSourceKeys = new Set<string>();

  for (const sourceKey of collectDirtySourceKeys(dirtyFieldKeys)) {
    if (!nextSourceKeys.has(sourceKey)) {
      lostSourceKeys.add(sourceKey);
    }
  }

  const affectedDayLabels: string[] = [];
  const mainPhysicalIndexes = buildMainPlanRowPhysicalIndexes(current);

  mainPhysicalIndexes.forEach((physicalIndex, mainIndex) => {
    const row = current[physicalIndex];
    if (!row || !isMainPlanStopRow(row)) {
      return;
    }
    const sourceKey = getPlanRowSourceKey(row);
    if (!lostSourceKeys.has(sourceKey)) {
      return;
    }
    const label = row.dateCellText?.trim() || row.destinationCellText?.trim() || `${mainIndex + 1}일차`;
    affectedDayLabels.push(label);
  });

  return { affectedDayLabels, lostSourceKeys };
}

export function buildRouteChangeConfirmMessage(affectedDayLabels: string[]): string {
  if (affectedDayLabels.length === 0) {
    return '';
  }

  const preview = affectedDayLabels.slice(0, 5).join(', ');
  const suffix =
    affectedDayLabels.length > 5 ? ` 외 ${affectedDayLabels.length - 5}일차` : '';

  return `목적지 변경으로 아래 일차의 직접 수정(시간·일정·식사·숙소·이동강도 색상)이 초기화됩니다.\n\n${preview}${suffix}\n\n계속할까요?`;
}
