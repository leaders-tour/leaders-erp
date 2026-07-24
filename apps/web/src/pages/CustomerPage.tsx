import { Card } from '@tour/ui';
import { useApolloClient } from '@apollo/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CustomerDeletePanel, CustomerSelector, PlanListPanel } from '../features/plan/components';
import { UserDisplayName } from '../features/plan/components/UserDisplayName';
import {
  getCustomerPaginationShortcutAction,
  getCustomerTotalPages,
  isEditableTarget,
  paginateCustomerItems,
  parseCustomerPageParam,
  resolveSafeCustomerPage,
} from '../features/plan/customerPagination';
import { matchesCustomerSearchKeyword } from '../features/plan/customerSearch';
import { shouldRefreshUsersFromSnapshot } from '../features/plan/customerListSnapshot';
import { hasSessionUsers } from '../features/plan/customerListSessionCache';
import {
  countCustomersWithMinTeams,
  customerHasMinTeams,
  parseCustomerMinTeamsFilter,
  type CustomerMinTeamsFilter,
} from '../features/plan/customerTeamFilter';
import {
  CUSTOMER_TRIP_STATUS_LABELS,
  calcGroupCounts,
  getCustomerTripStatus,
  type CustomerTripStatus,
} from '../features/plan/customerTripStatus';
import type { DealStageValue } from '../features/plan/hooks';
import { useDeleteUser, usePlansByUser, useUsers, fetchUserListSnapshot } from '../features/plan/hooks';
import {
  getQueryParam,
  patchSearchParams,
  setOptionalQueryParam,
  setQueryParam,
} from '../lib/list-filters';

type StatusFilterKey = CustomerTripStatus | 'all';

const CUSTOMER_STATUS_VALUES = ['pre', 'confirmed', 'ongoing', 'done'] as const;

function parseCustomerStatusFilter(raw: string | null): StatusFilterKey {
  if (!raw || raw === 'all') return 'all';
  if ((CUSTOMER_STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as CustomerTripStatus;
  }
  return 'all';
}

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
  const client = useApolloClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { users, loading, refetch: refetchUsers, hasCachedUsers, isRestoring: isRestoringUsers } = useUsers();
  const { deleteUser, loading: deletingUser } = useDeleteUser();
  const selectedUserId = searchParams.get('userId') ?? '';
  const customerSearch = getQueryParam(searchParams, 'q');
  const statusFilter = parseCustomerStatusFilter(searchParams.get('status'));
  const minTeamsFilter = parseCustomerMinTeamsFilter(
    searchParams.get('minTeams'),
    searchParams.get('multiTeam') === '1',
  );
  const currentPage = parseCustomerPageParam(searchParams.get('page'));
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const filterResetKeyRef = useRef(`${customerSearch}|${statusFilter}|${minTeamsFilter ?? ''}`);
  const snapshotCheckInFlightRef = useRef(false);
  const usersLoadingRef = useRef(loading);
  const usersRef = useRef(users);

  useEffect(() => {
    usersLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const checkAndRefreshUsers = useCallback(async () => {
    if (snapshotCheckInFlightRef.current) {
      return;
    }

    snapshotCheckInFlightRef.current = true;
    try {
      const serverSnapshot = await fetchUserListSnapshot(client);
      const cachedUsers = usersRef.current;
      if (!shouldRefreshUsersFromSnapshot(cachedUsers, serverSnapshot)) {
        return;
      }
      if (cachedUsers.length === 0 && usersLoadingRef.current) {
        return;
      }
      await refetchUsers();
    } finally {
      snapshotCheckInFlightRef.current = false;
    }
  }, [client, refetchUsers]);

  function setCustomerSearch(value: string) {
    patchSearchParams(setSearchParams, (prev) => setQueryParam(prev, 'q', value));
  }

  function setStatusFilter(status: StatusFilterKey) {
    patchSearchParams(setSearchParams, (prev) => {
      if (status === 'all') prev.delete('status');
      else prev.set('status', status);
    });
  }

  function setMinTeamsFilter(minTeams: CustomerMinTeamsFilter | null) {
    patchSearchParams(setSearchParams, (prev) => {
      prev.delete('multiTeam');
      if (minTeams == null) {
        prev.delete('minTeams');
      } else {
        prev.set('minTeams', String(minTeams));
      }
    });
  }

  function setCurrentPage(page: number) {
    patchSearchParams(setSearchParams, (prev) => {
      if (page <= 1) {
        prev.delete('page');
      } else {
        prev.set('page', String(page));
      }
    });
  }

  function setSelectedUserId(userId: string) {
    patchSearchParams(setSearchParams, (prev) => setOptionalQueryParam(prev, 'userId', userId || undefined));
  }

  const groupCounts = useMemo(() => calcGroupCounts(users), [users]);
  const minTeamCounts = useMemo(
    (): Record<CustomerMinTeamsFilter, number> => ({
      2: countCustomersWithMinTeams(users, 2),
      3: countCustomersWithMinTeams(users, 3),
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter !== 'all' && getCustomerTripStatus(user) !== statusFilter) return false;
      if (minTeamsFilter != null && !customerHasMinTeams(user, minTeamsFilter)) return false;
      return matchesCustomerSearchKeyword(user, customerSearch);
    });
  }, [customerSearch, minTeamsFilter, users, statusFilter]);

  const usersReady = hasCachedUsers || !loading;
  const totalPages = useMemo(() => getCustomerTotalPages(filteredUsers.length), [filteredUsers.length]);
  const hasKnownTotalPages = usersReady && filteredUsers.length > 0;
  const safeCurrentPage = useMemo(
    () => resolveSafeCustomerPage(currentPage, totalPages, hasKnownTotalPages),
    [currentPage, hasKnownTotalPages, totalPages],
  );
  const paginatedUsers = useMemo(
    () => paginateCustomerItems(filteredUsers, safeCurrentPage),
    [filteredUsers, safeCurrentPage],
  );
  const customersListPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `/customers?${query}` : '/customers';
  }, [searchParams]);

  useEffect(() => {
    if (hasCachedUsers || hasSessionUsers()) {
      return;
    }
    void checkAndRefreshUsers();
  }, [checkAndRefreshUsers, hasCachedUsers]);

  useEffect(() => {
    function handleWindowFocus() {
      void checkAndRefreshUsers();
    }

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [checkAndRefreshUsers]);

  useEffect(() => {
    const nextFilterResetKey = `${customerSearch}|${statusFilter}|${minTeamsFilter ?? ''}`;
    if (filterResetKeyRef.current === nextFilterResetKey) return;
    filterResetKeyRef.current = nextFilterResetKey;
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, customerSearch, minTeamsFilter, statusFilter]);

  useEffect(() => {
    if (!hasKnownTotalPages) return;
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, hasKnownTotalPages, safeCurrentPage]);

  useEffect(() => {
    if (!usersReady) return;

    if (filteredUsers.length === 0) {
      if (selectedUserId) {
        setSelectedUserId('');
      }
      return;
    }

    const selectedExistsInFiltered = filteredUsers.some((user) => user.id === selectedUserId);
    if (!selectedUserId || !selectedExistsInFiltered) {
      const fallbackUser = paginatedUsers[0] ?? filteredUsers[0];
      if (fallbackUser && fallbackUser.id !== selectedUserId) {
        setSelectedUserId(fallbackUser.id);
      }
    }
  }, [filteredUsers, paginatedUsers, selectedUserId, usersReady]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      if (totalPages <= 1) return;

      const action = getCustomerPaginationShortcutAction(event);
      if (action === 'prev' && safeCurrentPage > 1) {
        event.preventDefault();
        setCurrentPage(safeCurrentPage - 1);
      }
      if (action === 'next' && safeCurrentPage < totalPages) {
        event.preventDefault();
        setCurrentPage(safeCurrentPage + 1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeCurrentPage, totalPages]);

  const { plans, loading: planLoading, hasCachedPlans, isRestoring: isRestoringPlans } = usePlansByUser(
    selectedUserId || undefined,
  );
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const selectedTripStatus = selectedUser ? getCustomerTripStatus(selectedUser) : null;
  const showInitialLoading =
    (loading && !hasCachedUsers && !isRestoringUsers) ||
    (Boolean(selectedUserId) && planLoading && !hasCachedPlans && !isRestoringPlans);

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
            users={paginatedUsers}
            selectedUserId={selectedUserId}
            searchValue={customerSearch}
            onChangeSearch={setCustomerSearch}
            onSelect={setSelectedUserId}
            statusFilter={statusFilter}
            onChangeStatusFilter={setStatusFilter}
            groupCounts={groupCounts}
            minTeamsFilter={minTeamsFilter}
            onChangeMinTeamsFilter={setMinTeamsFilter}
            minTeamCounts={minTeamCounts}
            showTravelSummary
            isRestoringList={isRestoringUsers}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onChangePage={setCurrentPage}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 self-start">
          {showInitialLoading ? <div className="text-sm text-slate-600">불러오는 중...</div> : null}

          {selectedUser ? (
            <>
              <Card className="h-fit self-start rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-xs font-medium text-slate-500">고객 정보</p>
                      <h2 className="text-base font-semibold text-slate-900">
                        <UserDisplayName user={selectedUser} />
                      </h2>
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
                onOpenPlan={(planId) =>
                  navigate(`/plans/${planId}`, { state: { returnTo: customersListPath } })
                }
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
