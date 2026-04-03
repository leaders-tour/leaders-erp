import { useMutation, useQuery } from '@apollo/client';
import { Button, Card, SectionHeader } from '@tour/ui';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PricingRuleFormFields } from '../features/pricing-policy-admin/PricingRuleFormFields';
import { PricingRulesTable } from '../features/pricing-policy-admin/PricingRulesTable';
import {
  CREATE_RULE_MUTATION,
  DELETE_RULE_MUTATION,
  PRICING_POLICY_WITH_RULES_QUERY,
  UPDATE_RULE_MUTATION,
} from '../features/pricing-policy-admin/graphql';
import type { PricingPolicyDetailRow, PricingRuleRow, RuleFormState } from '../features/pricing-policy-admin/types';
import {
  buildRuleMutationBody,
  createEmptyRuleForm,
  toRuleForm,
  validateRuleForm,
} from '../features/pricing-policy-admin/utils';

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
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(createEmptyRuleForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ruleBeingEdited = policy && editingRuleId ? policy.rules.find((r) => r.id === editingRuleId) ?? null : null;

  const closeRuleModal = useCallback(() => {
    setIsRuleModalOpen(false);
    setEditingRuleId(null);
    setRuleForm(createEmptyRuleForm());
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

  const openAddModal = () => {
    setMessage(null);
    setErrorMessage(null);
    setEditingRuleId(null);
    setRuleForm(createEmptyRuleForm());
    setIsRuleModalOpen(true);
  };

  const openEditModal = (rule: PricingRuleRow) => {
    setMessage(null);
    setErrorMessage(null);
    setEditingRuleId(rule.id);
    setRuleForm(toRuleForm(rule));
    setIsRuleModalOpen(true);
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
                ? 'ruleType·제목·조건·금액을 관리합니다. 장거리는 `장거리 기본금`, 야간열차는 `조건부 추가/할인` 규칙에서 수량 기준으로 설정합니다.'
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">규칙 목록</h2>
              <p className="mt-1 text-xs text-slate-500">이 정책에 속한 규칙을 확인하고, 추가·수정은 모달에서 진행합니다.</p>
            </div>
            <Button onClick={openAddModal}>규칙 추가</Button>
          </div>

          {policy.rules.length === 0 ? (
            <p className="text-sm text-slate-500">등록된 규칙이 없습니다. 「규칙 추가」로 등록할 수 있습니다.</p>
          ) : (
            <PricingRulesTable rules={policy.rules} onEdit={openEditModal} onDelete={(rule) => void handleDeleteRule(rule)} />
          )}
        </Card>
      ) : null}

      {isRuleModalOpen && policy ? (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={closeRuleModal} aria-hidden="true" />
          <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-none">
              <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{editingRuleId ? '규칙 수정' : '규칙 추가'}</h2>
                    <p className="mt-1 text-xs text-slate-500">ruleType, 제목, 조건, 금액을 입력합니다. 장거리는 `장거리 기본금`, 야간열차는 `조건부 추가/할인`에서 수량 기준으로 설정합니다.</p>
                  </div>
                  <Button variant="outline" onClick={closeRuleModal}>
                    닫기
                  </Button>
                </div>

                {errorMessage ? <p className="mt-4 text-sm text-rose-700">{errorMessage}</p> : null}

                <div className="mt-5 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
                  <PricingRuleFormFields ruleForm={ruleForm} setRuleForm={setRuleForm} />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setRuleForm(ruleBeingEdited ? toRuleForm(ruleBeingEdited) : createEmptyRuleForm())
                    }
                  >
                    초기화
                  </Button>
                  <Button onClick={() => void submitRule()}>{editingRuleId ? '규칙 저장' : '규칙 추가'}</Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
