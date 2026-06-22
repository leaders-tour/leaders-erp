import { Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomerDeletePanel, CustomerSelector, PlanListPanel } from '../features/plan/components';
import { matchesCustomerSearchKeyword } from '../features/plan/customerSearch';
import {
  CUSTOMER_TRIP_STATUS_LABELS,
  calcGroupCounts,
  getCustomerTripStatus,
  type CustomerTripStatus,
} from '../features/plan/customerTripStatus';
import type { DealStageValue } from '../features/plan/hooks';
import { useDeleteUser, usePlansByUser, useUsers } from '../features/plan/hooks';

type StatusFilterKey = CustomerTripStatus | 'all';

const DEAL_STAGE_LABELS: Record<DealStageValue, string> = {
  CONSULTING: '컨설팅',
  CONTRACTING: '계약단계',
  CONTRACT_CONFIRMED: '계약확정',
  MONGOL_ASSIGNING: '몽골배정단계',
  MONGOL_ASSIGNED: '몽골배정완료',
  ON_HOLD: '대기중',
  BEFORE_DEPARTURE_10D: '출발 10일이내',
  BEFORE_DEPARTURE_3D: '출발 3일이내',
  TRIP_COMPLETED: '여행 완료시',
};

export function CustomerPage(): JSX.Element {
  const navigate = useNavigate();
  const { users, loading } = useUsers();
  const { deleteUser, loading: deletingUser } = useDeleteUser();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);

  const groupCounts = useMemo(() => calcGroupCounts(users), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter !== 'all' && getCustomerTripStatus(user) !== statusFilter) return false;
      return matchesCustomerSearchKeyword(user, customerSearch);
    });
  }, [customerSearch, users, statusFilter]);

  useEffect(() => {
    if (!selectedUserId && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0]?.id ?? '');
      return;
    }
    if (selectedUserId && !filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0]?.id ?? '');
    }
  }, [filteredUsers, selectedUserId]);

  const { plans, loading: planLoading } = usePlansByUser(selectedUserId || undefined);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const selectedTripStatus = selectedUser ? getCustomerTripStatus(selectedUser) : null;

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">고객</h1>
          <p className="mt-1 text-sm text-slate-600">고객별 일정과 버전 이력을 탐색합니다.</p>
        </div>
        <Link
          to="/customers/create"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          고객 생성
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <CustomerSelector
            users={filteredUsers}
            selectedUserId={selectedUserId}
            searchValue={customerSearch}
            onChangeSearch={setCustomerSearch}
            onSelect={setSelectedUserId}
            statusFilter={statusFilter}
            onChangeStatusFilter={setStatusFilter}
            groupCounts={groupCounts}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 self-start">
          {loading || planLoading ? <div className="text-sm text-slate-600">불러오는 중...</div> : null}

          {selectedUser ? (
            <>
              <Card className="h-fit self-start rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-xs font-medium text-slate-500">고객 정보</p>
                      <h2 className="text-base font-semibold text-slate-900">{selectedUser.name}</h2>
                      <p className="text-sm text-slate-600">
                        담당자: {selectedUser.ownerEmployee?.name ?? '미지정'}
                        {selectedUser.email ? ` · ${selectedUser.email}` : ''}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>진행 단계: {DEAL_STAGE_LABELS[selectedUser.dealStage]}</span>
                      <span>
                        여행 상태: {selectedTripStatus ? CUSTOMER_TRIP_STATUS_LABELS[selectedTripStatus] : '-'}
                      </span>
                      <span>일정 수: {plans.length}개</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      to={`/customers/${selectedUser.id}/plans`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      고객 정보 수정
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeletePanelOpen(true)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </Card>

              {deletePanelOpen ? (
                <CustomerDeletePanel
                  user={selectedUser}
                  deleting={deletingUser}
                  onCancel={() => setDeletePanelOpen(false)}
                  onConfirmDelete={async () => {
                    await deleteUser(selectedUser.id);
                    setDeletePanelOpen(false);
                    setSelectedUserId('');
                  }}
                />
              ) : null}

              <PlanListPanel
                plans={plans}
                onOpenPlan={(planId) => navigate(`/plans/${planId}`)}
                onCreatePlan={() => navigate(`/itinerary-builder?userId=${selectedUserId}`)}
              />
            </>
          ) : (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              고객을 선택하면 일정 요약이 표시됩니다.
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
