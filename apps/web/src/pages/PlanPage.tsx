import { Button, Card } from '@tour/ui';
import { useNavigate } from 'react-router-dom';

export function PlanPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <section className="grid gap-4 py-8">
      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Plan 화면이 변경되었습니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          고객 중심 구조로 전환되어 Plan은 고객 화면에서 탐색합니다.
        </p>
        <div className="mt-4">
          <Button onClick={() => navigate('/customers')}>고객 목록으로 이동</Button>
        </div>
      </Card>
    </section>
  );
}
