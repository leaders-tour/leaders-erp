import type {
  ConditionCategoryOption,
  ExternalTransferPresetCodeOption,
  PriceItemGroupOption,
  PriceItemOption,
  PricingExternalTransferMode,
  PricingPriceItemGroup,
  PricingPriceItemOptionKey,
  PricingLodgingSelectionLevel,
  PricingPriceItemPreset,
  PricingQuantitySource,
  PricingRuleType,
  PricingTimeBand,
  PlaceType,
  RuleFormStepOption,
  VariantTypeOption,
} from './types';

export const RULE_TYPE_OPTIONS: Array<{ value: PricingRuleType; label: string }> = [
  { value: 'BASE', label: '기본금' },
  { value: 'PERCENT_UPLIFT', label: '기본금 퍼센트 추가' },
  { value: 'LONG_DISTANCE', label: '장거리 기본금' },
  { value: 'CONDITIONAL_ADDON', label: '조건부 추가/할인' },
  { value: 'MANUAL', label: '수동 프리셋' },
];

export const PRICE_ITEM_PRESET_OPTIONS: Array<{
  value: PricingPriceItemPreset;
  label: string;
  description: string;
}> = [
  { value: 'BASE', label: '기본금', description: '기본 금액 라인입니다.' },
  { value: 'BASE_PERCENT', label: '퍼센트', description: '기본금 기준 퍼센트 추가/할인입니다.' },
  { value: 'LONG_DISTANCE', label: '장거리', description: '장거리 구간 수 기준으로 자동 계산됩니다.' },
  { value: 'NIGHT_TRAIN', label: '야간 기차', description: '야간열차 운행 수 기준으로 자동 계산됩니다.' },
  { value: 'EXTRA_LODGING', label: '숙소 추가', description: '추가 숙박 수 기준으로 자동 계산됩니다.' },
  { value: 'LODGING_SELECTION', label: '숙소 업그레이드', description: '숙소 업그레이드 등급별 규칙입니다.' },
  { value: 'PICKUP_DROP', label: '픽드랍', description: '픽업/드랍과 실투어 외 이동 조건을 다룹니다.' },
  { value: 'CONDITIONAL', label: '조건부', description: '일반 조건 조합형 추가/할인 규칙입니다.' },
  { value: 'MANUAL_PRESET', label: '수동', description: '일정빌더에서 수동 추가할 기타금액 프리셋입니다.' },
];

export const PRICE_ITEM_GROUP_OPTIONS: PriceItemGroupOption[] = [
  { value: 'BASE', label: '기본금', description: '기본 계산에 포함되는 항목입니다.' },
  { value: 'AUTO', label: '자동', description: '조건을 만나면 자동으로 계산 라인에 들어갑니다.' },
  { value: 'CONDITION', label: '조건', description: '조건이 맞으면 자동 삽입되는 일반 규칙입니다.' },
  { value: 'MANUAL', label: '수동', description: '일정빌더에서 수동으로 추가하는 프리셋입니다.' },
];

export const PRICE_ITEM_OPTIONS: PriceItemOption[] = [
  { value: 'BASE', group: 'BASE', preset: 'BASE', label: '기본금', description: '기본 금액 라인입니다.' },
  {
    value: 'BASE_PERCENT',
    group: 'BASE',
    preset: 'BASE_PERCENT',
    label: '기본금 퍼센트',
    description: '기본금 기준 퍼센트 추가/할인입니다.',
  },
  {
    value: 'LONG_DISTANCE',
    group: 'BASE',
    preset: 'LONG_DISTANCE',
    label: '장거리',
    description: '장거리 구간 수 기준으로 자동 계산됩니다.',
  },
  {
    value: 'PICKUP_DROP',
    group: 'AUTO',
    preset: 'PICKUP_DROP',
    label: '실투외 픽드랍',
    description: '실투어 외 이동과 픽드랍 조건을 기준으로 자동 계산됩니다.',
  },
  {
    value: 'LODGING_SELECTION',
    group: 'AUTO',
    preset: 'LODGING_SELECTION',
    label: '숙소 업그레이드(할인)',
    description: '숙소 업그레이드 등급별 자동 규칙입니다.',
  },
  {
    value: 'EXTRA_LODGING',
    group: 'AUTO',
    preset: 'EXTRA_LODGING',
    label: '숙소 추가',
    description: '추가 숙박 수 기준으로 자동 계산됩니다.',
  },
  {
    value: 'NIGHT_TRAIN',
    group: 'AUTO',
    preset: 'NIGHT_TRAIN',
    label: '야간 열차',
    description: '야간열차 운행 수 기준으로 자동 계산됩니다.',
  },
  {
    value: 'CONDITIONAL_EARLY',
    group: 'CONDITION',
    preset: 'CONDITIONAL',
    label: '얼리',
    description: 'Early/EarlyExtend variant에 적용됩니다.',
  },
  {
    value: 'CONDITIONAL_EXTEND',
    group: 'CONDITION',
    preset: 'CONDITIONAL',
    label: '연장',
    description: 'Extend/EarlyExtend variant에 적용됩니다.',
  },
  {
    value: 'CONDITIONAL_HIACE',
    group: 'CONDITION',
    preset: 'CONDITIONAL',
    label: '하이에이스',
    description: '하이에이스 + 3~6인 조건의 자동 규칙입니다.',
  },
  {
    value: 'CONDITIONAL_CUSTOM',
    group: 'CONDITION',
    preset: 'CONDITIONAL',
    label: '기타 조건',
    description: '직접 조건을 조합하는 일반 규칙입니다.',
  },
  {
    value: 'MANUAL_PRESET',
    group: 'MANUAL',
    preset: 'MANUAL_PRESET',
    label: '수동',
    description: '일정빌더에서 수동 추가할 기타금액 프리셋입니다.',
  },
];

export const RULE_FORM_STEP_OPTIONS: RuleFormStepOption[] = [
  { value: 'BASICS', label: '1. 기본 정보', description: '가격 항목, 가격, 수량, 제목을 설정합니다.' },
  { value: 'CONDITIONS', label: '2. 조건 선택', description: '가격 항목에 맞는 조건만 골라 입력합니다.' },
  { value: 'DISPLAY', label: '3. 표시 선택', description: '표시 기준과 수동 프리셋 표기를 결정합니다.' },
];

/** 테이블·표시용: enum 영문 대신 한글 라벨 */
export function getPricingRuleTypeLabelKo(ruleType: PricingRuleType): string {
  const fromOptions = RULE_TYPE_OPTIONS.find((o) => o.value === ruleType);
  if (fromOptions) {
    return fromOptions.label;
  }
  if (ruleType === 'AUTO_EXCEPTION') {
    return '자동 특례';
  }
  if (ruleType === 'MANUAL') {
    return '수동 조정';
  }
  return ruleType;
}

export function getPriceItemPresetLabel(value: PricingPriceItemPreset): string {
  return PRICE_ITEM_PRESET_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getPriceItemGroupLabel(value: PricingPriceItemGroup): string {
  return PRICE_ITEM_GROUP_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getPriceItemOptionLabel(value: PricingPriceItemOptionKey): string {
  return PRICE_ITEM_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export const PRICE_ITEM_ALLOWED_CONDITION_CATEGORIES: Record<
  PricingPriceItemPreset,
  ConditionCategoryOption['value'][]
> = {
  BASE: ['headcountDays', 'travelDate', 'variant'],
  BASE_PERCENT: ['headcountDays', 'travelDate', 'variant'],
  LONG_DISTANCE: ['headcountDays', 'travelDate', 'variant'],
  NIGHT_TRAIN: ['headcountDays', 'travelDate', 'variant', 'flight'],
  EXTRA_LODGING: ['headcountDays', 'travelDate', 'variant'],
  LODGING_SELECTION: ['lodgingSelection', 'headcountDays', 'travelDate', 'variant'],
  PICKUP_DROP: ['pickupDrop', 'externalTransfer', 'headcountDays', 'travelDate', 'flight'],
  CONDITIONAL: ['headcountDays', 'travelDate', 'vehicle', 'variant', 'flight', 'pickupDrop', 'externalTransfer'],
  MANUAL_PRESET: [],
};

export const QUANTITY_SOURCE_OPTIONS: Array<{ value: PricingQuantitySource; label: string }> = [
  { value: 'ONE', label: '1회 고정' },
  { value: 'HEADCOUNT', label: '인원수' },
  { value: 'TOTAL_DAYS', label: '여행 일수' },
  { value: 'LONG_DISTANCE_SEGMENT_COUNT', label: '장거리 구간 수' },
  { value: 'NIGHT_TRAIN_BLOCK_COUNT', label: '야간열차 운행 수' },
  { value: 'SUM_EXTRA_LODGING_COUNTS', label: '추가 숙박 수' },
];

export const LODGING_SELECTION_LEVEL_OPTIONS: Array<{ value: PricingLodgingSelectionLevel; label: string }> = [
  { value: 'LV1', label: 'LV1 할인' },
  { value: 'LV2', label: 'LV2 할인' },
  { value: 'LV4', label: 'LV4 업그레이드' },
];

export function getLodgingSelectionLevelLabel(level: PricingLodgingSelectionLevel): string {
  return LODGING_SELECTION_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? level;
}

export const CONDITION_CATEGORY_OPTIONS: ConditionCategoryOption[] = [
  { value: 'headcountDays', label: '인원/일수', description: '인원수와 여행 일수 범위를 설정합니다.' },
  { value: 'travelDate', label: '여행일', description: '여행 시작일 구간을 제한합니다.' },
  { value: 'vehicle', label: '차량', description: '특정 차량 조건을 설정합니다.' },
  { value: 'variant', label: 'Variant', description: '적용할 Variant를 선택합니다.' },
  { value: 'flight', label: '항공', description: '입출국 시간대 조건을 설정합니다.' },
  { value: 'pickupDrop', label: '픽업/드랍', description: '픽업 또는 드랍 장소 조건을 설정합니다.' },
  { value: 'externalTransfer', label: '실투어외 픽드랍', description: '외부 이동 방향, 건수, 프리셋을 설정합니다.' },
  { value: 'lodgingSelection', label: '숙소 업그레이드', description: '숙소 업그레이드 조건을 선택합니다.' },
];

export function getConditionCategoryLabel(value: ConditionCategoryOption['value']): string {
  return CONDITION_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getPricingQuantitySourceLabelKo(quantitySource: PricingQuantitySource): string {
  return QUANTITY_SOURCE_OPTIONS.find((option) => option.value === quantitySource)?.label ?? quantitySource;
}

export const VARIANT_OPTIONS: Array<{ value: VariantTypeOption; label: string }> = [
  { value: 'basic', label: 'Basic' },
  { value: 'early', label: 'Early' },
  { value: 'extend', label: 'Extend' },
  { value: 'earlyExtend', label: 'EarlyExtend' },
];

export const TIME_BAND_OPTIONS: Array<{ value: PricingTimeBand; label: string }> = [
  { value: 'DAWN', label: '새벽(00~04:59)' },
  { value: 'MORNING', label: '오전(05~11:59)' },
  { value: 'AFTERNOON', label: '오후(12~17:59)' },
  { value: 'EVENING', label: '저녁(18~21:59)' },
  { value: 'NIGHT', label: '심야(22~23:59)' },
];

export const PLACE_TYPE_OPTIONS: Array<{ value: PlaceType; label: string }> = [
  { value: 'AIRPORT', label: '공항' },
  { value: 'OZ_HOUSE', label: '오즈하우스' },
  { value: 'ULAANBAATAR', label: '울란바토르' },
  { value: 'CUSTOM', label: '직접입력' },
];

export const EXTERNAL_TRANSFER_MODE_OPTIONS: Array<{ value: PricingExternalTransferMode; label: string }> = [
  { value: 'ANY', label: '픽업/드랍 아무거나' },
  { value: 'PICKUP_ONLY', label: '픽업만' },
  { value: 'DROP_ONLY', label: '드랍만' },
  { value: 'BOTH', label: '픽업+드랍 모두' },
];

export const EXTERNAL_TRANSFER_PRESET_OPTIONS: Array<{ value: ExternalTransferPresetCodeOption; label: string }> = [
  { value: 'DROP_ULAANBAATAR_AIRPORT', label: '드랍 · 울란바토르 → 공항' },
  { value: 'DROP_TERELJ_AIRPORT', label: '드랍 · 테를지 → 공항' },
  { value: 'DROP_OZHOUSE_AIRPORT', label: '드랍 · 오즈하우스 → 공항' },
  { value: 'PICKUP_AIRPORT_OZHOUSE', label: '픽업 · 공항 → 오즈하우스' },
  { value: 'PICKUP_AIRPORT_ULAANBAATAR', label: '픽업 · 공항 → 울란바토르' },
  { value: 'PICKUP_AIRPORT_TERELJ', label: '픽업 · 공항 → 테를지' },
  { value: 'CUSTOM', label: '수동입력' },
];

export function getExternalTransferPresetLabel(code: ExternalTransferPresetCodeOption): string {
  return EXTERNAL_TRANSFER_PRESET_OPTIONS.find((option) => option.value === code)?.label ?? code;
}
