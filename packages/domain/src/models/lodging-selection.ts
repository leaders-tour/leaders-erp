export type LodgingSelectionLevel = 'LV1' | 'LV2' | 'LV3' | 'LV4' | 'CUSTOM';

export type LodgingSelectionPricingMode = 'PER_PERSON' | 'PER_TEAM' | 'FLAT' | null;

export interface LodgingSelection {
  dayIndex: number;
  level: LodgingSelectionLevel;
  customLodgingId: string | null;
  customLodgingNameSnapshot: string | null;
  pricingModeSnapshot: LodgingSelectionPricingMode;
  priceSnapshotKrw: number | null;
}
