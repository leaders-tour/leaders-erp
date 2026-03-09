import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
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

function stageLabel(stage: DealStageValue): string {
  return DEAL_STAGES.find((item) => item.value === stage)?.label ?? stage;
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

export function TodoListPage(): JSX.Element {
  const { users, loading, error, refetch: refetchUsers } = useUsers();
  const { updateUserDealTodoStatus, loading: todoUpdating } = useUpdateUserDealTodoStatus();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStage, setSelectedStage] = useState<'ALL' | DealStageValue>('ALL');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<DealTodoStatusValue[]>(['TODO', 'DOING']);
  const [pendingTodoId, setPendingTodoId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<DealTodoStatusValue | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  const filteredRows = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return rows.filter((row) => {
      if (selectedStage !== 'ALL' && row.stage !== selectedStage) {
        return false;
      }

      if (selectedOwner !== 'ALL' && row.ownerFilterValue !== selectedOwner) {
        return false;
      }

      if (!statusFilter.includes(row.status)) {
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
  }, [rows, searchKeyword, selectedOwner, selectedStage, statusFilter]);

  const toggleStatusFilter = (status: DealTodoStatusValue) => {
    setStatusFilter((current) => {
      if (current.includes(status)) {
        return current.length === 1 ? current : current.filter((item) => item !== status);
      }

      return [...current, status];
    });
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setSelectedStage('ALL');
    setSelectedOwner('ALL');
    setStatusFilter(['TODO', 'DOING']);
  };

  const handleStatusChange = async (todoId: string, currentStatus: DealTodoStatusValue, nextStatus: DealTodoStatusValue) => {
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
  };

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">TODO 리스트</h1>
          <p className="mt-1 text-sm text-slate-600">전체 고객의 투두를 표로 조회하고 상태를 바로 변경합니다.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          총 {filteredRows.length}건 / 전체 {rows.length}건
        </div>
      </header>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((option) => {
              const active = statusFilter.includes(option.value);

              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => toggleStatusFilter(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
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
                <Th>설명</Th>
                <Th>상태</Th>
                <Th>생성일</Th>
                <Th>완료일</Th>
                <Th>액션</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <Td colSpan={9} className="text-center text-slate-500">
                    TODO 목록을 불러오는 중...
                  </Td>
                </tr>
              ) : null}

              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <Td colSpan={9} className="text-center text-slate-500">
                    조건에 맞는 TODO가 없습니다.
                  </Td>
                </tr>
              ) : null}

              {!loading
                ? filteredRows.map((row) => (
                    <tr key={row.todoId}>
                      <Td>
                        <div className="font-medium text-slate-900">{row.customerName}</div>
                      </Td>
                      <Td>{row.ownerName}</Td>
                      <Td>{stageLabel(row.stage)}</Td>
                      <Td>
                        <div className="min-w-[220px] font-medium text-slate-900">{row.title}</div>
                      </Td>
                      <Td className="max-w-[320px] whitespace-pre-wrap text-sm text-slate-600">
                        {row.description?.trim() ? row.description : '-'}
                      </Td>
                      <Td>{statusLabel(row.status)}</Td>
                      <Td>{formatDateTime(row.createdAt)}</Td>
                      <Td>{formatDateTime(row.completedAt)}</Td>
                      <Td>
                        <div className="flex min-w-[240px] flex-wrap gap-2">
                          {STATUS_OPTIONS.map((option) => {
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
                        </div>
                      </Td>
                    </tr>
                  ))
                : null}
            </tbody>
          </Table>
        </div>
      </Card>
    </section>
  );
}
