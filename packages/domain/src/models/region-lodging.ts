export interface RegionLodging {
  id: string;
  regionId: string;
  name: string;
  subtitle: string | null;
  priceKrw: number | null;
  pricePerPersonKrw: number | null;
  pricePerTeamKrw: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const LODGING_DISPLAY_LABEL_SEP = ' · ';

/** Single-line label for lists and plan snapshots: `name · subtitle` when subtitle is set. */
export function formatRegionLodgingDisplayLabel(input: {
  name: string;
  subtitle?: string | null;
}): string {
  const name = input.name.trim();
  const subtitle = input.subtitle?.trim() ?? '';
  if (!subtitle) {
    return name;
  }
  return `${name}${LODGING_DISPLAY_LABEL_SEP}${subtitle}`;
}

/** For pricing/description lines where only the lodging name should appear (no subtitle suffix). */
export function regionLodgingNameOnlyFromStoredSnapshot(snapshot: string | null | undefined): string {
  const trimmed = snapshot?.trim() ?? '';
  if (!trimmed) {
    return '-';
  }
  if (!trimmed.includes(LODGING_DISPLAY_LABEL_SEP)) {
    return trimmed;
  }
  const nameOnly = trimmed.split(LODGING_DISPLAY_LABEL_SEP)[0]?.trim() ?? '';
  return nameOnly !== '' ? nameOnly : trimmed;
}
