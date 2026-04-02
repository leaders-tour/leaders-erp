import { useMutation, useQuery } from '@apollo/client';
import { Button, Card, Input, SectionHeader } from '@tour/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CREATE_POLICY_MUTATION,
  DELETE_POLICY_MUTATION,
  DUPLICATE_POLICY_MUTATION,
  PRICING_POLICIES_LIST_QUERY,
  UPDATE_POLICY_MUTATION,
} from '../features/pricing-policy-admin/graphql';
import type { PricingPolicyListRow, PricingPolicyStatus, PolicyFormState } from '../features/pricing-policy-admin/types';
import {
  buildDateTime,
  createEmptyPolicyForm,
  findOverlappingActivePolicies,
  formatDateRange,
  formatPolicyRef,
  toPolicyForm,
} from '../features/pricing-policy-admin/utils';

export function PricingPoliciesPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ pricingPolicies: PricingPolicyListRow[] }>(PRICING_POLICIES_LIST_QUERY);
  const [createPolicy] = useMutation(CREATE_POLICY_MUTATION);
  const [updatePolicy] = useMutation(UPDATE_POLICY_MUTATION);
  const [deletePolicy] = useMutation(DELETE_POLICY_MUTATION);
  const [duplicatePolicy] = useMutation(DUPLICATE_POLICY_MUTATION);

  const policies = useMemo(() => data?.pricingPolicies ?? [], [data]);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<PolicyFormState>(createEmptyPolicyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const policyBeingEdited = useMemo(
    () => (editingPolicyId ? policies.find((p) => p.id === editingPolicyId) ?? null : null),
    [policies, editingPolicyId],
  );

  const activePeriodOverlaps = useMemo(
    () => findOverlappingActivePolicies(policies, policyForm, editingPolicyId),
    [policies, policyForm, editingPolicyId],
  );

  useEffect(() => {
    if (activePeriodOverlaps.length === 0) {
      setErrorMessage((prev) => (prev != null && prev.includes('활성 정책끼리 적용 기간이 겹칩니다') ? null : prev));
    }
  }, [activePeriodOverlaps.length]);

  const closePolicyModal = useCallback(() => {
    setIsPolicyModalOpen(false);
    setEditingPolicyId(null);
    setPolicyForm(createEmptyPolicyForm());
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!isPolicyModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePolicyModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPolicyModalOpen, closePolicyModal]);

  const openCreateModal = () => {
    setMessage(null);
    setErrorMessage(null);
    setEditingPolicyId(null);
    setPolicyForm(createEmptyPolicyForm());
    setIsPolicyModalOpen(true);
  };

  const openEditModal = (policy: PricingPolicyListRow) => {
    setMessage(null);
    setErrorMessage(null);
    setEditingPolicyId(policy.id);
    setPolicyForm(toPolicyForm(policy));
    setIsPolicyModalOpen(true);
  };

  const submitPolicy = async () => {
    if (!policyForm.name.trim() || !policyForm.effectiveFrom.trim()) {
      setErrorMessage('정책명과 시작일을 입력해 주세요.');
      return;
    }

    if (policyForm.effectiveTo.trim()) {
      const startMs = new Date(buildDateTime(policyForm.effectiveFrom)).getTime();
      const endMs = new Date(buildDateTime(policyForm.effectiveTo)).getTime();
      if (endMs < startMs) {
        setErrorMessage('종료일은 시작일보다 빠를 수 없습니다.');
        return;
      }
    }

    const overlaps = findOverlappingActivePolicies(policies, policyForm, editingPolicyId);
    if (overlaps.length > 0) {
      const detail = overlaps.map((p) => `${formatPolicyRef(p)} · ${formatDateRange(p)}`).join('\n');
      setErrorMessage(`활성 정책끼리 적용 기간이 겹칩니다. 기간을 조정하거나 다른 정책을 비활성화한 뒤 저장해 주세요.\n${detail}`);
      return;
    }

    const input = {
      name: policyForm.name.trim(),
      status: policyForm.status,
      effectiveFrom: buildDateTime(policyForm.effectiveFrom),
      effectiveTo: policyForm.effectiveTo ? buildDateTime(policyForm.effectiveTo) : null,
    };

    try {
      setErrorMessage(null);
      setMessage(null);
      if (editingPolicyId) {
        await updatePolicy({ variables: { id: editingPolicyId, input } });
        setMessage('가격 정책을 수정했습니다.');
      } else {
        await createPolicy({ variables: { input } });
        setMessage('가격 정책을 생성했습니다.');
      }
      await refetch();
      closePolicyModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '가격 정책 저장에 실패했습니다.');
    }
  };

  return (
    <section className="grid gap-6">
      <SectionHeader
        title="가격 정책"
        description="카드를 누르면 해당 정책의 규칙 페이지로 이동합니다. 정책명·기간은 「편집」으로 수정하고, 활성 정책끼리 기간이 겹치면 저장할 수 없습니다."
      />

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <Card className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">정책 목록</h2>
          <Button variant="outline" onClick={openCreateModal}>
            새 정책
          </Button>
        </div>

        {loading ? <p className="text-sm text-slate-500">정책 목록을 불러오는 중...</p> : null}

        <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="flex min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
            >
              <button
                type="button"
                className="min-w-0 flex-1 p-4 text-left transition hover:bg-slate-50"
                onClick={() => navigate(`/admin/pricing-policies/${policy.id}/rules`)}
              >
                <div className="text-sm font-semibold text-slate-900">{policy.name}</div>
                <div className="mt-2 text-xs text-slate-600">
                  {formatDateRange(policy)} · 규칙 {policy.rules.length}개
                </div>
              </button>
              <div className="flex w-[100px] shrink-0 flex-col items-stretch justify-center gap-2 border-l border-slate-100 bg-slate-50/80 p-2">
                <span
                  className={`mx-auto rounded-full px-2 py-0.5 text-center text-[10px] font-semibold ${
                    policy.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {policy.status === 'ACTIVE' ? '활성' : '비활성'}
                </span>
                <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => openEditModal(policy)}>
                  편집
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isPolicyModalOpen ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]"
            onClick={closePolicyModal}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-none">
              <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{editingPolicyId ? '정책 수정' : '정책 생성'}</h2>
                    <p className="mt-1 text-xs text-slate-500">적용 기간·상태를 정책 단위로 관리합니다. Esc로 닫을 수 있습니다.</p>
                  </div>
                  <Button variant="outline" onClick={closePolicyModal}>
                    닫기
                  </Button>
                </div>

                {policyBeingEdited ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          setErrorMessage(null);
                          const suffix = String(Date.now()).slice(-4);
                          await duplicatePolicy({
                            variables: {
                              id: policyBeingEdited.id,
                              input: {
                                name: `${policyBeingEdited.name} 복제-${suffix}`,
                                effectiveFrom: policyBeingEdited.effectiveFrom,
                                effectiveTo: policyBeingEdited.effectiveTo,
                                status: policyBeingEdited.status,
                              },
                            },
                          });
                          setMessage('가격 정책을 복제했습니다.');
                          await refetch();
                          closePolicyModal();
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
                          await deletePolicy({ variables: { id: policyBeingEdited.id } });
                          setMessage('가격 정책을 삭제했습니다.');
                          await refetch();
                          closePolicyModal();
                        } catch (error) {
                          setErrorMessage(error instanceof Error ? error.message : '가격 정책 삭제에 실패했습니다.');
                        }
                      }}
                    >
                      정책 삭제
                    </Button>
                  </div>
                ) : null}

                {errorMessage ? (
                  <p className="mt-4 whitespace-pre-line text-sm text-rose-700">{errorMessage}</p>
                ) : null}

                {activePeriodOverlaps.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">활성 정책 적용 기간이 서로 겹칩니다</p>
                    <p className="mt-1 text-amber-900/90">
                      아래 정책과 하루 이상 겹칩니다. 기간을 나누거나 일부를 비활성화한 뒤 저장하세요.
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {activePeriodOverlaps.map((p) => (
                        <li key={p.id}>
                          {formatPolicyRef(p)} — {formatDateRange(p)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1 text-sm md:col-span-2">
                    <span>정책명</span>
                    <Input
                      value={policyForm.name}
                      onChange={(event) => setPolicyForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span>상태</span>
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={policyForm.status}
                      onChange={(event) =>
                        setPolicyForm((prev) => ({ ...prev, status: event.target.value as PricingPolicyStatus }))
                      }
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span>시작일</span>
                    <Input
                      type="date"
                      value={policyForm.effectiveFrom}
                      onChange={(event) => setPolicyForm((prev) => ({ ...prev, effectiveFrom: event.target.value }))}
                    />
                  </label>
                  <label className="grid gap-1 text-sm md:col-span-2">
                    <span>종료일</span>
                    <Input
                      type="date"
                      value={policyForm.effectiveTo}
                      onChange={(event) => setPolicyForm((prev) => ({ ...prev, effectiveTo: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPolicyForm(
                        policyBeingEdited ? toPolicyForm(policyBeingEdited) : createEmptyPolicyForm(),
                      )
                    }
                  >
                    초기화
                  </Button>
                  <Button onClick={() => void submitPolicy()} disabled={activePeriodOverlaps.length > 0}>
                    {editingPolicyId ? '정책 저장' : '정책 생성'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
