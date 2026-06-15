import { Button, Card, Input } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerDeletePanel, PlanListPanel } from '../features/plan/components';
import { useEmployees } from '../features/auth/hooks';
import { useDeleteUser, usePlansByUser, useUpdateUser, useUser } from '../features/plan/hooks';

export function CustomerPlansPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: userLoading } = useUser(userId);
  const { plans, loading: plansLoading, refetch: refetchPlans } = usePlansByUser(userId);
  const { employees } = useEmployees(true);
  const { updateUser, loading: updatingUser } = useUpdateUser();
  const { deleteUser, loading: deletingUser } = useDeleteUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ownerEmployeeId, setOwnerEmployeeId] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);

  const deleteTargetUser = useMemo(() => {
    if (!user) {
      return null;
    }

    return {
      ...user,
      plans: user.plans ?? plans.map((plan) => ({ id: plan.id })),
    };
  }, [plans, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setName(user.name);
    setEmail(user.email ?? '');
    setOwnerEmployeeId(user.ownerEmployeeId ?? '');
  }, [user]);

  if (!userId) {
    return <section className="py-6 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">고객별 일정</h1>
          <p className="mt-1 text-sm text-slate-600">{user ? `${user.name} 고객의 일정 목록` : '고객 정보를 불러오는 중...'}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/customers')}>
          고객 목록으로
        </Button>
      </header>

      {userLoading || plansLoading ? <div className="text-sm text-slate-600">불러오는 중...</div> : null}

      {user ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">고객 정보</h2>
              <p className="mt-1 text-sm text-slate-600">
                고객명을 저장하면 이 고객의 일정 대표자명과 자동 제목도 함께 변경됩니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!name.trim() || updatingUser}
                onClick={async () => {
                  setFeedback(null);
                  setErrorMessage(null);
                  try {
                    await updateUser(user.id, {
                      name: name.trim(),
                      email: email.trim() || null,
                      ownerEmployeeId: ownerEmployeeId || null,
                    });
                    await refetchPlans();
                    setFeedback('고객 정보를 저장했습니다.');
                  } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : '고객 정보 저장에 실패했습니다.');
                  }
                }}
              >
                {updatingUser ? '저장 중...' : '정보 저장'}
              </Button>
              <Button variant="outline" onClick={() => setDeletePanelOpen((open) => !open)}>
                {deletePanelOpen ? '삭제 취소' : '고객 삭제'}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-700">
              <span>고객명</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>이메일</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="선택 입력" />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>담당자</span>
              <select
                value={ownerEmployeeId}
                onChange={(event) => setOwnerEmployeeId(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">미지정</option>
                {employees.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.email})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {feedback ? <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p> : null}
          {errorMessage ? <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
        </Card>
      ) : null}

      {deletePanelOpen && deleteTargetUser ? (
        <CustomerDeletePanel
          user={deleteTargetUser}
          deleting={deletingUser}
          onCancel={() => setDeletePanelOpen(false)}
          onConfirmDelete={async () => {
            await deleteUser(deleteTargetUser.id);
            navigate('/customers');
          }}
        />
      ) : null}

      <PlanListPanel
        plans={plans}
        onOpenPlan={(planId) => navigate(`/plans/${planId}`)}
        onCreatePlan={() => navigate(`/itinerary-builder?userId=${userId}`)}
      />

      {plans.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          등록된 일정이 없습니다. "신규 일정 생성" 버튼으로 첫 일정을 생성하세요.
        </Card>
      ) : null}
    </section>
  );
}
