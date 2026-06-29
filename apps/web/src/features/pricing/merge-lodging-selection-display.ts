import { mergeAddonSourceLines, type PricingManualSourceLine } from '@tour/domain';
import type { PricingViewLine } from './view-model';

export type { LodgingSelectionLevelKey } from '@tour/domain';

export type PricingLineDisplayExtensions = {
  /** When set, quantity column shows e.g. "2박" instead of "2". */
  quantityDisplaySuffix?: '박';
};

/**
 * Merges addon display rows (lodging tiers, same-label team pickup/drop, etc.) for UI/estimate.
 * Totals are unchanged.
 */
export function mergeLodgingSelectionDisplayLines<T extends PricingViewLine>(
  lines: T[],
): Array<T & PricingLineDisplayExtensions> {
  return mergeAddonSourceLines(lines as PricingManualSourceLine[]) as Array<T & PricingLineDisplayExtensions>;
}
