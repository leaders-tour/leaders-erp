import type {
  PricingExternalTransferMode,
  PricingQuantitySource,
  PricingRuleType,
  PricingTimeBand,
  PlaceType,
  VariantTypeOption,
} from './types';

export const RULE_TYPE_OPTIONS: Array<{ value: PricingRuleType; label: string }> = [
  { value: 'BASE', label: '기본금' },
  { value: 'PERCENT_UPLIFT', label: '기본금 퍼센트 추가' },
  { value: 'CONDITIONAL_ADDON', label: '조건부 추가/할인' },
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

export const QUANTITY_SOURCE_OPTIONS: Array<{ value: PricingQuantitySource; label: string }> = [
  { value: 'ONE', label: '1회 고정' },
  { value: 'HEADCOUNT', label: '인원수' },
  { value: 'TOTAL_DAYS', label: '여행 일수' },
  { value: 'SUM_EXTRA_LODGING_COUNTS', label: '추가 숙박 수' },
];

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
