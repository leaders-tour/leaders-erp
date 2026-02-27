import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerSelector, PlanListPanel } from '../features/plan/components';
import { usePlansByUser, useUsers } from '../features/plan/hooks';

export function CustomerPage(): JSX.Element {
  const navigate = useNavigate();
  const { users, loading } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0]?.id ?? '');
    }
  }, [selectedUserId, users]);

  const { plans, loading: planLoading } = usePlansByUser(selectedUserId || undefined);
  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [selectedUserId, users]);

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">고객</h1>
          <p className="mt-1 text-sm text-slate-600">고객별 Plan과 버전 이력을 탐색합니다.</p>
        </div>
        <Button onClick={() => navigate('/customers/create')}>고객 생성</Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <CustomerSelector users={users} selectedUserId={selectedUserId} onSelect={setSelectedUserId} />
        </div>

        <div className="grid gap-4">
          <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">선택 고객</h2>
                <p className="mt-1 text-sm text-slate-600">{selectedUser ? selectedUser.name : '고객을 선택하세요.'}</p>
              </div>
              {selectedUserId ? (
                <Button variant="outline" onClick={() => navigate(`/customers/${selectedUserId}/plans`)}>
                  고객 Plan 전체 보기
                </Button>
              ) : null}
            </div>
          </Card>

          {loading || planLoading ? <div className="text-sm text-slate-600">불러오는 중...</div> : null}

          {selectedUserId ? (
            <PlanListPanel
              plans={plans}
              onOpenPlan={(planId) => navigate(`/plans/${planId}`)}
              onCreatePlan={() => navigate(`/itinerary-builder?userId=${selectedUserId}`)}
            />
          ) : (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              고객을 선택하면 Plan 요약이 표시됩니다.
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
