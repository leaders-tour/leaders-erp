import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Input, SectionHeader, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';

const PRICING_POLICIES_QUERY = gql`
  query PricingPoliciesPage {
    pricingPolicies {
      id
      code
      name
      status
      effectiveFrom
      effectiveTo
      priority
      rules {
        id
        policyId
        ruleType
        title
        lineCode
        calcType
        targetLineCode
        amountKrw
        percentBps
        quantitySource
        headcountMin
        headcountMax
        dayMin
        dayMax
        travelDateFrom
        travelDateTo
        vehicleType
        variantTypes
        flightInTimeBand
        flightOutTimeBand
        pickupPlaceType
        dropPlaceType
        externalTransferMode
        externalTransferMinCount
        displayLabelOverride
        chargeScope
        personMode
        customDisplayText
        isEnabled
        sortOrder
      }
    }
  }
`;

const CREATE_POLICY_MUTATION = gql`
  mutation CreatePricingPolicy($input: PricingPolicyCreateInput!) {
    createPricingPolicy(input: $input) {
      id
    }
  }
`;

const UPDATE_POLICY_MUTATION = gql`
  mutation UpdatePricingPolicy($id: ID!, $input: PricingPolicyUpdateInput!) {
    updatePricingPolicy(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_POLICY_MUTATION = gql`
  mutation DeletePricingPolicy($id: ID!) {
    deletePricingPolicy(id: $id)
  }
`;

const DUPLICATE_POLICY_MUTATION = gql`
  mutation DuplicatePricingPolicy($id: ID!, $input: PricingPolicyDuplicateInput!) {
    duplicatePricingPolicy(id: $id, input: $input) {
      id
    }
  }
`;

const CREATE_RULE_MUTATION = gql`
  mutation CreatePricingRule($input: PricingRuleCreateInput!) {
    createPricingRule(input: $input) {
      id
    }
  }
`;

const UPDATE_RULE_MUTATION = gql`
  mutation UpdatePricingRule($id: ID!, $input: PricingRuleUpdateInput!) {
    updatePricingRule(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_RULE_MUTATION = gql`
  mutation DeletePricingRule($id: ID!) {
    deletePricingRule(id: $id)
  }
`;

type PricingPolicyStatus = 'ACTIVE' | 'INACTIVE';
type PricingRuleType = 'BASE' | 'PERCENT_UPLIFT' | 'CONDITIONAL_ADDON' | 'AUTO_EXCEPTION' | 'MANUAL';
type PricingQuantitySource = 'ONE' | 'HEADCOUNT' | 'TOTAL_DAYS' | 'LONG_DISTANCE_SEGMENT_COUNT' | 'SUM_EXTRA_LODGING_COUNTS';
type PricingChargeScope = 'TEAM' | 'PER_PERSON';
type PricingPersonMode = 'SINGLE' | 'PER_DAY' | 'PER_NIGHT';
type VariantTypeOption = 'Basic' | 'Early' | 'Extend' | 'EarlyExtend';
type PricingTimeBand = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
type PricingExternalTransferMode = 'ANY' | 'PICKUP_ONLY' | 'DROP_ONLY' | 'BOTH';
type PlaceType = 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';

interface PricingRuleRow {
  id: string;
  policyId: string;
  ruleType: PricingRuleType;
  title: string;
  lineCode: string;
  calcType: 'AMOUNT' | 'PERCENT_OF_LINE';
  targetLineCode?: string | null;
  amountKrw?: number | null;
  percentBps?: number | null;
  quantitySource: PricingQuantitySource;
  headcountMin?: number | null;
  headcountMax?: number | null;
  dayMin?: number | null;
  dayMax?: number | null;
  travelDateFrom?: string | null;
  travelDateTo?: string | null;
  vehicleType?: string | null;
  variantTypes: VariantTypeOption[];
  flightInTimeBand?: PricingTimeBand | null;
  flightOutTimeBand?: PricingTimeBand | null;
  pickupPlaceType?: PlaceType | null;
  dropPlaceType?: PlaceType | null;
  externalTransferMode?: PricingExternalTransferMode | null;
  externalTransferMinCount?: number | null;
  displayLabelOverride?: string | null;
  chargeScope?: PricingChargeScope | null;
  personMode?: PricingPersonMode | null;
  customDisplayText?: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

interface PricingPolicyRow {
  id: string;
  code: string;
  name: string;
  status: PricingPolicyStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  priority: number;
  rules: PricingRuleRow[];
}

interface PolicyFormState {
  code: string;
  name: string;
  status: PricingPolicyStatus;
  effectiveFrom: string;
  effectiveTo: string;
  priority: string;
}

interface RuleFormState {
  ruleType: PricingRuleType;
  title: string;
  amountKrw: string;
  percentText: string;
  quantitySource: PricingQuantitySource;
  headcountMin: string;
  headcountMax: string;
  dayMin: string;
  dayMax: string;
  travelDateFrom: string;
  travelDateTo: string;
  vehicleType: string;
  variantTypes: VariantTypeOption[];
  flightInTimeBand: '' | PricingTimeBand;
  flightOutTimeBand: '' | PricingTimeBand;
  pickupPlaceType: '' | PlaceType;
  dropPlaceType: '' | PlaceType;
  externalTransferMode: '' | PricingExternalTransferMode;
  externalTransferMinCount: string;
  displayLabelOverride: string;
  chargeScope: '' | PricingChargeScope;
  personMode: '' | PricingPersonMode;
  customDisplayText: string;
  isEnabled: boolean;
  sortOrder: string;
}

const RULE_TYPE_OPTIONS: Array<{ value: PricingRuleType; label: string }> = [
  { value: 'BASE', label: '기본금' },
  { value: 'PERCENT_UPLIFT', label: '기본금 퍼센트 추가' },
  { value: 'CONDITIONAL_ADDON', label: '조건부 추가/할인' },
];
const QUANTITY_SOURCE_OPTIONS: Array<{ value: PricingQuantitySource; label: string }> = [
  { value: 'ONE', label: '1회 고정' },
  { value: 'HEADCOUNT', label: '인원수' },
  { value: 'TOTAL_DAYS', label: '여행 일수' },
  { value: 'SUM_EXTRA_LODGING_COUNTS', label: '추가 숙박 수' },
];
const VARIANT_OPTIONS: VariantTypeOption[] = ['Basic', 'Early', 'Extend', 'EarlyExtend'];
const TIME_BAND_OPTIONS: Array<{ value: PricingTimeBand; label: string }> = [
  { value: 'DAWN', label: '새벽(00~04:59)' },
  { value: 'MORNING', label: '오전(05~11:59)' },
  { value: 'AFTERNOON', label: '오후(12~17:59)' },
  { value: 'EVENING', label: '저녁(18~21:59)' },
  { value: 'NIGHT', label: '심야(22~23:59)' },
];
const PLACE_TYPE_OPTIONS: Array<{ value: PlaceType; label: string }> = [
  { value: 'AIRPORT', label: '공항' },
  { value: 'OZ_HOUSE', label: '오즈하우스' },
  { value: 'ULAANBAATAR', label: '울란바토르' },
  { value: 'CUSTOM', label: '직접입력' },
];
const EXTERNAL_TRANSFER_MODE_OPTIONS: Array<{ value: PricingExternalTransferMode; label: string }> = [
  { value: 'ANY', label: '픽업/드랍 아무거나' },
  { value: 'PICKUP_ONLY', label: '픽업만' },
  { value: 'DROP_ONLY', label: '드랍만' },
  { value: 'BOTH', label: '픽업+드랍 모두' },
];

function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
}

function createEmptyPolicyForm(): PolicyFormState {
  return {
    code: '',
    name: '',
    status: 'ACTIVE',
    effectiveFrom: '',
    effectiveTo: '',
    priority: '0',
  };
}

function toPolicyForm(policy: PricingPolicyRow): PolicyFormState {
  return {
    code: policy.code,
    name: policy.name,
    status: policy.status,
    effectiveFrom: toDateInputValue(policy.effectiveFrom),
    effectiveTo: toDateInputValue(policy.effectiveTo),
    priority: String(policy.priority),
  };
}

function createEmptyRuleForm(): RuleFormState {
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
    displayLabelOverride: '',
    chargeScope: '',
    personMode: '',
    customDisplayText: '',
    isEnabled: true,
    sortOrder: '0',
  };
}

function toRuleForm(rule: PricingRuleRow): RuleFormState {
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
    displayLabelOverride: rule.displayLabelOverride ?? '',
    chargeScope: rule.chargeScope ?? '',
    personMode: rule.personMode ?? '',
    customDisplayText: rule.customDisplayText ?? '',
    isEnabled: rule.isEnabled,
    sortOrder: String(rule.sortOrder),
  };
}

function parseOptionalInt(value: string): number | null {
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

function buildDateTime(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function formatDateRange(policy: PricingPolicyRow): string {
  const start = toDateInputValue(policy.effectiveFrom) || '-';
  const end = toDateInputValue(policy.effectiveTo) || '무기한';
  return `${start} ~ ${end}`;
}

export function PricingPolicyPage(): JSX.Element {
  const { data, loading, refetch } = useQuery<{ pricingPolicies: PricingPolicyRow[] }>(PRICING_POLICIES_QUERY);
  const [createPolicy] = useMutation(CREATE_POLICY_MUTATION);
  const [updatePolicy] = useMutation(UPDATE_POLICY_MUTATION);
  const [deletePolicy] = useMutation(DELETE_POLICY_MUTATION);
  const [duplicatePolicy] = useMutation(DUPLICATE_POLICY_MUTATION);
  const [createRule] = useMutation(CREATE_RULE_MUTATION);
  const [updateRule] = useMutation(UPDATE_RULE_MUTATION);
  const [deleteRule] = useMutation(DELETE_RULE_MUTATION);

  const policies = useMemo(() => data?.pricingPolicies ?? [], [data]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<PolicyFormState>(createEmptyPolicyForm);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(createEmptyRuleForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId) ?? null;

  useEffect(() => {
    const firstPolicy = policies[0];
    if (!selectedPolicyId && firstPolicy) {
      setSelectedPolicyId(firstPolicy.id);
      setPolicyForm(toPolicyForm(firstPolicy));
    }
  }, [policies, selectedPolicyId]);

  useEffect(() => {
    if (selectedPolicy && editingPolicyId === selectedPolicy.id) {
      setPolicyForm(toPolicyForm(selectedPolicy));
    }
  }, [editingPolicyId, selectedPolicy]);

  const submitPolicy = async () => {
    if (!policyForm.code.trim() || !policyForm.name.trim() || !policyForm.effectiveFrom.trim()) {
      setErrorMessage('정책 코드, 이름, 시작일을 입력해 주세요.');
      return;
    }

    const input = {
      code: policyForm.code.trim(),
      name: policyForm.name.trim(),
      status: policyForm.status,
      effectiveFrom: buildDateTime(policyForm.effectiveFrom),
      effectiveTo: policyForm.effectiveTo ? buildDateTime(policyForm.effectiveTo) : null,
      priority: Number(policyForm.priority || '0'),
    };

    try {
      setErrorMessage(null);
      setMessage(null);
      if (editingPolicyId) {
        await updatePolicy({ variables: { id: editingPolicyId, input } });
        setMessage('가격 정책을 수정했습니다.');
      } else {
        const result = await createPolicy({ variables: { input } });
        setSelectedPolicyId(result.data?.createPricingPolicy?.id ?? selectedPolicyId);
        setEditingPolicyId(result.data?.createPricingPolicy?.id ?? null);
        setMessage('가격 정책을 생성했습니다.');
      }
      await refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '가격 정책 저장에 실패했습니다.');
    }
  };

  const submitRule = async () => {
    if (!selectedPolicy && !editingRuleId) {
      setErrorMessage('먼저 정책을 선택해 주세요.');
      return;
    }
    if (!ruleForm.title.trim()) {
      setErrorMessage('규칙 제목을 입력해 주세요.');
      return;
    }
    if (ruleForm.ruleType !== 'PERCENT_UPLIFT' && parseOptionalInt(ruleForm.amountKrw) == null) {
      setErrorMessage('금액 항목은 정수 금액이 필요합니다.');
      return;
    }
    if (ruleForm.ruleType === 'PERCENT_UPLIFT' && parseOptionalInt(ruleForm.percentText) == null) {
      setErrorMessage('퍼센트 항목은 정수 퍼센트가 필요합니다.');
      return;
    }

    const input = {
      ...(editingRuleId ? {} : { policyId: selectedPolicy?.id ?? '' }),
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
      displayLabelOverride: ruleForm.displayLabelOverride.trim() || null,
      chargeScope: ruleForm.ruleType === 'PERCENT_UPLIFT' ? null : ruleForm.chargeScope || null,
      personMode:
        ruleForm.ruleType !== 'PERCENT_UPLIFT' && ruleForm.chargeScope === 'PER_PERSON' ? ruleForm.personMode || null : null,
      customDisplayText: ruleForm.ruleType === 'PERCENT_UPLIFT' ? null : ruleForm.customDisplayText.trim() || null,
      isEnabled: ruleForm.isEnabled,
      sortOrder: Number(ruleForm.sortOrder || '0'),
    };

    try {
      setErrorMessage(null);
      setMessage(null);
      if (editingRuleId) {
        await updateRule({ variables: { id: editingRuleId, input } });
        setMessage('가격 규칙을 수정했습니다.');
      } else {
        await createRule({ variables: { input } });
        setMessage('가격 규칙을 생성했습니다.');
      }
      setEditingRuleId(null);
      setRuleForm(createEmptyRuleForm());
      await refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '가격 규칙 저장에 실패했습니다.');
    }
  };

  return (
    <section className="grid gap-6">
      <SectionHeader
        title="가격 정책"
        description="정책 기간/우선순위와 ruleType 기반 가격 규칙을 ERP에서 직접 관리합니다. 장거리 구간과 야간열차는 자동 계산 특례로 유지됩니다."
      />

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">정책 목록</h2>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPolicyId(null);
                setPolicyForm(createEmptyPolicyForm());
              }}
            >
              새 정책
            </Button>
          </div>

          {loading ? <p className="text-sm text-slate-500">정책 목록을 불러오는 중...</p> : null}

          <div className="grid gap-3">
            {policies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => {
                  setSelectedPolicyId(policy.id);
                  setEditingPolicyId(policy.id);
                  setEditingRuleId(null);
                  setPolicyForm(toPolicyForm(policy));
                  setRuleForm(createEmptyRuleForm());
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  policy.id === selectedPolicyId ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{policy.name}</div>
                    <div className={`mt-1 text-xs ${policy.id === selectedPolicyId ? 'text-slate-300' : 'text-slate-500'}`}>{policy.code}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${policy.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {policy.status === 'ACTIVE' ? '활성' : '비활성'}
                  </span>
                </div>
                <div className={`mt-3 text-xs ${policy.id === selectedPolicyId ? 'text-slate-300' : 'text-slate-500'}`}>
                  {formatDateRange(policy)} · 우선순위 {policy.priority} · 규칙 {policy.rules.length}개
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingPolicyId ? '정책 수정' : '정책 생성'}</h2>
                <p className="mt-1 text-xs text-slate-500">기간과 우선순위를 유지한 채 정책 단위를 관리합니다.</p>
              </div>
              {selectedPolicy ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        setErrorMessage(null);
                        const suffix = String(Date.now()).slice(-4);
                        await duplicatePolicy({
                          variables: {
                            id: selectedPolicy.id,
                            input: {
                              code: `${selectedPolicy.code}-COPY-${suffix}`,
                              name: `${selectedPolicy.name} 복제`,
                              effectiveFrom: selectedPolicy.effectiveFrom,
                              effectiveTo: selectedPolicy.effectiveTo,
                              priority: selectedPolicy.priority,
                              status: selectedPolicy.status,
                            },
                          },
                        });
                        setMessage('가격 정책을 복제했습니다.');
                        await refetch();
                      } catch (error) {
                        setErrorMessage(error instanceof Error ? error.message : '가격 정책 복제에 실패했습니다.');
                      }
                    }}
                  >
                    정책 복제
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!window.confirm('선택한 가격 정책을 삭제할까요?')) {
                        return;
                      }
                      try {
                        setErrorMessage(null);
                        await deletePolicy({ variables: { id: selectedPolicy.id } });
                        setMessage('가격 정책을 삭제했습니다.');
                        setSelectedPolicyId('');
                        setEditingPolicyId(null);
                        setPolicyForm(createEmptyPolicyForm());
                        await refetch();
                      } catch (error) {
                        setErrorMessage(error instanceof Error ? error.message : '가격 정책 삭제에 실패했습니다.');
                      }
                    }}
                  >
                    정책 삭제
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>정책 코드</span>
                <Input value={policyForm.code} onChange={(event) => setPolicyForm((prev) => ({ ...prev, code: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>정책명</span>
                <Input value={policyForm.name} onChange={(event) => setPolicyForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>상태</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={policyForm.status} onChange={(event) => setPolicyForm((prev) => ({ ...prev, status: event.target.value as PricingPolicyStatus }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>우선순위</span>
                <Input type="number" min={0} value={policyForm.priority} onChange={(event) => setPolicyForm((prev) => ({ ...prev, priority: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>시작일</span>
                <Input type="date" value={policyForm.effectiveFrom} onChange={(event) => setPolicyForm((prev) => ({ ...prev, effectiveFrom: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>종료일</span>
                <Input type="date" value={policyForm.effectiveTo} onChange={(event) => setPolicyForm((prev) => ({ ...prev, effectiveTo: event.target.value }))} />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPolicyForm(selectedPolicy ? toPolicyForm(selectedPolicy) : createEmptyPolicyForm())}>
                초기화
              </Button>
              <Button onClick={() => void submitPolicy()}>{editingPolicyId ? '정책 저장' : '정책 생성'}</Button>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingRuleId ? '규칙 수정' : '규칙 추가'}</h2>
                <p className="mt-1 text-xs text-slate-500">기술 코드 대신 ruleType, 제목, 조건, 금액 입력 중심으로 관리합니다.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRuleId(null);
                  setRuleForm(createEmptyRuleForm());
                }}
              >
                새 규칙
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span>규칙 분류</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ruleForm.ruleType} onChange={(event) => setRuleForm((prev) => ({ ...prev, ruleType: event.target.value as PricingRuleType }))}>
                  {RULE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span>제목</span>
                <Input value={ruleForm.title} onChange={(event) => setRuleForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="예: 하이에이스 추가금" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>수량 기준</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ruleForm.quantitySource} onChange={(event) => setRuleForm((prev) => ({ ...prev, quantitySource: event.target.value as PricingQuantitySource }))}>
                  {QUANTITY_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {ruleForm.ruleType === 'PERCENT_UPLIFT' ? (
                <label className="grid gap-1 text-sm">
                  <span>퍼센트</span>
                  <Input type="number" value={ruleForm.percentText} onChange={(event) => setRuleForm((prev) => ({ ...prev, percentText: event.target.value }))} placeholder="예: 5" />
                </label>
              ) : (
                <label className="grid gap-1 text-sm">
                  <span>금액</span>
                  <Input type="number" value={ruleForm.amountKrw} onChange={(event) => setRuleForm((prev) => ({ ...prev, amountKrw: event.target.value }))} placeholder="음수면 할인" />
                </label>
              )}
              <label className="grid gap-1 text-sm">
                <span>표시 라벨</span>
                <Input value={ruleForm.displayLabelOverride} onChange={(event) => setRuleForm((prev) => ({ ...prev, displayLabelOverride: event.target.value }))} placeholder="비워두면 제목 사용" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>정렬 순서</span>
                <Input type="number" min={0} value={ruleForm.sortOrder} onChange={(event) => setRuleForm((prev) => ({ ...prev, sortOrder: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>인원 최소</span>
                <Input type="number" min={0} value={ruleForm.headcountMin} onChange={(event) => setRuleForm((prev) => ({ ...prev, headcountMin: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>인원 최대</span>
                <Input type="number" min={0} value={ruleForm.headcountMax} onChange={(event) => setRuleForm((prev) => ({ ...prev, headcountMax: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>일수 최소</span>
                <Input type="number" min={1} value={ruleForm.dayMin} onChange={(event) => setRuleForm((prev) => ({ ...prev, dayMin: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>일수 최대</span>
                <Input type="number" min={1} value={ruleForm.dayMax} onChange={(event) => setRuleForm((prev) => ({ ...prev, dayMax: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>여행 시작일 조건 From</span>
                <Input type="date" value={ruleForm.travelDateFrom} onChange={(event) => setRuleForm((prev) => ({ ...prev, travelDateFrom: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>여행 시작일 조건 To</span>
                <Input type="date" value={ruleForm.travelDateTo} onChange={(event) => setRuleForm((prev) => ({ ...prev, travelDateTo: event.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>차량 조건</span>
                <Input value={ruleForm.vehicleType} onChange={(event) => setRuleForm((prev) => ({ ...prev, vehicleType: event.target.value }))} placeholder="예: 하이에이스 / 푸르공" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>항공 IN 시간대</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ruleForm.flightInTimeBand} onChange={(event) => setRuleForm((prev) => ({ ...prev, flightInTimeBand: event.target.value as '' | PricingTimeBand }))}>
                  <option value="">없음</option>
                  {TIME_BAND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>항공 OUT 시간대</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ruleForm.flightOutTimeBand} onChange={(event) => setRuleForm((prev) => ({ ...prev, flightOutTimeBand: event.target.value as '' | PricingTimeBand }))}>
                  <option value="">없음</option>
                  {TIME_BAND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>픽업 장소 조건</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ruleForm.pickupPlaceType} onChange={(event) => setRuleForm((prev) => ({ ...prev, pickupPlaceType: event.target.value as '' | PlaceType }))}>
                  <option value="">없음</option>
                  {PLACE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>드랍 장소 조건</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ruleForm.dropPlaceType} onChange={(event) => setRuleForm((prev) => ({ ...prev, dropPlaceType: event.target.value as '' | PlaceType }))}>
                  <option value="">없음</option>
                  {PLACE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>실투어외 픽드랍 조건</span>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={ruleForm.externalTransferMode} onChange={(event) => setRuleForm((prev) => ({ ...prev, externalTransferMode: event.target.value as '' | PricingExternalTransferMode }))}>
                  <option value="">없음</option>
                  {EXTERNAL_TRANSFER_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>실투어외 픽드랍 최소 건수</span>
                <Input type="number" min={1} value={ruleForm.externalTransferMinCount} onChange={(event) => setRuleForm((prev) => ({ ...prev, externalTransferMinCount: event.target.value }))} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">표시 기준</div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={ruleForm.chargeScope === 'TEAM' ? 'default' : 'outline'} onClick={() => setRuleForm((prev) => ({ ...prev, chargeScope: 'TEAM', personMode: '' }))}>
                    팀당
                  </Button>
                  <Button type="button" variant={ruleForm.chargeScope === 'PER_PERSON' ? 'default' : 'outline'} onClick={() => setRuleForm((prev) => ({ ...prev, chargeScope: 'PER_PERSON', personMode: prev.personMode || 'SINGLE' }))}>
                    인당/일/박
                  </Button>
                </div>
                {ruleForm.chargeScope === 'PER_PERSON' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={ruleForm.personMode === 'SINGLE' ? 'default' : 'outline'} onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'SINGLE' }))}>
                      1인 단수
                    </Button>
                    <Button type="button" variant={ruleForm.personMode === 'PER_DAY' ? 'default' : 'outline'} onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'PER_DAY' }))}>
                      일 복수
                    </Button>
                    <Button type="button" variant={ruleForm.personMode === 'PER_NIGHT' ? 'default' : 'outline'} onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'PER_NIGHT' }))}>
                      박 복수
                    </Button>
                  </div>
                ) : null}
                <label className="grid gap-1 text-sm">
                  <span>커스텀 오른쪽 표기</span>
                  <Input value={ruleForm.customDisplayText} onChange={(event) => setRuleForm((prev) => ({ ...prev, customDisplayText: event.target.value }))} placeholder="비워두면 팀당/인당/일/박 규칙으로 표시" />
                </label>
              </div>

              <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">적용 Variant</div>
                <div className="flex flex-wrap gap-2">
                  {VARIANT_OPTIONS.map((variant) => {
                    const active = ruleForm.variantTypes.includes(variant);
                    return (
                      <Button
                        key={variant}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        onClick={() =>
                          setRuleForm((prev) => ({
                            ...prev,
                            variantTypes: active ? prev.variantTypes.filter((item) => item !== variant) : [...prev.variantTypes, variant],
                          }))
                        }
                      >
                        {variant}
                      </Button>
                    );
                  })}
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={ruleForm.isEnabled} onChange={(event) => setRuleForm((prev) => ({ ...prev, isEnabled: event.target.checked }))} />
                  규칙 활성화
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRuleForm(createEmptyRuleForm())}>
                초기화
              </Button>
              <Button onClick={() => void submitRule()} disabled={!selectedPolicy && !editingRuleId}>
                {editingRuleId ? '규칙 저장' : '규칙 추가'}
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">규칙 목록</h2>
                <p className="mt-1 text-xs text-slate-500">선택한 정책의 ruleType, 제목, 계산 조건을 확인합니다.</p>
              </div>
            </div>

            {!selectedPolicy ? <p className="text-sm text-slate-500">정책을 선택하면 규칙 목록이 표시됩니다.</p> : null}

            {selectedPolicy ? (
              <div className="overflow-auto">
                <Table className="min-w-[1100px] text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>분류 / 제목</Th>
                      <Th>계산</Th>
                      <Th>표시 기준</Th>
                      <Th>조건</Th>
                      <Th>정렬</Th>
                      <Th>상태</Th>
                      <Th>작업</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPolicy.rules.map((rule) => (
                      <tr key={rule.id} className="border-t border-slate-200">
                        <Td>{`${rule.ruleType} · ${rule.title}`}</Td>
                        <Td>{rule.ruleType === 'PERCENT_UPLIFT' ? `기본금의 ${(rule.percentBps ?? 0) / 100}%` : `${rule.amountKrw ?? 0}원 / ${rule.quantitySource}`}</Td>
                        <Td>
                          {rule.customDisplayText
                            ? `커스텀: ${rule.customDisplayText}`
                            : rule.chargeScope === 'TEAM'
                              ? '팀당'
                              : rule.chargeScope === 'PER_PERSON'
                                ? rule.personMode || '인당'
                                : '-'}
                        </Td>
                        <Td>
                          {[
                            rule.headcountMin ? `인원 ${rule.headcountMin}+` : null,
                            rule.headcountMax ? `인원 ~${rule.headcountMax}` : null,
                            rule.dayMin ? `일수 ${rule.dayMin}+` : null,
                            rule.dayMax ? `일수 ~${rule.dayMax}` : null,
                            rule.vehicleType ? `차량 ${rule.vehicleType}` : null,
                            rule.travelDateFrom ? `기간 ${toDateInputValue(rule.travelDateFrom)}~` : null,
                            rule.travelDateTo ? `기간 ~${toDateInputValue(rule.travelDateTo)}` : null,
                            rule.flightInTimeBand ? `IN ${rule.flightInTimeBand}` : null,
                            rule.flightOutTimeBand ? `OUT ${rule.flightOutTimeBand}` : null,
                            rule.pickupPlaceType ? `픽업 ${rule.pickupPlaceType}` : null,
                            rule.dropPlaceType ? `드랍 ${rule.dropPlaceType}` : null,
                            rule.externalTransferMode ? `실투외 ${rule.externalTransferMode}` : null,
                          ]
                            .filter(Boolean)
                            .join(' / ') || '-'}
                        </Td>
                        <Td>{rule.sortOrder}</Td>
                        <Td>{rule.isEnabled ? '활성' : '비활성'}</Td>
                        <Td>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingRuleId(rule.id);
                                setRuleForm(toRuleForm(rule));
                              }}
                            >
                              수정
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={async () => {
                                if (!window.confirm('선택한 규칙을 삭제할까요?')) {
                                  return;
                                }
                                try {
                                  setErrorMessage(null);
                                  await deleteRule({ variables: { id: rule.id } });
                                  setMessage('가격 규칙을 삭제했습니다.');
                                  await refetch();
                                } catch (error) {
                                  setErrorMessage(error instanceof Error ? error.message : '가격 규칙 삭제에 실패했습니다.');
                                }
                              }}
                            >
                              삭제
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </section>
  );
}
