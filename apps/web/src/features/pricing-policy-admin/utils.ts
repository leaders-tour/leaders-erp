import type {
  ConditionCategoryKey,
  DerivedRuleConstraints,
  PolicyFormState,
  PricingPolicyListRow,
  PricingPriceItemGroup,
  PricingPriceItemOptionKey,
  PricingPriceItemPreset,
  PricingRuleType,
  PricingRuleRow,
  RuleFormState,
  RuleFormStep,
} from './types';
import {
  PRICE_ITEM_ALLOWED_CONDITION_CATEGORIES,
  PRICE_ITEM_OPTIONS,
  getPriceItemPresetLabel,
} from './constants';

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
}

export function createEmptyPolicyForm(): PolicyFormState {
  return {
    name: '',
    status: 'ACTIVE',
    effectiveFrom: '',
    effectiveTo: '',
  };
}

export function toPolicyForm(policy: PricingPolicyListRow): PolicyFormState {
  return {
    name: policy.name,
    status: policy.status,
    effectiveFrom: toDateInputValue(policy.effectiveFrom),
    effectiveTo: toDateInputValue(policy.effectiveTo),
  };
}

export function createEmptyRuleForm(): RuleFormState {
  return {
    priceItemPreset: 'BASE',
    ruleType: 'BASE',
    title: '',
    amountKrw: '',
    percentText: '',
    quantitySource: 'ONE',
    lodgingSelectionLevel: '',
    headcountMin: '',
    headcountMax: '',
    dayMin: '',
    dayMax: '',
    travelDateFrom: '',
    travelDateTo: '',
    vehicleType: '',
    variantTypes: [],
    flightInTimeBand: '',
    flightOutTimeBand: '',
    pickupPlaceType: '',
    dropPlaceType: '',
    externalTransferMode: '',
    externalTransferMinCount: '',
    externalTransferPresetCodes: [],
    chargeScope: '',
    personMode: '',
    customDisplayText: '',
    isEnabled: true,
    sortOrder: '0',
  };
}

export function createEmptyRuleFormForGroup(group: PricingPriceItemGroup): RuleFormState {
  const defaultOption = PRICE_ITEM_OPTIONS.find((option) => option.group === group)?.value ?? 'CONDITIONAL_CUSTOM';
  return applyPriceItemOptionSelection(createEmptyRuleForm(), defaultOption);
}

export function toRuleForm(rule: PricingRuleRow): RuleFormState {
  return {
    priceItemPreset: rule.priceItemPreset,
    ruleType: rule.ruleType,
    title: rule.title,
    amountKrw: rule.amountKrw != null ? String(rule.amountKrw) : '',
    percentText: rule.percentBps != null ? String(rule.percentBps / 100) : '',
    quantitySource: rule.quantitySource,
    lodgingSelectionLevel: rule.lodgingSelectionLevel ?? '',
    headcountMin: rule.headcountMin != null ? String(rule.headcountMin) : '',
    headcountMax: rule.headcountMax != null ? String(rule.headcountMax) : '',
    dayMin: rule.dayMin != null ? String(rule.dayMin) : '',
    dayMax: rule.dayMax != null ? String(rule.dayMax) : '',
    travelDateFrom: toDateInputValue(rule.travelDateFrom),
    travelDateTo: toDateInputValue(rule.travelDateTo),
    vehicleType: rule.vehicleType ?? '',
    variantTypes: rule.variantTypes ?? [],
    flightInTimeBand: rule.flightInTimeBand ?? '',
    flightOutTimeBand: rule.flightOutTimeBand ?? '',
    pickupPlaceType: rule.pickupPlaceType ?? '',
    dropPlaceType: rule.dropPlaceType ?? '',
    externalTransferMode: rule.externalTransferMode ?? '',
    externalTransferMinCount: rule.externalTransferMinCount != null ? String(rule.externalTransferMinCount) : '',
    externalTransferPresetCodes: rule.externalTransferPresetCodes ?? [],
    chargeScope: rule.chargeScope ?? '',
    personMode: rule.personMode ?? '',
    customDisplayText: rule.customDisplayText ?? '',
    isEnabled: rule.isEnabled,
    sortOrder: String(rule.sortOrder),
  };
}

export function getRuleTypeForPriceItemPreset(priceItemPreset: PricingPriceItemPreset): PricingRuleType {
  switch (priceItemPreset) {
    case 'BASE':
      return 'BASE';
    case 'BASE_PERCENT':
      return 'PERCENT_UPLIFT';
    case 'LONG_DISTANCE':
      return 'LONG_DISTANCE';
    case 'MANUAL_PRESET':
      return 'MANUAL';
    default:
      return 'CONDITIONAL_ADDON';
  }
}

export function getPriceItemGroupForPreset(priceItemPreset: PricingPriceItemPreset): PricingPriceItemGroup {
  return PRICE_ITEM_OPTIONS.find((option) => option.preset === priceItemPreset)?.group ?? 'CONDITION';
}

export function getSelectedPriceItemOption(ruleForm: RuleFormState): PricingPriceItemOptionKey {
  if (ruleForm.priceItemPreset === 'CONDITIONAL') {
    const variants = [...ruleForm.variantTypes].sort().join(',');
    if (ruleForm.vehicleType.trim() === '하이에이스(숏)') {
      return 'CONDITIONAL_HIACE_SHORT';
    }
    if (ruleForm.vehicleType.trim() === '하이에이스(롱)') {
      return 'CONDITIONAL_HIACE_LONG';
    }
    if (variants === ['early', 'earlyExtend'].sort().join(',')) {
      return 'CONDITIONAL_EARLY';
    }
    if (variants === ['earlyExtend', 'extend'].sort().join(',')) {
      return 'CONDITIONAL_EXTEND';
    }
    return 'CONDITIONAL_CUSTOM';
  }
  return (PRICE_ITEM_OPTIONS.find((option) => option.preset === ruleForm.priceItemPreset)?.value ??
    'CONDITIONAL_CUSTOM') as PricingPriceItemOptionKey;
}

function getRecommendedConditionCategoriesByOption(optionKey: PricingPriceItemOptionKey): ConditionCategoryKey[] {
  switch (optionKey) {
    case 'PICKUP_DROP':
      return ['externalTransfer'];
    case 'LODGING_SELECTION':
      return ['lodgingSelection'];
    case 'CONDITIONAL_EARLY':
    case 'CONDITIONAL_EXTEND':
      return ['variant'];
    case 'CONDITIONAL_HIACE_SHORT':
    case 'CONDITIONAL_HIACE_LONG':
      return ['vehicle', 'headcountDays'];
    case 'BASE':
    case 'BASE_PERCENT':
    case 'LONG_DISTANCE':
    case 'EXTRA_LODGING':
    case 'CONDITIONAL_CUSTOM':
    case 'MANUAL_PRESET':
    default:
      return [];
  }
}

export function getDefaultOpenConditionCategories(ruleForm: RuleFormState): ConditionCategoryKey[] {
  const allowedCategories = new Set(getAllowedConditionCategories(ruleForm));
  const recommendedCategories = getRecommendedConditionCategoriesByOption(getSelectedPriceItemOption(ruleForm));
  const activeCategories = getActiveConditionCategories(ruleForm);

  return [...recommendedCategories, ...activeCategories].filter(
    (category, index, categories) => allowedCategories.has(category) && categories.indexOf(category) === index,
  );
}

export function applyPriceItemOptionSelection(
  ruleForm: RuleFormState,
  optionKey: PricingPriceItemOptionKey,
): RuleFormState {
  const option = PRICE_ITEM_OPTIONS.find((item) => item.value === optionKey);
  if (!option) {
    return ruleForm;
  }
  const baseNextForm: RuleFormState = {
    ...ruleForm,
    priceItemPreset: option.preset,
    ruleType: getRuleTypeForPriceItemPreset(option.preset),
  };

  switch (optionKey) {
    case 'CONDITIONAL_EARLY':
      return {
        ...baseNextForm,
        vehicleType: '',
        headcountMin: '',
        headcountMax: '',
        variantTypes: ['early', 'earlyExtend'],
      };
    case 'CONDITIONAL_EXTEND':
      return {
        ...baseNextForm,
        vehicleType: '',
        headcountMin: '',
        headcountMax: '',
        variantTypes: ['extend', 'earlyExtend'],
      };
    case 'CONDITIONAL_HIACE_SHORT':
      return {
        ...baseNextForm,
        vehicleType: '하이에이스(숏)',
        headcountMin: '3',
        headcountMax: '6',
        variantTypes: [],
      };
    case 'CONDITIONAL_HIACE_LONG':
      return {
        ...baseNextForm,
        vehicleType: '하이에이스(롱)',
        headcountMin: '3',
        headcountMax: '6',
        variantTypes: [],
      };
    case 'CONDITIONAL_CUSTOM':
      return {
        ...baseNextForm,
        vehicleType: '',
        headcountMin: '',
        headcountMax: '',
        variantTypes: [],
      };
    case 'LODGING_SELECTION':
      return {
        ...baseNextForm,
        lodgingSelectionLevel: ruleForm.lodgingSelectionLevel,
      };
    default:
      return baseNextForm;
  }
}

export function deriveRuleConstraints(ruleForm: RuleFormState): DerivedRuleConstraints {
  const effectiveRuleType = getRuleTypeForPriceItemPreset(ruleForm.priceItemPreset);
  const baseConstraints: Omit<DerivedRuleConstraints, 'effectiveRuleType'> = {
    effectiveQuantitySource: ruleForm.quantitySource,
    quantitySourceLocked: false,
    quantitySourceReason: null,
    effectiveChargeScope: effectiveRuleType === 'PERCENT_UPLIFT' ? '' : ruleForm.chargeScope,
    chargeScopeLocked: false,
    effectivePersonMode:
      effectiveRuleType === 'PERCENT_UPLIFT'
        ? ''
        : ruleForm.chargeScope === 'PER_PERSON'
          ? ruleForm.personMode
          : '',
    personModeLocked: false,
    displayLockedMessage: null,
    allowedConditionCategories: PRICE_ITEM_ALLOWED_CONDITION_CATEGORIES[ruleForm.priceItemPreset],
  };

  switch (ruleForm.priceItemPreset) {
    case 'BASE':
      return {
        effectiveRuleType,
        ...baseConstraints,
        effectiveChargeScope: '',
        displayLockedMessage: '기본금은 표시 기준이 고정됩니다.',
      };
    case 'BASE_PERCENT':
      return {
        effectiveRuleType,
        ...baseConstraints,
        effectiveQuantitySource: 'ONE',
        quantitySourceLocked: true,
        quantitySourceReason: '퍼센트 항목은 1회 기준으로 자동 설정',
        effectiveChargeScope: '',
        displayLockedMessage: '기본금 퍼센트 항목은 표시 기준이 고정됩니다.',
      };
    case 'LONG_DISTANCE':
      return {
        effectiveRuleType,
        ...baseConstraints,
        effectiveQuantitySource: 'LONG_DISTANCE_SEGMENT_COUNT',
        quantitySourceLocked: true,
        quantitySourceReason: '장거리 항목은 장거리 구간 수 기준으로 자동 설정',
        effectiveChargeScope: '',
        displayLockedMessage: '장거리 기본금은 표시 기준이 고정됩니다.',
      };
    case 'NIGHT_TRAIN':
      return {
        effectiveRuleType,
        ...baseConstraints,
        effectiveQuantitySource: 'NIGHT_TRAIN_BLOCK_COUNT',
        quantitySourceLocked: true,
        quantitySourceReason: '야간 기차 항목은 운행 수 기준으로 자동 설정',
        effectiveChargeScope: '',
        displayLockedMessage: '야간 기차 항목은 표기 기준이 자동 계산됩니다.',
      };
    case 'EXTRA_LODGING':
      return {
        effectiveRuleType,
        ...baseConstraints,
        effectiveQuantitySource: 'SUM_EXTRA_LODGING_COUNTS',
        quantitySourceLocked: true,
        quantitySourceReason: '숙소 추가 항목은 추가 숙박 수 기준으로 자동 설정',
        effectiveChargeScope: '',
        displayLockedMessage: '숙소 추가 항목은 표기 기준이 자동 계산됩니다.',
      };
    case 'LODGING_SELECTION':
      return {
        effectiveRuleType,
        ...baseConstraints,
        effectiveQuantitySource: 'ONE',
        quantitySourceLocked: true,
        quantitySourceReason: '숙소 업그레이드 항목은 1회 기준으로 자동 설정',
        effectiveChargeScope: 'PER_PERSON',
        chargeScopeLocked: true,
        effectivePersonMode: 'PER_NIGHT',
        personModeLocked: true,
        displayLockedMessage: '숙소 업그레이드 항목은 자동으로 `박당` 표시를 사용합니다.',
      };
    case 'MANUAL_PRESET':
      return {
        effectiveRuleType,
        ...baseConstraints,
        effectiveQuantitySource: 'ONE',
        quantitySourceLocked: true,
        quantitySourceReason: '수동 프리셋은 빌더에서 1건씩 추가됩니다.',
      };
    case 'PICKUP_DROP':
    case 'CONDITIONAL':
    default:
      return {
        effectiveRuleType,
        ...baseConstraints,
      };
  }
}

export function getEffectiveRuleForm(ruleForm: RuleFormState): RuleFormState {
  const constraints = deriveRuleConstraints(ruleForm);
  const allowedConditionCategories = new Set(constraints.allowedConditionCategories);
  return {
    ...ruleForm,
    ruleType: constraints.effectiveRuleType,
    lodgingSelectionLevel: allowedConditionCategories.has('lodgingSelection') ? ruleForm.lodgingSelectionLevel : '',
    quantitySource: constraints.effectiveQuantitySource,
    chargeScope: constraints.effectiveChargeScope,
    personMode: constraints.effectivePersonMode,
  };
}

export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function getRuleAmountInputLabel(ruleForm: Pick<RuleFormState, 'chargeScope' | 'personMode'>): string {
  if (ruleForm.chargeScope === 'TEAM') {
    return '총액';
  }
  if (ruleForm.chargeScope === 'PER_PERSON') {
    if (ruleForm.personMode === 'PER_DAY') {
      return '1인 1일 단가';
    }
    if (ruleForm.personMode === 'PER_NIGHT') {
      return '1인 1박 단가';
    }
    return '1인 단가';
  }
  return '금액';
}

export function getRuleAmountInterpretation(ruleForm: RuleFormState): string {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  const constraints = deriveRuleConstraints(ruleForm);

  if (effectiveForm.ruleType === 'PERCENT_UPLIFT') {
    return '현재 금액 해석: 기본금의 정수 퍼센트입니다.';
  }

  const amountLabel = getRuleAmountInputLabel(effectiveForm);
  if (!effectiveForm.chargeScope) {
    if (constraints.displayLockedMessage) {
      return `현재 금액 해석: ${getPriceItemPresetLabel(ruleForm.priceItemPreset)} 항목 고정 표기를 사용합니다.`;
    }
    return '현재 금액 해석: 아직 미정이며, 표시 선택 단계에서 확정됩니다.';
  }
  if (constraints.displayLockedMessage) {
    return `현재 금액 해석: ${amountLabel} (${constraints.displayLockedMessage.replace(/[`]/g, '')})`;
  }
  return `현재 금액 해석: ${amountLabel}`;
}

export type PricingDisplayPreview = {
  label: string;
  example: string | null;
};

const krwFormatter = new Intl.NumberFormat('ko-KR');

function formatKrwAmount(value: number | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return `${krwFormatter.format(value)}원`;
}

export function getPricingDisplayPreview(
  rule: Pick<PricingRuleRow, 'priceItemPreset' | 'ruleType' | 'chargeScope' | 'personMode' | 'customDisplayText' | 'amountKrw'>,
): PricingDisplayPreview {
  const customDisplayText = rule.customDisplayText?.trim();
  if (customDisplayText) {
    return {
      label: '커스텀',
      example: customDisplayText,
    };
  }

  if (
    rule.priceItemPreset === 'BASE' ||
    rule.priceItemPreset === 'BASE_PERCENT' ||
    rule.priceItemPreset === 'LONG_DISTANCE'
  ) {
    return {
      label: 'X',
      example: null,
    };
  }

  const formattedAmount = formatKrwAmount(rule.amountKrw);
  if (rule.priceItemPreset === 'NIGHT_TRAIN') {
    return {
      label: '회당',
      example: formattedAmount ? `${formattedAmount} * n회` : null,
    };
  }
  if (rule.priceItemPreset === 'EXTRA_LODGING' || rule.priceItemPreset === 'LODGING_SELECTION') {
    return {
      label: '박당',
      example: formattedAmount ? `${formattedAmount} * n박` : null,
    };
  }
  if (rule.chargeScope === 'TEAM') {
    return {
      label: '팀당',
      example: formattedAmount ? `${formattedAmount} / n인` : null,
    };
  }

  if (rule.chargeScope === 'PER_PERSON') {
    if (rule.personMode === 'PER_DAY') {
      return {
        label: '일당',
        example: formattedAmount ? `${formattedAmount} * n일` : null,
      };
    }
    if (rule.personMode === 'PER_NIGHT') {
      return {
        label: '박당',
        example: formattedAmount ? `${formattedAmount} * n박` : null,
      };
    }
    return {
      label: '인당',
      example: formattedAmount ? `${formattedAmount} * 1` : null,
    };
  }

  return {
    label: '-',
    example: null,
  };
}

export function buildDateTime(value: string): string {
  return `${value}T00:00:00.000Z`;
}

export function formatDateRange(policy: PricingPolicyListRow): string {
  const start = toDateInputValue(policy.effectiveFrom) || '-';
  const end = toDateInputValue(policy.effectiveTo) || '무기한';
  return `${start} ~ ${end}`;
}

export function formatPolicyRef(policy: PricingPolicyListRow): string {
  return `「${policy.name}」 (ID: ${policy.id})`;
}

/** `effectiveTo` 미지정 정책을 계산 엔진과 같이 무기한 구간으로 둘 때 사용 */
const ACTIVE_POLICY_OPEN_END_MS = new Date('9999-12-31T00:00:00.000Z').getTime();

export function pricingPolicyInclusiveRangesOverlap(
  startMsA: number,
  endMsA: number,
  startMsB: number,
  endMsB: number,
): boolean {
  return startMsA <= endMsB && startMsB <= endMsA;
}

export function resolveStoredPolicyRangeMs(policy: PricingPolicyListRow): { startMs: number; endMs: number } {
  const startMs = new Date(policy.effectiveFrom).getTime();
  const endMs =
    policy.effectiveTo != null && String(policy.effectiveTo).trim() !== ''
      ? new Date(policy.effectiveTo).getTime()
      : ACTIVE_POLICY_OPEN_END_MS;
  return { startMs, endMs };
}

export function resolveDraftPolicyRangeMs(form: PolicyFormState): { startMs: number; endMs: number } | null {
  if (!form.effectiveFrom.trim()) {
    return null;
  }
  const startMs = new Date(buildDateTime(form.effectiveFrom)).getTime();
  const endMs = form.effectiveTo.trim() ? new Date(buildDateTime(form.effectiveTo)).getTime() : ACTIVE_POLICY_OPEN_END_MS;
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null;
  }
  if (endMs < startMs) {
    return null;
  }
  return { startMs, endMs };
}

export function getConditionCategorySummary(ruleForm: RuleFormState, category: ConditionCategoryKey): string | null {
  switch (category) {
    case 'headcountDays': {
      const parts: string[] = [];
      if (ruleForm.headcountMin.trim()) {
        parts.push(`인원 ${ruleForm.headcountMin}+`);
      }
      if (ruleForm.headcountMax.trim()) {
        parts.push(`인원 최대 ${ruleForm.headcountMax}`);
      }
      if (ruleForm.dayMin.trim()) {
        parts.push(`일수 ${ruleForm.dayMin}+`);
      }
      if (ruleForm.dayMax.trim()) {
        parts.push(`일수 최대 ${ruleForm.dayMax}`);
      }
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'travelDate':
      return ruleForm.travelDateFrom || ruleForm.travelDateTo
        ? `${ruleForm.travelDateFrom || '-'} ~ ${ruleForm.travelDateTo || '-'}`
        : null;
    case 'vehicle':
      return ruleForm.vehicleType.trim() || null;
    case 'variant':
      return ruleForm.variantTypes.length > 0 ? `${ruleForm.variantTypes.length}개 선택` : null;
    case 'flight': {
      const parts: string[] = [];
      if (ruleForm.flightInTimeBand) {
        parts.push(`IN ${ruleForm.flightInTimeBand}`);
      }
      if (ruleForm.flightOutTimeBand) {
        parts.push(`OUT ${ruleForm.flightOutTimeBand}`);
      }
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'pickupDrop': {
      const parts: string[] = [];
      if (ruleForm.pickupPlaceType) {
        parts.push(`픽업 ${ruleForm.pickupPlaceType}`);
      }
      if (ruleForm.dropPlaceType) {
        parts.push(`드랍 ${ruleForm.dropPlaceType}`);
      }
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'externalTransfer': {
      const parts: string[] = [];
      if (ruleForm.externalTransferMode) {
        parts.push(ruleForm.externalTransferMode);
      }
      if (ruleForm.externalTransferMinCount.trim()) {
        parts.push(`최소 ${ruleForm.externalTransferMinCount}건`);
      }
      if (ruleForm.externalTransferPresetCodes.length > 0) {
        parts.push(`프리셋 ${ruleForm.externalTransferPresetCodes.length}개`);
      }
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'lodgingSelection':
      return ruleForm.lodgingSelectionLevel || null;
    default:
      return null;
  }
}

export function getActiveConditionCategories(ruleForm: RuleFormState): ConditionCategoryKey[] {
  const categories: ConditionCategoryKey[] = [
    'headcountDays',
    'travelDate',
    'vehicle',
    'variant',
    'flight',
    'pickupDrop',
    'externalTransfer',
    'lodgingSelection',
  ];
  return categories.filter((category) => getConditionCategorySummary(ruleForm, category) !== null);
}

export function getAllowedConditionCategories(ruleForm: RuleFormState): ConditionCategoryKey[] {
  return PRICE_ITEM_ALLOWED_CONDITION_CATEGORIES[ruleForm.priceItemPreset];
}

export function clearConditionCategory(ruleForm: RuleFormState, category: ConditionCategoryKey): RuleFormState {
  switch (category) {
    case 'headcountDays':
      return {
        ...ruleForm,
        headcountMin: '',
        headcountMax: '',
        dayMin: '',
        dayMax: '',
      };
    case 'travelDate':
      return {
        ...ruleForm,
        travelDateFrom: '',
        travelDateTo: '',
      };
    case 'vehicle':
      return {
        ...ruleForm,
        vehicleType: '',
      };
    case 'variant':
      return {
        ...ruleForm,
        variantTypes: [],
      };
    case 'flight':
      return {
        ...ruleForm,
        flightInTimeBand: '',
        flightOutTimeBand: '',
      };
    case 'pickupDrop':
      return {
        ...ruleForm,
        pickupPlaceType: '',
        dropPlaceType: '',
      };
    case 'externalTransfer':
      return {
        ...ruleForm,
        externalTransferMode: '',
        externalTransferMinCount: '',
        externalTransferPresetCodes: [],
      };
    case 'lodgingSelection':
      return {
        ...ruleForm,
        lodgingSelectionLevel: '',
      };
    default:
      return ruleForm;
  }
}

export function sanitizeRuleFormByPreset(ruleForm: RuleFormState): RuleFormState {
  const allowedCategories = new Set(getAllowedConditionCategories(ruleForm));
  let nextForm = { ...ruleForm };
  (
    [
      'headcountDays',
      'travelDate',
      'vehicle',
      'variant',
      'flight',
      'pickupDrop',
      'externalTransfer',
      'lodgingSelection',
    ] as ConditionCategoryKey[]
  ).forEach((category) => {
    if (!allowedCategories.has(category)) {
      nextForm = clearConditionCategory(nextForm, category);
    }
  });
  return nextForm;
}

export function validateRuleFormStep(ruleForm: RuleFormState, step: RuleFormStep): string | null {
  const effectiveForm = getEffectiveRuleForm(sanitizeRuleFormByPreset(ruleForm));
  if (step === 'BASICS') {
    if (!effectiveForm.title.trim()) {
      return '규칙 제목을 입력해 주세요.';
    }
    if (effectiveForm.ruleType !== 'PERCENT_UPLIFT' && parseOptionalInt(effectiveForm.amountKrw) == null) {
      return '가격 항목은 정수 금액이 필요합니다.';
    }
    if (effectiveForm.ruleType === 'PERCENT_UPLIFT' && parseOptionalInt(effectiveForm.percentText) == null) {
      return '퍼센트 항목은 정수 퍼센트가 필요합니다.';
    }
  }
  if (step === 'CONDITIONS' && ruleForm.priceItemPreset === 'LODGING_SELECTION' && !effectiveForm.lodgingSelectionLevel) {
    return '숙소 업그레이드 항목은 등급을 선택해 주세요.';
  }
  return null;
}

/**
 * ACTIVE로 저장할 때, 기간이 하루 이상 겹치는 다른 ACTIVE 정책을 찾습니다 (편집 중인 건 제외).
 * 엔진은 겹치면 우선순위로 하나만 쓰므로 설정 실수를 UI에서 막습니다.
 */
export function findOverlappingActivePolicies(
  policies: PricingPolicyListRow[],
  draft: PolicyFormState,
  excludePolicyId: string | null,
): PricingPolicyListRow[] {
  if (draft.status !== 'ACTIVE') {
    return [];
  }
  const draftRange = resolveDraftPolicyRangeMs(draft);
  if (!draftRange) {
    return [];
  }

  return policies.filter((p) => {
    if (p.status !== 'ACTIVE') {
      return false;
    }
    if (excludePolicyId && p.id === excludePolicyId) {
      return false;
    }
    const pr = resolveStoredPolicyRangeMs(p);
    return pricingPolicyInclusiveRangesOverlap(draftRange.startMs, draftRange.endMs, pr.startMs, pr.endMs);
  });
}

export function validateRuleForm(ruleForm: RuleFormState): string | null {
  const effectiveForm = getEffectiveRuleForm(sanitizeRuleFormByPreset(ruleForm));

  if (!effectiveForm.title.trim()) {
    return '규칙 제목을 입력해 주세요.';
  }
  const amountLabel = getRuleAmountInputLabel(effectiveForm);
  if (effectiveForm.ruleType !== 'PERCENT_UPLIFT' && parseOptionalInt(effectiveForm.amountKrw) == null) {
    return `${amountLabel} 항목은 정수 금액이 필요합니다.`;
  }
  if (effectiveForm.ruleType === 'PERCENT_UPLIFT' && parseOptionalInt(effectiveForm.percentText) == null) {
    return '퍼센트 항목은 정수 퍼센트가 필요합니다.';
  }
  if (effectiveForm.quantitySource === 'LONG_DISTANCE_SEGMENT_COUNT' && effectiveForm.ruleType !== 'LONG_DISTANCE') {
    return '장거리 구간 수 기준은 `장거리 기본금` 규칙에서만 사용할 수 있습니다.';
  }
  if (effectiveForm.quantitySource === 'NIGHT_TRAIN_BLOCK_COUNT' && effectiveForm.ruleType !== 'CONDITIONAL_ADDON') {
    return '야간열차 운행 수 기준은 `조건부 추가/할인` 규칙에서만 사용할 수 있습니다.';
  }
  if (effectiveForm.lodgingSelectionLevel && effectiveForm.ruleType !== 'CONDITIONAL_ADDON') {
    return '숙소 업그레이드 등급은 `조건부 추가/할인` 규칙에서만 사용할 수 있습니다.';
  }
  if (effectiveForm.lodgingSelectionLevel && effectiveForm.quantitySource !== 'ONE') {
    return '숙소 업그레이드 규칙은 수량 기준을 `1회 고정`으로 유지해야 합니다.';
  }
  if (effectiveForm.lodgingSelectionLevel && effectiveForm.chargeScope !== 'PER_PERSON') {
    return '숙소 업그레이드 규칙은 표시 기준이 `인당/일/박`이어야 합니다.';
  }
  if (effectiveForm.lodgingSelectionLevel && effectiveForm.personMode !== 'PER_NIGHT') {
    return '숙소 업그레이드 규칙은 표시 기준이 `박 복수`여야 합니다.';
  }
  if (effectiveForm.priceItemPreset === 'LODGING_SELECTION' && !effectiveForm.lodgingSelectionLevel) {
    return '숙소 업그레이드 항목은 등급 선택이 필요합니다.';
  }
  return null;
}

/** create/updatePricingRule 공통 input 본문 (policyId는 create 시에만 상위에서 붙임) */
export function buildRuleMutationBody(ruleForm: RuleFormState) {
  const effectiveForm = getEffectiveRuleForm(sanitizeRuleFormByPreset(ruleForm));
  const lodgingSelectionLevel = effectiveForm.lodgingSelectionLevel || null;
  return {
    priceItemPreset: effectiveForm.priceItemPreset,
    ruleType: effectiveForm.ruleType,
    title: effectiveForm.title.trim(),
    amountKrw: effectiveForm.ruleType === 'PERCENT_UPLIFT' ? null : parseOptionalInt(effectiveForm.amountKrw),
    percentBps: effectiveForm.ruleType === 'PERCENT_UPLIFT' ? Number(effectiveForm.percentText || '0') * 100 : null,
    quantitySource: effectiveForm.quantitySource,
    lodgingSelectionLevel,
    headcountMin: parseOptionalInt(effectiveForm.headcountMin),
    headcountMax: parseOptionalInt(effectiveForm.headcountMax),
    dayMin: parseOptionalInt(effectiveForm.dayMin),
    dayMax: parseOptionalInt(effectiveForm.dayMax),
    travelDateFrom: effectiveForm.travelDateFrom ? buildDateTime(effectiveForm.travelDateFrom) : null,
    travelDateTo: effectiveForm.travelDateTo ? buildDateTime(effectiveForm.travelDateTo) : null,
    vehicleType: effectiveForm.vehicleType.trim() || null,
    variantTypes: effectiveForm.variantTypes,
    flightInTimeBand: effectiveForm.flightInTimeBand || null,
    flightOutTimeBand: effectiveForm.flightOutTimeBand || null,
    pickupPlaceType: effectiveForm.pickupPlaceType || null,
    dropPlaceType: effectiveForm.dropPlaceType || null,
    externalTransferMode: effectiveForm.externalTransferMode || null,
    externalTransferMinCount: parseOptionalInt(effectiveForm.externalTransferMinCount),
    externalTransferPresetCodes: effectiveForm.externalTransferPresetCodes,
    chargeScope: effectiveForm.ruleType === 'PERCENT_UPLIFT' ? null : effectiveForm.chargeScope || null,
    personMode:
      effectiveForm.ruleType !== 'PERCENT_UPLIFT' && effectiveForm.chargeScope === 'PER_PERSON'
        ? effectiveForm.personMode || null
        : null,
    customDisplayText:
      effectiveForm.ruleType === 'PERCENT_UPLIFT' ? null : effectiveForm.customDisplayText.trim() || null,
    isEnabled: effectiveForm.isEnabled,
    sortOrder: Number(effectiveForm.sortOrder || '0'),
  };
}
