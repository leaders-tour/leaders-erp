export type LodgingSelectionLevel = 'LV1' | 'LV2' | 'LV3' | 'LV4' | 'CUSTOM';

export interface RegionLodgingOption {
  id: string;
  regionId: string;
  name: string;
  priceKrw: number | null;
  pricePerPersonKrw: number | null;
  pricePerTeamKrw: number | null;
  isActive: boolean;
  sortOrder: number;
}

export function getBaseLodgingText(
  version:
    | {
        lodgings?: Array<{
          name: string;
          hasElectricity?: 'YES' | 'LIMITED' | 'NO';
          hasShower?: 'YES' | 'LIMITED' | 'NO';
          hasInternet?: 'YES' | 'LIMITED' | 'NO';
        }>;
      }
    | undefined,
  toFacilityLabel: (value: 'YES' | 'LIMITED' | 'NO' | undefined) => string,
): string {
  const lodging = version?.lodgings?.[0];
  if (!lodging) {
    return '';
  }

  return [
    lodging.name,
    `전기 ${toFacilityLabel(lodging.hasElectricity)}`,
    `샤워 ${toFacilityLabel(lodging.hasShower)}`,
    `인터넷 ${toFacilityLabel(lodging.hasInternet)}`,
  ].join('\n');
}

export function getBaseLodgingName(version: { lodgings?: Array<{ name: string }> } | undefined): string {
  return version?.lodgings?.[0]?.name ?? '';
}

export function buildLodgingCellText(input: {
  level: LodgingSelectionLevel;
  baseLodgingName: string;
  customLodgingName?: string | null;
}): string {
  switch (input.level) {
    case 'LV1':
      return 'LV.1 캠핑';
    case 'LV2':
      return 'LV.2 전통게르';
    case 'LV4':
      return 'LV4.디럭스 숙소';
    case 'CUSTOM':
      return input.customLodgingName?.trim() ?? '';
    case 'LV3':
    default:
      return input.baseLodgingName;
  }
}

export function formatRegionLodgingPrice(option: Pick<RegionLodgingOption, 'priceKrw' | 'pricePerPersonKrw' | 'pricePerTeamKrw'>): string {
  if (option.pricePerPersonKrw != null) {
    return `인당 ${option.pricePerPersonKrw.toLocaleString('ko-KR')}원`;
  }
  if (option.pricePerTeamKrw != null) {
    return `팀당 ${option.pricePerTeamKrw.toLocaleString('ko-KR')}원`;
  }
  if (option.priceKrw != null) {
    return `총 ${option.priceKrw.toLocaleString('ko-KR')}원`;
  }
  return '-';
}
