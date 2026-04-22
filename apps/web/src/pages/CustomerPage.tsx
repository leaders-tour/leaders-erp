import { Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomerSelector, PlanListPanel } from '../features/plan/components';
import {
  calcGroupCounts,
  getCustomerTripStatus,
  type CustomerTripStatus,
} from '../features/plan/customerTripStatus';
import { usePlansByUser, useUsers } from '../features/plan/hooks';

type StatusFilterKey = CustomerTripStatus | 'all';

export function CustomerPage(): JSX.Element {
  const navigate = useNavigate();
  const { users, loading } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');

  const groupCounts = useMemo(() => calcGroupCounts(users), [users]);

  const filteredUsers = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter !== 'all' && getCustomerTripStatus(user) !== statusFilter) return false;
      if (!keyword) return true;
      const ownerNameMatched = user.ownerEmployee?.name.toLowerCase().includes(keyword) ?? false;
      const ownerEmailMatched = user.ownerEmployee?.email.toLowerCase().includes(keyword) ?? false;
      return user.name.toLowerCase().includes(keyword) || ownerNameMatched || ownerEmailMatched;
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

        <div className="grid gap-4">
          {loading || planLoading ? <div className="text-sm text-slate-600">불러오는 중...</div> : null}

          {selectedUserId ? (
            <PlanListPanel
              plans={plans}
              onOpenPlan={(planId) => navigate(`/plans/${planId}`)}
              onCreatePlan={() => navigate(`/itinerary-builder?userId=${selectedUserId}`)}
            />
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
