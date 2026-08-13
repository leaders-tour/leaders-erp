import { Button, Card, Table, Td, Th } from '@tour/ui';
import type { PlanRow } from '../hooks';

interface PlanListPanelProps {
  plans: PlanRow[];
  onOpenPlan: (planId: string) => void;
  onCreatePlan: () => void;
  loading?: boolean;
  selectedPlanId?: string | null;
  onSelectPlan?: (planId: string) => void;
}

function PlanListSkeletonRows(): JSX.Element {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <tr key={index}>
          <Td>
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          </Td>
          <Td>
            <div className="h-8 w-12 animate-pulse rounded bg-slate-100" />
          </Td>
        </tr>
      ))}
    </>
  );
}

export function PlanListPanel({
  plans,
  onOpenPlan,
  onCreatePlan,
  loading = false,
  selectedPlanId = null,
  onSelectPlan,
}: PlanListPanelProps): JSX.Element {
  return (
    <Card className="w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">일정 목록</h2>
        <Button variant="primary" onClick={onCreatePlan}>
          신규 일정 생성
        </Button>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
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
              <PlanListSkeletonRows />
            </tbody>
          </Table>
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
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <tr
                    key={plan.id}
                    className={
                      onSelectPlan
                        ? `cursor-pointer transition-colors ${
                            isSelected ? 'bg-slate-900/5' : 'hover:bg-slate-50'
                          }`
                        : undefined
                    }
                    onClick={onSelectPlan ? () => onSelectPlan(plan.id) : undefined}
                  >
                    <Td>
                      <span className={isSelected ? 'font-semibold text-slate-900' : undefined}>
                        {plan.title}
                      </span>
                    </Td>
                    <Td>{plan.currentVersion?.meta?.leaderName?.trim() || '-'}</Td>
                    <Td>{plan.currentVersion ? `v${plan.currentVersion.versionNumber}` : '-'}</Td>
                    <Td>{new Date(plan.updatedAt).toLocaleString('ko-KR')}</Td>
                    <Td>
                      <Button
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenPlan(plan.id);
                        }}
                      >
                        상세
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </Card>
  );
}
