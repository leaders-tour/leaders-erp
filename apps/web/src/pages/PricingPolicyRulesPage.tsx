import { useMutation, useQuery } from '@apollo/client';
import { Button, Card, SectionHeader } from '@tour/ui';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RULE_FORM_STEP_OPTIONS } from '../features/pricing-policy-admin/constants';
import { PricingRuleFormFields } from '../features/pricing-policy-admin/PricingRuleFormFields';
import { PricingRulesTable } from '../features/pricing-policy-admin/PricingRulesTable';
import {
  CREATE_RULE_MUTATION,
  DELETE_RULE_MUTATION,
  PRICING_POLICY_WITH_RULES_QUERY,
  UPDATE_RULE_MUTATION,
} from '../features/pricing-policy-admin/graphql';
import type {
  ConditionCategoryKey,
  PricingPolicyDetailRow,
  PricingPriceItemGroup,
  PricingRuleRow,
  RuleFormState,
  RuleFormStep,
  RuleFormStepOption,
} from '../features/pricing-policy-admin/types';
import {
  buildRuleMutationBody,
  createEmptyRuleFormForGroup,
  getDefaultOpenConditionCategories,
  toRuleForm,
  validateRuleForm,
  validateRuleFormStep,
} from '../features/pricing-policy-admin/utils';

const ADD_RULE_MODAL_COPY: Record<PricingPriceItemGroup, { title: string; description: string }> = {
  BASE: {
    title: '기본금 규칙 추가',
    description: '기본 계산에 포함되는 항목만 선택하도록 분리된 모달입니다.',
  },
  AUTO: {
    title: '자동 규칙 추가',
    description: '자동 계산 항목만 선택하도록 분리된 모달입니다.',
  },
  CONDITION: {
    title: '조건 규칙 추가',
    description: '일반 조건 조합형 규칙만 선택하도록 분리된 모달입니다.',
  },
  MANUAL: {
    title: '수동 규칙 추가',
    description: '일정빌더에서 수동 추가하는 항목만 선택하도록 분리된 모달입니다.',
  },
};

const RULE_FORM_STEP_OPTIONS_WITHOUT_CONDITIONS: RuleFormStepOption[] = [
  { value: 'BASICS', label: '1. 기본 정보', description: '가격 항목, 가격, 수량, 제목을 설정합니다.' },
  { value: 'DISPLAY', label: '2. 표시 선택', description: '표시 기준과 수동 프리셋 표기를 결정합니다.' },
];

const RULE_FORM_STEP_OPTIONS_WITHOUT_DISPLAY: RuleFormStepOption[] = [
  { value: 'BASICS', label: '1. 기본 정보', description: '가격 항목, 가격, 수량, 제목을 설정합니다.' },
  { value: 'CONDITIONS', label: '2. 조건 선택', description: '가격 항목에 맞는 조건만 골라 입력합니다.' },
];

function getVisibleRuleStepOptions(ruleForm: RuleFormState): RuleFormStepOption[] {
  if (ruleForm.priceItemPreset === 'MANUAL_PRESET') {
    return [];
  }
  if (
    ruleForm.priceItemPreset === 'BASE' ||
    ruleForm.priceItemPreset === 'BASE_PERCENT' ||
    ruleForm.priceItemPreset === 'LONG_DISTANCE'
  ) {
    return RULE_FORM_STEP_OPTIONS_WITHOUT_DISPLAY;
  }
  return RULE_FORM_STEP_OPTIONS;
}

export function PricingPolicyRulesPage(): JSX.Element {
  const { policyId = '' } = useParams<{ policyId: string }>();
  const { data, loading, refetch } = useQuery<{ pricingPolicy: PricingPolicyDetailRow | null }>(PRICING_POLICY_WITH_RULES_QUERY, {
    variables: { id: policyId },
    skip: !policyId,
  });
  const [createRule] = useMutation(CREATE_RULE_MUTATION);
  const [updateRule] = useMutation(UPDATE_RULE_MUTATION);
  const [deleteRule] = useMutation(DELETE_RULE_MUTATION);

  const policy = data?.pricingPolicy ?? null;
  const [addingRuleGroup, setAddingRuleGroup] = useState<PricingPriceItemGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PricingPriceItemGroup>('BASE');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(() => createEmptyRuleFormForGroup('BASE'));
  const [currentRuleStep, setCurrentRuleStep] = useState<RuleFormStep>('BASICS');
  const [openConditionCategories, setOpenConditionCategories] = useState<ConditionCategoryKey[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ruleBeingEdited = policy && editingRuleId ? policy.rules.find((r) => r.id === editingRuleId) ?? null : null;
  const isRuleModalOpen = addingRuleGroup !== null || editingRuleId !== null;
  const visibleRuleSteps = getVisibleRuleStepOptions(ruleForm);
  const currentStepIndex = visibleRuleSteps.findIndex((step) => step.value === currentRuleStep);
  const isLastVisibleStep = currentStepIndex === visibleRuleSteps.length - 1;

  const closeRuleModal = useCallback(() => {
    setAddingRuleGroup(null);
    setEditingRuleId(null);
    setRuleForm(createEmptyRuleFormForGroup('BASE'));
    setCurrentRuleStep('BASICS');
    setOpenConditionCategories([]);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!isRuleModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRuleModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRuleModalOpen, closeRuleModal]);

  useEffect(() => {
    if (visibleRuleSteps.length === 0) {
      return;
    }
    if (currentStepIndex >= 0) {
      return;
    }
    setCurrentRuleStep(visibleRuleSteps[0]?.value ?? 'BASICS');
  }, [currentStepIndex, visibleRuleSteps]);

  const openAddModal = (group: PricingPriceItemGroup) => {
    const nextRuleForm = createEmptyRuleFormForGroup(group);
    setMessage(null);
    setErrorMessage(null);
    setAddingRuleGroup(group);
    setEditingRuleId(null);
    setRuleForm(nextRuleForm);
    setCurrentRuleStep('BASICS');
    setOpenConditionCategories(getDefaultOpenConditionCategories(nextRuleForm));
  };

  const openEditModal = (rule: PricingRuleRow) => {
    const nextRuleForm = toRuleForm(rule);
    setMessage(null);
    setErrorMessage(null);
    setAddingRuleGroup(null);
    setEditingRuleId(rule.id);
    setRuleForm(nextRuleForm);
    setCurrentRuleStep('BASICS');
    setOpenConditionCategories(getDefaultOpenConditionCategories(nextRuleForm));
  };

  const handleNextStep = () => {
    const stepError = validateRuleFormStep(ruleForm, currentRuleStep);
    if (stepError) {
      setErrorMessage(stepError);
      return;
    }
    setErrorMessage(null);
    const nextStep = visibleRuleSteps[currentStepIndex + 1];
    if (nextStep) {
      setCurrentRuleStep(nextStep.value);
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    const prevStep = visibleRuleSteps[currentStepIndex - 1];
    if (prevStep) {
      setCurrentRuleStep(prevStep.value);
    }
  };

  const submitRule = async () => {
    if (!policy) {
      setErrorMessage('정책을 불러오지 못했습니다.');
      return;
    }
    const validationError = validateRuleForm(ruleForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const body = buildRuleMutationBody(ruleForm);

    try {
      setErrorMessage(null);
      setMessage(null);
      if (editingRuleId) {
        await updateRule({ variables: { id: editingRuleId, input: body } });
        setMessage('가격 규칙을 수정했습니다.');
      } else {
        await createRule({ variables: { input: { policyId: policy.id, ...body } } });
        setMessage('가격 규칙을 생성했습니다.');
      }
      await refetch();
      closeRuleModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '가격 규칙 저장에 실패했습니다.');
    }
  };

  const handleDeleteRule = async (rule: PricingRuleRow) => {
    if (!window.confirm('선택한 규칙을 삭제할까요?')) {
      return;
    }
    try {
      setErrorMessage(null);
      await deleteRule({ variables: { id: rule.id } });
      setMessage('가격 규칙을 삭제했습니다.');
      if (editingRuleId === rule.id) {
        closeRuleModal();
      }
      await refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '가격 규칙 삭제에 실패했습니다.');
    }
  };

  if (!policyId) {
    return (
      <section className="grid gap-4">
        <p className="text-sm text-rose-700">정책 ID가 없습니다.</p>
        <Link to="/admin/pricing-policies" className="text-sm text-slate-600 underline">
          정책 목록으로
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin/pricing-policies" className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline">
            ← 가격 정책 목록
          </Link>
          <SectionHeader
            title={policy ? `${policy.name} · 규칙` : '가격 규칙'}
            description={
              policy
                ? '가격 항목·제목·조건·금액을 관리합니다. 주요 항목은 전용 preset으로 만들고, 일반 규칙은 `조건부`, 일정빌더 수동 항목은 `수동`으로 관리합니다.'
                : '정책을 불러오는 중…'
            }
          />
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {errorMessage && !isRuleModalOpen ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}

      {loading ? <p className="text-sm text-slate-500">불러오는 중…</p> : null}

      {!loading && !policy ? (
        <p className="text-sm text-slate-600">
          해당 정책을 찾을 수 없습니다.{' '}
          <Link to="/admin/pricing-policies" className="underline">
            목록으로 돌아가기
          </Link>
        </p>
      ) : null}

      {policy ? (
        <Card className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">규칙 목록</h2>
              <p className="mt-1 text-xs text-slate-500">선택한 그룹 기준으로 규칙을 확인하고, 표 우측 상단 버튼으로 해당 그룹 규칙을 바로 추가합니다.</p>
            </div>
          </div>

          <PricingRulesTable
            rules={policy.rules}
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            onAddGroup={openAddModal}
            onEdit={openEditModal}
            onDelete={(rule) => void handleDeleteRule(rule)}
          />
        </Card>
      ) : null}

      {addingRuleGroup && policy ? (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={closeRuleModal} aria-hidden="true" />
          <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-none">
              <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{ADD_RULE_MODAL_COPY[addingRuleGroup].title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{ADD_RULE_MODAL_COPY[addingRuleGroup].description}</p>
                  </div>
                  <Button variant="outline" onClick={closeRuleModal}>
                    닫기
                  </Button>
                </div>

                {errorMessage ? <p className="mt-4 text-sm text-rose-700">{errorMessage}</p> : null}

                {visibleRuleSteps.length > 0 ? (
                  <div className={`mt-5 grid gap-3 ${visibleRuleSteps.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                    {visibleRuleSteps.map((step, index) => {
                      const isActive = currentRuleStep === step.value;
                      const isDone = currentStepIndex > index;
                      return (
                        <button
                          key={step.value}
                          type="button"
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : isDone
                                ? 'border-slate-300 bg-slate-50 text-slate-700'
                                : 'border-slate-200 bg-white text-slate-500'
                          }`}
                          onClick={() => setCurrentRuleStep(step.value)}
                        >
                          <div className="text-sm font-semibold">{step.label}</div>
                          <div className={`mt-1 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{step.description}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-5 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
                  <PricingRuleFormFields
                    ruleForm={ruleForm}
                    setRuleForm={setRuleForm}
                    currentStep={currentRuleStep}
                    openConditionCategories={openConditionCategories}
                    setOpenConditionCategories={setOpenConditionCategories}
                    lockedGroup={addingRuleGroup}
                  />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const nextRuleForm = createEmptyRuleFormForGroup(addingRuleGroup);
                      setRuleForm(nextRuleForm);
                      setCurrentRuleStep('BASICS');
                      setOpenConditionCategories(getDefaultOpenConditionCategories(nextRuleForm));
                    }}
                  >
                    초기화
                  </Button>
                  {visibleRuleSteps.length > 0 && currentRuleStep !== 'BASICS' ? (
                    <Button variant="outline" onClick={handlePrevStep}>
                      이전
                    </Button>
                  ) : null}
                  {visibleRuleSteps.length === 0 || isLastVisibleStep ? (
                    <Button onClick={() => void submitRule()}>규칙 추가</Button>
                  ) : (
                    <Button onClick={handleNextStep}>다음</Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}

      {editingRuleId && policy ? (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={closeRuleModal} aria-hidden="true" />
          <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-none">
              <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">규칙 수정</h2>
                    <p className="mt-1 text-xs text-slate-500">기존 규칙을 그대로 열고, 가격 항목에 맞는 조건과 표시를 3단계로 수정합니다.</p>
                  </div>
                  <Button variant="outline" onClick={closeRuleModal}>
                    닫기
                  </Button>
                </div>

                {errorMessage ? <p className="mt-4 text-sm text-rose-700">{errorMessage}</p> : null}

                {visibleRuleSteps.length > 0 ? (
                  <div className={`mt-5 grid gap-3 ${visibleRuleSteps.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                    {visibleRuleSteps.map((step, index) => {
                      const isActive = currentRuleStep === step.value;
                      const isDone = currentStepIndex > index;
                      return (
                        <button
                          key={step.value}
                          type="button"
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : isDone
                                ? 'border-slate-300 bg-slate-50 text-slate-700'
                                : 'border-slate-200 bg-white text-slate-500'
                          }`}
                          onClick={() => setCurrentRuleStep(step.value)}
                        >
                          <div className="text-sm font-semibold">{step.label}</div>
                          <div className={`mt-1 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{step.description}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-5 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
                  <PricingRuleFormFields
                    ruleForm={ruleForm}
                    setRuleForm={setRuleForm}
                    currentStep={currentRuleStep}
                    openConditionCategories={openConditionCategories}
                    setOpenConditionCategories={setOpenConditionCategories}
                  />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const nextRuleForm = ruleBeingEdited ? toRuleForm(ruleBeingEdited) : createEmptyRuleFormForGroup('BASE');
                      setRuleForm(nextRuleForm);
                      setCurrentRuleStep('BASICS');
                      setOpenConditionCategories(getDefaultOpenConditionCategories(nextRuleForm));
                    }}
                  >
                    초기화
                  </Button>
                  {visibleRuleSteps.length > 0 && currentRuleStep !== 'BASICS' ? (
                    <Button variant="outline" onClick={handlePrevStep}>
                      이전
                    </Button>
                  ) : null}
                  {visibleRuleSteps.length === 0 || isLastVisibleStep ? (
                    <Button onClick={() => void submitRule()}>규칙 저장</Button>
                  ) : (
                    <Button onClick={handleNextStep}>다음</Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
