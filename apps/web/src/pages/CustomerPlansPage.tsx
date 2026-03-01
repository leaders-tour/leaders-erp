import { Button, Card } from '@tour/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanListPanel } from '../features/plan/components';
import { usePlansByUser, useUser } from '../features/plan/hooks';

export function CustomerPlansPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: userLoading } = useUser(userId);
  const { plans, loading: plansLoading } = usePlansByUser(userId);

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
