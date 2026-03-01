import { Button, Card, Table, Td, Th } from '@tour/ui';
import type { PlanRow } from '../hooks';

interface PlanListPanelProps {
  plans: PlanRow[];
  onOpenPlan: (planId: string) => void;
  onCreatePlan: () => void;
}

export function PlanListPanel({ plans, onOpenPlan, onCreatePlan }: PlanListPanelProps): JSX.Element {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">일정 목록</h2>
        <Button variant="primary" onClick={onCreatePlan}>
          신규 일정 생성
        </Button>
      </div>
      <div className="overflow-auto">
        <Table>
          <thead>
            <tr>
              <Th>제목</Th>
              <Th>현재 버전</Th>
              <Th>수정일</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <Td>{plan.title}</Td>
                <Td>{plan.currentVersion ? `v${plan.currentVersion.versionNumber}` : '-'}</Td>
                <Td>{new Date(plan.updatedAt).toLocaleString('ko-KR')}</Td>
                <Td>
                  <Button variant="outline" onClick={() => onOpenPlan(plan.id)}>
                    상세
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
