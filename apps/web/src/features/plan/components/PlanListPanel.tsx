import { Button, Card, Table, Td, Th } from '@tour/ui';
import type { PlanRow } from '../hooks';

interface PlanListPanelProps {
  plans: PlanRow[];
  onOpenPlan: (planId: string) => void;
  onCreatePlan: () => void;
  loading?: boolean;
}

export function PlanListPanel({
  plans,
  onOpenPlan,
  onCreatePlan,
  loading = false,
}: PlanListPanelProps): JSX.Element {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">일정 목록</h2>
        <Button variant="primary" onClick={onCreatePlan} disabled={loading}>
          신규 일정 생성
        </Button>
      </div>
      <div className="overflow-auto">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">일정 목록을 불러오는 중...</p>
        ) : plans.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">등록된 일정이 없습니다.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>제목</Th>
                <Th>대표자명</Th>
                <Th>현재 버전</Th>
                <Th>수정일</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <Td>{plan.title}</Td>
                  <Td>{plan.currentVersion?.meta?.leaderName?.trim() || '-'}</Td>
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
        )}
      </div>
    </Card>
  );
}
