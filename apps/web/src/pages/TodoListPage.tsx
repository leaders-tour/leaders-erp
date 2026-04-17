import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useCallback, useMemo, useState } from 'react';
import {
  useUpdateUserDealTodoStatus,
  useUsers,
  type DealStageValue,
  type DealTodoStatusValue,
  type UserRow,
} from '../features/plan/hooks';

const DEAL_STAGES: Array<{ value: DealStageValue; label: string }> = [
  { value: 'CONSULTING', label: '컨설팅' },
  { value: 'CONTRACTING', label: '계약단계' },
  { value: 'CONTRACT_CONFIRMED', label: '계약확정' },
  { value: 'MONGOL_ASSIGNING', label: '몽골배정단계' },
  { value: 'MONGOL_ASSIGNED', label: '몽골배정완료' },
  { value: 'ON_HOLD', label: '대기중' },
  { value: 'BEFORE_DEPARTURE_10D', label: '출발 10일이내' },
  { value: 'BEFORE_DEPARTURE_3D', label: '출발 3일이내' },
  { value: 'TRIP_COMPLETED', label: '여행 완료시' },
];

const STATUS_OPTIONS: Array<{ value: DealTodoStatusValue; label: string }> = [
  { value: 'TODO', label: 'TODO' },
  { value: 'DOING', label: '진행중' },
  { value: 'DONE', label: '완료' },
];

const UNASSIGNED_OWNER = '__UNASSIGNED__';

interface TodoListRow {
  todoId: string;
  customerName: string;
  ownerName: string;
  ownerFilterValue: string;
  stage: DealStageValue;
  title: string;
  description: string | null;
  status: DealTodoStatusValue;
  createdAt: string;
  completedAt: string | null;
}

const STAGE_CHIP_STYLES: Record<DealStageValue, string> = {
  CONSULTING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  CONTRACTING: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  CONTRACT_CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  MONGOL_ASSIGNING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  MONGOL_ASSIGNED: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  ON_HOLD: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  BEFORE_DEPARTURE_10D: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  BEFORE_DEPARTURE_3D: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  TRIP_COMPLETED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

function stageLabel(stage: DealStageValue): string {
  return DEAL_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

function StageChip({ stage }: { stage: DealStageValue }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STAGE_CHIP_STYLES[stage] ?? 'bg-slate-50 text-slate-600 ring-slate-500/20'}`}
    >
      {stageLabel(stage)}
    </span>
  );
}

function statusLabel(status: DealTodoStatusValue): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR');
}

function parseTime(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function flattenTodos(users: UserRow[]): TodoListRow[] {
  return users
    .flatMap((user) =>
      (user.userDealTodos ?? []).map((todo) => ({
        todoId: todo.id,
        customerName: user.name,
        ownerName: user.ownerEmployee?.name ?? '미지정',
        ownerFilterValue: user.ownerEmployeeId ?? UNASSIGNED_OWNER,
        stage: todo.stage,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        createdAt: todo.createdAt,
        completedAt: todo.completedAt,
      })),
    )
    .sort((left, right) => {
      const createdAtDiff = parseTime(right.createdAt) - parseTime(left.createdAt);
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return left.todoId.localeCompare(right.todoId);
    });
}

type ActiveTab = 'active' | 'done';

export function TodoListPage(): JSX.Element {
  const { users, loading, error, refetch: refetchUsers } = useUsers();
  const { updateUserDealTodoStatus, loading: todoUpdating } = useUpdateUserDealTodoStatus();
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStage, setSelectedStage] = useState<'ALL' | DealStageValue>('ALL');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');
  const [pendingTodoId, setPendingTodoId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<DealTodoStatusValue | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [confirmDoneTodoId, setConfirmDoneTodoId] = useState<string | null>(null);
  const [confirmDoneCustomerName, setConfirmDoneCustomerName] = useState<string>('');
  const [confirmDoneTitle, setConfirmDoneTitle] = useState<string>('');

  const rows = useMemo(() => flattenTodos(users), [users]);

  const ownerOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];

    for (const row of rows) {
      const value = row.ownerFilterValue;
      if (seen.has(value)) {
        continue;
      }

      seen.add(value);
      options.push({
        value,
        label: row.ownerName,
      });
    }

    return options.sort((left, right) => left.label.localeCompare(right.label, 'ko'));
  }, [rows]);

  const applyFilters = useCallback(
    (subset: TodoListRow[]) => {
      const keyword = searchKeyword.trim().toLowerCase();

      return subset.filter((row) => {
        if (selectedStage !== 'ALL' && row.stage !== selectedStage) {
          return false;
        }

        if (selectedOwner !== 'ALL' && row.ownerFilterValue !== selectedOwner) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return (
          row.customerName.toLowerCase().includes(keyword) ||
          row.title.toLowerCase().includes(keyword) ||
          (row.description ?? '').toLowerCase().includes(keyword)
        );
      });
    },
    [searchKeyword, selectedOwner, selectedStage],
  );

  const activeRows = useMemo(
    () => applyFilters(rows.filter((row) => row.status === 'TODO' || row.status === 'DOING')),
    [rows, applyFilters],
  );

  const doneRows = useMemo(
    () =>
      applyFilters(rows.filter((row) => row.status === 'DONE')).sort(
        (left, right) => parseTime(right.completedAt ?? '') - parseTime(left.completedAt ?? ''),
      ),
    [rows, applyFilters],
  );

  const filteredRows = activeTab === 'active' ? activeRows : doneRows;
  const totalTabRows = activeTab === 'active' ? rows.filter((r) => r.status !== 'DONE').length : rows.filter((r) => r.status === 'DONE').length;

  const resetFilters = () => {
    setSearchKeyword('');
    setSelectedStage('ALL');
    setSelectedOwner('ALL');
  };

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchKeyword('');
    setSelectedStage('ALL');
    setSelectedOwner('ALL');
  };

  const handleStatusChange = useCallback(
    async (todoId: string, currentStatus: DealTodoStatusValue, nextStatus: DealTodoStatusValue) => {
      if (currentStatus === nextStatus) {
        return;
      }

      setUpdateError(null);
      setPendingTodoId(todoId);
      setPendingStatus(nextStatus);

      try {
        await updateUserDealTodoStatus({ id: todoId, status: nextStatus });
        await refetchUsers();
      } catch (_error) {
        setUpdateError('TODO 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setPendingTodoId(null);
        setPendingStatus(null);
      }
    },
    [updateUserDealTodoStatus, refetchUsers],
  );

  const openDoneConfirm = (todoId: string, customerName: string, title: string) => {
    setConfirmDoneTodoId(todoId);
    setConfirmDoneCustomerName(customerName);
    setConfirmDoneTitle(title);
  };

  const closeDoneConfirm = () => {
    setConfirmDoneTodoId(null);
    setConfirmDoneCustomerName('');
    setConfirmDoneTitle('');
  };

  const confirmDone = async () => {
    if (!confirmDoneTodoId) {
      return;
    }

    await handleStatusChange(confirmDoneTodoId, 'DOING', 'DONE');
    closeDoneConfirm();
  };

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">TODO 리스트</h1>
          <p className="mt-1 text-sm text-slate-600">전체 고객의 투두를 표로 조회하고 상태를 바로 변경합니다.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          총 {filteredRows.length}건 / {activeTab === 'active' ? '진행중' : '완료됨'} {totalTabRows}건
        </div>
      </header>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => switchTab('active')}
              className={`border-b-2 py-3.5 text-sm font-medium transition-colors ${activeTab === 'active' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              진행중
              <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                {rows.filter((r) => r.status !== 'DONE').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('done')}
              className={`border-b-2 py-3.5 text-sm font-medium transition-colors ${activeTab === 'done' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              완료됨
              <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                {rows.filter((r) => r.status === 'DONE').length}
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_220px_220px_auto]">
            <Input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="고객명, 제목, 설명 검색" />
            <select
              value={selectedStage}
              onChange={(event) => setSelectedStage(event.target.value as 'ALL' | DealStageValue)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="ALL">전체 단계</option>
              {DEAL_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
            <select
              value={selectedOwner}
              onChange={(event) => setSelectedOwner(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="ALL">전체 담당자</option>
              {ownerOptions.map((owner) => (
                <option key={owner.value} value={owner.value}>
                  {owner.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={resetFilters}>
              필터 초기화
            </Button>
          </div>
        </div>

        {updateError ? <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{updateError}</div> : null}
        {error ? <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">TODO 목록을 불러오지 못했습니다.</div> : null}

        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>고객</Th>
                <Th>담당자</Th>
                <Th>단계</Th>
                <Th>제목</Th>
                <Th>생성일</Th>
                <Th>완료일</Th>
                <Th>액션</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <Td colSpan={7} className="text-center text-slate-500">
                    TODO 목록을 불러오는 중...
                  </Td>
                </tr>
              ) : null}

              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <Td colSpan={7} className="text-center text-slate-500">
                    조건에 맞는 TODO가 없습니다.
                  </Td>
                </tr>
              ) : null}

              {!loading
                ? filteredRows.map((row) => (
                    <tr key={row.todoId}>
                      <Td>
                        <div className="text-base font-semibold text-slate-900">{row.customerName}</div>
                      </Td>
                      <Td>{row.ownerName}</Td>
                      <Td><StageChip stage={row.stage} /></Td>
                      <Td>
                        <div className="min-w-[220px] font-medium text-slate-900">{row.title}</div>
                      </Td>
                      <Td>{formatDateTime(row.createdAt)}</Td>
                      <Td>{formatDateTime(row.completedAt)}</Td>
                      <Td>
                        {activeTab === 'active' ? (
                          <div className="flex min-w-[240px] flex-wrap gap-2">
                            {STATUS_OPTIONS.filter((o) => o.value !== 'DONE').map((option) => {
                              const isActive = row.status === option.value;
                              const isPending = todoUpdating && pendingTodoId === row.todoId && pendingStatus === option.value;

                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isActive ? 'default' : 'outline'}
                                  disabled={todoUpdating || isActive}
                                  onClick={() => handleStatusChange(row.todoId, row.status, option.value)}
                                >
                                  {isPending ? '저장 중...' : option.label}
                                </Button>
                              );
                            })}
                            <button
                              type="button"
                              disabled={todoUpdating}
                              onClick={() => openDoneConfirm(row.todoId, row.customerName, row.title)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {todoUpdating && pendingTodoId === row.todoId && pendingStatus === 'DONE' ? '저장 중...' : '완료'}
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={todoUpdating}
                            onClick={() => handleStatusChange(row.todoId, 'DONE', 'DOING')}
                          >
                            {todoUpdating && pendingTodoId === row.todoId ? '저장 중...' : '되돌리기'}
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))
                : null}
            </tbody>
          </Table>
        </div>
      </Card>

      {confirmDoneTodoId ? (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={closeDoneConfirm} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
              <h2 className="text-lg font-semibold text-slate-900">완료 처리</h2>
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{confirmDoneCustomerName}</span>의{' '}
                <span className="font-medium text-slate-800">"{confirmDoneTitle}"</span> 항목을 완료 처리하시겠어요?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDoneConfirm} disabled={todoUpdating}>
                  취소
                </Button>
                <button
                  type="button"
                  onClick={confirmDone}
                  disabled={todoUpdating}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {todoUpdating ? '처리 중...' : '완료 처리'}
                </button>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
