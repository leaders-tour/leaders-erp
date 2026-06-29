import {
  findMatchingAutoAdjustmentLinesOnTeam,
  type DisplayedPricingAdjustmentLineRow,
  type PricingAdjustmentLineRow,
  type PricingLike,
} from './manual-pricing';

export interface ManualPricingAdjustmentLineRow {
  id: string;
  type: 'AUTO' | 'MANUAL';
  rowKey?: string | null;
  teamOrderIndex?: number | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  strikethrough?: boolean;
  deleted?: boolean;
}

export interface ManualPricingAdjustmentState {
  adjustmentLines: ManualPricingAdjustmentLineRow[];
}

export interface AdjustmentLineTeamAssignmentContext {
  pricingPreview: Pick<PricingLike, 'teamPricings'>;
  totalDays: number;
}

function createManualPricingLineId(): string {
  return `manual-line-${crypto.randomUUID()}`;
}

function matchesDisplayedLineIdentity(
  row: Pick<ManualPricingAdjustmentLineRow, 'label' | 'leadAmountKrw' | 'formula'>,
  line: Pick<DisplayedPricingAdjustmentLineRow, 'label' | 'leadAmountKrw' | 'formula'>,
): boolean {
  return row.label === line.label && row.leadAmountKrw === line.leadAmountKrw && row.formula === line.formula;
}

function upsertManualPricingAutoOverride(
  current: ManualPricingAdjustmentState,
  line: PricingAdjustmentLineRow,
  patch: Partial<
    Pick<
      ManualPricingAdjustmentLineRow,
      'label' | 'leadAmountKrw' | 'formula' | 'strikethrough' | 'deleted' | 'teamOrderIndex'
    >
  >,
): ManualPricingAdjustmentState {
  if (!line.rowKey) {
    return current;
  }
  const existingIndex = current.adjustmentLines.findIndex((row) => row.type === 'AUTO' && row.rowKey === line.rowKey);
  const existing = existingIndex >= 0 ? current.adjustmentLines[existingIndex] : null;
  const nextRow: ManualPricingAdjustmentLineRow = {
    id: existing?.id ?? line.id,
    type: 'AUTO',
    rowKey: line.rowKey,
    teamOrderIndex: patch.teamOrderIndex ?? existing?.teamOrderIndex ?? line.teamOrderIndex ?? null,
    label: patch.label ?? existing?.label ?? line.label,
    leadAmountKrw: patch.leadAmountKrw ?? existing?.leadAmountKrw ?? line.leadAmountKrw,
    formula: patch.formula ?? existing?.formula ?? line.formula,
    strikethrough: patch.strikethrough ?? existing?.strikethrough ?? line.strikethrough ?? false,
    deleted: patch.deleted ?? existing?.deleted ?? false,
  };
  const matchesAuto =
    nextRow.deleted !== true &&
    nextRow.label === (line.autoLabel ?? line.label) &&
    nextRow.leadAmountKrw === (line.autoLeadAmountKrw ?? line.leadAmountKrw) &&
    nextRow.formula === (line.autoFormula ?? line.formula) &&
    nextRow.strikethrough !== true;

  if (matchesAuto) {
    return {
      ...current,
      adjustmentLines: current.adjustmentLines.filter((row) => !(row.type === 'AUTO' && row.rowKey === line.rowKey)),
    };
  }

  if (existingIndex < 0) {
    return {
      ...current,
      adjustmentLines: [...current.adjustmentLines, nextRow],
    };
  }

  return {
    ...current,
    adjustmentLines: current.adjustmentLines.map((row, index) => (index === existingIndex ? nextRow : row)),
  };
}

function restoreManualPricingAutoLine(
  current: ManualPricingAdjustmentState,
  rowKey: string,
): ManualPricingAdjustmentState {
  return {
    ...current,
    adjustmentLines: current.adjustmentLines.filter((row) => !(row.type === 'AUTO' && row.rowKey === rowKey)),
  };
}

function removeManualLinesMatchingIdentity(
  current: ManualPricingAdjustmentState,
  line: DisplayedPricingAdjustmentLineRow,
): ManualPricingAdjustmentState {
  return {
    ...current,
    adjustmentLines: current.adjustmentLines.filter(
      (row) => !(row.type === 'MANUAL' && row.deleted !== true && matchesDisplayedLineIdentity(row, line)),
    ),
  };
}

function hideMatchingAutoLinesForTeams(
  current: ManualPricingAdjustmentState,
  line: DisplayedPricingAdjustmentLineRow,
  teamOrderIndexes: number[],
  context: AdjustmentLineTeamAssignmentContext,
): ManualPricingAdjustmentState {
  let nextState = current;
  for (const teamOrderIndex of teamOrderIndexes) {
    const matches = findMatchingAutoAdjustmentLinesOnTeam(context.pricingPreview, line, teamOrderIndex, {
      totalDays: context.totalDays,
    });
    for (const autoLine of matches) {
      if (autoLine.rowKey) {
        nextState = upsertManualPricingAutoOverride(nextState, autoLine, { deleted: true });
      }
    }
  }
  for (const sourceLine of line.sourceLines) {
    if (sourceLine.rowKey) {
      nextState = upsertManualPricingAutoOverride(nextState, sourceLine, { deleted: true });
    }
  }
  return nextState;
}

function restoreMatchingAutoLinesForAllTeams(
  current: ManualPricingAdjustmentState,
  line: DisplayedPricingAdjustmentLineRow,
  context: AdjustmentLineTeamAssignmentContext,
): ManualPricingAdjustmentState {
  const teamCount = context.pricingPreview.teamPricings?.length ?? 0;
  let nextState = current;
  for (let teamOrderIndex = 0; teamOrderIndex < teamCount; teamOrderIndex += 1) {
    const matches = findMatchingAutoAdjustmentLinesOnTeam(context.pricingPreview, line, teamOrderIndex, {
      totalDays: context.totalDays,
    });
    for (const autoLine of matches) {
      if (autoLine.rowKey) {
        nextState = restoreManualPricingAutoLine(nextState, autoLine.rowKey);
      }
    }
  }
  return nextState;
}

function allTeamsHaveMatchingAutoLine(
  line: DisplayedPricingAdjustmentLineRow,
  context: AdjustmentLineTeamAssignmentContext,
): boolean {
  const teamPricings = context.pricingPreview.teamPricings ?? [];
  if (teamPricings.length === 0) {
    return false;
  }
  return teamPricings.every(
    (teamPricing) =>
      findMatchingAutoAdjustmentLinesOnTeam(context.pricingPreview, line, teamPricing.teamOrderIndex, {
        totalDays: context.totalDays,
      }).length > 0,
  );
}

export function resolveDisplayedAdjustmentLineTeamOrderIndex(
  line: DisplayedPricingAdjustmentLineRow,
): number | null {
  if (line.isSharedAcrossTeams) {
    return null;
  }
  if (line.teamOrderIndexes.length === 1) {
    return line.teamOrderIndexes[0] ?? null;
  }
  return line.teamOrderIndex ?? null;
}

/** 추가·할인 줄의 적용 팀을 바꾼다. MANUAL 중복·AUTO 잔존 없이 한 줄만 남기도록 정리한다. */
export function assignDisplayedAdjustmentLineTeam(
  current: ManualPricingAdjustmentState,
  line: DisplayedPricingAdjustmentLineRow,
  nextTeamOrderIndex: number | null,
  context?: AdjustmentLineTeamAssignmentContext,
): ManualPricingAdjustmentState {
  const currentTeamOrderIndex = resolveDisplayedAdjustmentLineTeamOrderIndex(line);
  if (currentTeamOrderIndex === nextTeamOrderIndex) {
    return current;
  }

  const teamCount = context?.pricingPreview.teamPricings?.length ?? 0;
  const allTeamIndexes = Array.from({ length: teamCount }, (_, index) => index);

  if (nextTeamOrderIndex === null) {
    if (context && allTeamsHaveMatchingAutoLine(line, context)) {
      let nextState = removeManualLinesMatchingIdentity(current, line);
      nextState = restoreMatchingAutoLinesForAllTeams(nextState, line, context);
      return nextState;
    }

    let nextState = removeManualLinesMatchingIdentity(current, line);
    if (context && teamCount > 0) {
      nextState = hideMatchingAutoLinesForTeams(nextState, line, allTeamIndexes, context);
    } else {
      for (const sourceLine of line.sourceLines) {
        if (sourceLine.rowKey) {
          nextState = upsertManualPricingAutoOverride(nextState, sourceLine, { deleted: true });
        }
      }
    }

    return {
      ...nextState,
      adjustmentLines: [
        ...nextState.adjustmentLines,
        {
          id: createManualPricingLineId(),
          type: 'MANUAL',
          teamOrderIndex: null,
          label: line.label,
          leadAmountKrw: line.leadAmountKrw,
          formula: line.formula,
          strikethrough: line.strikethrough,
          deleted: false,
        },
      ],
    };
  }

  let nextState = removeManualLinesMatchingIdentity(current, line);
  if (context && teamCount > 0) {
    nextState = hideMatchingAutoLinesForTeams(nextState, line, allTeamIndexes, context);
  } else {
    for (const sourceLine of line.sourceLines) {
      if (sourceLine.rowKey) {
        nextState = upsertManualPricingAutoOverride(nextState, sourceLine, { deleted: true });
      }
    }
  }

  return {
    ...nextState,
    adjustmentLines: [
      ...nextState.adjustmentLines,
      {
        id: createManualPricingLineId(),
        type: 'MANUAL',
        teamOrderIndex: nextTeamOrderIndex,
        label: line.label,
        leadAmountKrw: line.leadAmountKrw,
        formula: line.formula,
        strikethrough: line.strikethrough,
        deleted: false,
      },
    ],
  };
}
