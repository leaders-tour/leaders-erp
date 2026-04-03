import type { PolicyFormState, PricingPolicyListRow, PricingRuleRow, RuleFormState } from './types';

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
    ruleType: 'BASE',
    title: '',
    amountKrw: '',
    percentText: '',
    quantitySource: 'ONE',
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

export function toRuleForm(rule: PricingRuleRow): RuleFormState {
  return {
    ruleType: rule.ruleType,
    title: rule.title,
    amountKrw: rule.amountKrw != null ? String(rule.amountKrw) : '',
    percentText: rule.percentBps != null ? String(rule.percentBps / 100) : '',
    quantitySource: rule.quantitySource,
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
  if (!ruleForm.title.trim()) {
    return '규칙 제목을 입력해 주세요.';
  }
  const amountLabel = getRuleAmountInputLabel(ruleForm);
  if (ruleForm.ruleType !== 'PERCENT_UPLIFT' && parseOptionalInt(ruleForm.amountKrw) == null) {
    return `${amountLabel} 항목은 정수 금액이 필요합니다.`;
  }
  if (ruleForm.ruleType === 'PERCENT_UPLIFT' && parseOptionalInt(ruleForm.percentText) == null) {
    return '퍼센트 항목은 정수 퍼센트가 필요합니다.';
  }
  if (
    ruleForm.ruleType !== 'CONDITIONAL_ADDON' &&
    (ruleForm.quantitySource === 'LONG_DISTANCE_SEGMENT_COUNT' || ruleForm.quantitySource === 'NIGHT_TRAIN_BLOCK_COUNT')
  ) {
    return '장거리/야간열차 횟수 기준은 `조건부 추가/할인` 규칙에서만 사용할 수 있습니다.';
  }
  return null;
}

/** create/updatePricingRule 공통 input 본문 (policyId는 create 시에만 상위에서 붙임) */
export function buildRuleMutationBody(ruleForm: RuleFormState) {
  return {
    ruleType: ruleForm.ruleType,
    title: ruleForm.title.trim(),
    amountKrw: ruleForm.ruleType === 'PERCENT_UPLIFT' ? null : parseOptionalInt(ruleForm.amountKrw),
    percentBps: ruleForm.ruleType === 'PERCENT_UPLIFT' ? Number(ruleForm.percentText || '0') * 100 : null,
    quantitySource: ruleForm.quantitySource,
    headcountMin: parseOptionalInt(ruleForm.headcountMin),
    headcountMax: parseOptionalInt(ruleForm.headcountMax),
    dayMin: parseOptionalInt(ruleForm.dayMin),
    dayMax: parseOptionalInt(ruleForm.dayMax),
    travelDateFrom: ruleForm.travelDateFrom ? buildDateTime(ruleForm.travelDateFrom) : null,
    travelDateTo: ruleForm.travelDateTo ? buildDateTime(ruleForm.travelDateTo) : null,
    vehicleType: ruleForm.vehicleType.trim() || null,
    variantTypes: ruleForm.variantTypes,
    flightInTimeBand: ruleForm.flightInTimeBand || null,
    flightOutTimeBand: ruleForm.flightOutTimeBand || null,
    pickupPlaceType: ruleForm.pickupPlaceType || null,
    dropPlaceType: ruleForm.dropPlaceType || null,
    externalTransferMode: ruleForm.externalTransferMode || null,
    externalTransferMinCount: parseOptionalInt(ruleForm.externalTransferMinCount),
    externalTransferPresetCodes: ruleForm.externalTransferPresetCodes,
    chargeScope: ruleForm.ruleType === 'PERCENT_UPLIFT' ? null : ruleForm.chargeScope || null,
    personMode:
      ruleForm.ruleType !== 'PERCENT_UPLIFT' && ruleForm.chargeScope === 'PER_PERSON' ? ruleForm.personMode || null : null,
    customDisplayText: ruleForm.ruleType === 'PERCENT_UPLIFT' ? null : ruleForm.customDisplayText.trim() || null,
    isEnabled: ruleForm.isEnabled,
    sortOrder: Number(ruleForm.sortOrder || '0'),
  };
}
