import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@tour/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useReorderDealPipeline,
  useUsers,
  type DealPipelineCardUpdateInput,
  type DealStageValue,
  type UserRow,
} from '../features/plan/hooks';

const STAGES: Array<{ key: DealStageValue; label: string }> = [
  { key: 'CONSULTING', label: '컨설팅' },
  { key: 'CONTRACTING', label: '계약단계' },
  { key: 'CONTRACT_CONFIRMED', label: '계약확정' },
  { key: 'MONGOL_ASSIGNING', label: '몽골배정단계' },
  { key: 'MONGOL_ASSIGNED', label: '몽골배정완료' },
  { key: 'ON_HOLD', label: '대기중' },
  { key: 'BEFORE_DEPARTURE_10D', label: '출발10일전' },
  { key: 'BEFORE_DEPARTURE_3D', label: '출발3일전' },
  { key: 'TRIP_COMPLETED', label: '여행 완료시' },
];

type BoardState = Record<DealStageValue, UserRow[]>;

const COLUMN_PREFIX = 'column:';

function columnId(stage: DealStageValue): string {
  return `${COLUMN_PREFIX}${stage}`;
}

function isColumnId(id: string): boolean {
  return id.startsWith(COLUMN_PREFIX);
}

function parseColumnId(id: string): DealStageValue | null {
  if (!isColumnId(id)) {
    return null;
  }

  const stage = id.slice(COLUMN_PREFIX.length) as DealStageValue;
  return STAGES.some((item) => item.key === stage) ? stage : null;
}

function createEmptyBoard(): BoardState {
  return STAGES.reduce((acc, stage) => {
    acc[stage.key] = [];
    return acc;
  }, {} as BoardState);
}

function sortUsersInStage(users: UserRow[]): UserRow[] {
  return users.slice().sort((left, right) => {
    if (left.dealStageOrder !== right.dealStageOrder) {
      return left.dealStageOrder - right.dealStageOrder;
    }
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return left.id.localeCompare(right.id);
  });
}

function buildBoard(users: UserRow[]): BoardState {
  const next = createEmptyBoard();

  for (const user of users) {
    if (!next[user.dealStage]) {
      next.CONSULTING.push({ ...user, dealStage: 'CONSULTING' });
      continue;
    }
    next[user.dealStage].push(user);
  }

  for (const stage of STAGES) {
    next[stage.key] = sortUsersInStage(next[stage.key]).map((user, index) => ({
      ...user,
      dealStage: stage.key,
      dealStageOrder: index,
    }));
  }

  return next;
}

function normalizeBoard(board: BoardState): BoardState {
  const next = createEmptyBoard();

  for (const stage of STAGES) {
    next[stage.key] = board[stage.key].map((user, index) => ({
      ...user,
      dealStage: stage.key,
      dealStageOrder: index,
    }));
  }

  return next;
}

function flattenBoardToUpdates(board: BoardState): DealPipelineCardUpdateInput[] {
  const updates: DealPipelineCardUpdateInput[] = [];

  for (const stage of STAGES) {
    for (const user of board[stage.key]) {
      updates.push({
        userId: user.id,
        dealStage: stage.key,
        dealStageOrder: user.dealStageOrder,
      });
    }
  }

  return updates;
}

function boardsEqual(left: BoardState, right: BoardState): boolean {
  for (const stage of STAGES) {
    const leftItems = left[stage.key];
    const rightItems = right[stage.key];
    if (leftItems.length !== rightItems.length) {
      return false;
    }

    for (let index = 0; index < leftItems.length; index += 1) {
      const leftItem = leftItems[index];
      const rightItem = rightItems[index];
      if (!leftItem || !rightItem) {
        return false;
      }
      if (leftItem.id !== rightItem.id || leftItem.dealStage !== rightItem.dealStage || leftItem.dealStageOrder !== rightItem.dealStageOrder) {
        return false;
      }
    }
  }

  return true;
}

function PipelineCard({ user, disabled }: { user: UserRow; disabled: boolean }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: user.id,
    disabled,
    data: {
      type: 'card',
      stage: user.dealStage,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${isDragging ? 'opacity-60' : ''}`}>
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email ?? '이메일 없음'}</p>
        </div>
      </Card>
    </div>
  );
}

function PipelineColumn({
  stage,
  users,
  dragDisabled,
}: {
  stage: { key: DealStageValue; label: string };
  users: UserRow[];
  dragDisabled: boolean;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: columnId(stage.key) });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border border-slate-200 bg-slate-100/70 p-3 transition-colors ${isOver ? 'bg-slate-200/60' : ''}`}
    >
      <header className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h2 className="text-sm font-semibold text-slate-900">{stage.label}</h2>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">{users.length}</span>
      </header>

      <SortableContext items={users.map((user) => user.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-2">
          {users.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-3 text-xs text-slate-500 shadow-none">
              현재 단계에 고객이 없습니다.
            </Card>
          ) : null}

          {users.map((user) => (
            <PipelineCard key={user.id} user={user} disabled={dragDisabled} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function DealPipelinePage(): JSX.Element {
  const { users, loading } = useUsers();
  const { reorderDealPipeline, loading: reorderLoading } = useReorderDealPipeline();

  const [search, setSearch] = useState('');
  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousBoardRef = useRef<BoardState | null>(null);

  useEffect(() => {
    setBoard(buildBoard(users));
  }, [users]);

  const normalizedKeyword = search.trim().toLowerCase();
  const dragDisabled = normalizedKeyword.length > 0 || reorderLoading;

  const displayedBoard = useMemo(() => {
    if (!normalizedKeyword) {
      return board;
    }

    const filtered = createEmptyBoard();
    for (const stage of STAGES) {
      filtered[stage.key] = board[stage.key].filter((user) => {
        const nameMatched = user.name.toLowerCase().includes(normalizedKeyword);
        const emailMatched = user.email?.toLowerCase().includes(normalizedKeyword) ?? false;
        return nameMatched || emailMatched;
      });
    }

    return filtered;
  }, [board, normalizedKeyword]);

  const activeUser = useMemo(() => {
    if (!activeUserId) {
      return null;
    }
    for (const stage of STAGES) {
      const found = board[stage.key].find((user) => user.id === activeUserId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [activeUserId, board]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findContainer = (id: string): DealStageValue | null => {
    const asColumn = parseColumnId(id);
    if (asColumn) {
      return asColumn;
    }

    for (const stage of STAGES) {
      if (board[stage.key].some((user) => user.id === id)) {
        return stage.key;
      }
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (dragDisabled) {
      return;
    }
    previousBoardRef.current = board;
    setActiveUserId(String(event.active.id));
    setErrorMessage(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (dragDisabled) {
      return;
    }

    const over = event.over;
    if (!over) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      if (isColumnId(overId)) {
        return;
      }

      setBoard((current) => {
        const currentItems = current[activeContainer];
        const oldIndex = currentItems.findIndex((user) => user.id === activeId);
        const newIndex = currentItems.findIndex((user) => user.id === overId);

        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
          return current;
        }

        return {
          ...current,
          [activeContainer]: arrayMove(currentItems, oldIndex, newIndex),
        };
      });

      return;
    }

    setBoard((current) => {
      const sourceItems = current[activeContainer];
      const sourceIndex = sourceItems.findIndex((user) => user.id === activeId);
      if (sourceIndex < 0) {
        return current;
      }

      const moving = sourceItems[sourceIndex];
      if (!moving) {
        return current;
      }

      const nextSource = sourceItems.filter((user) => user.id !== activeId);
      const targetItems = current[overContainer];
      const targetIndex = isColumnId(overId) ? targetItems.length : targetItems.findIndex((user) => user.id === overId);
      const insertIndex = targetIndex < 0 ? targetItems.length : targetIndex;

      const nextTarget = [
        ...targetItems.slice(0, insertIndex),
        {
          ...moving,
          dealStage: overContainer,
        },
        ...targetItems.slice(insertIndex),
      ];

      return {
        ...current,
        [activeContainer]: nextSource,
        [overContainer]: nextTarget,
      };
    });
  };

  const handleDragCancel = () => {
    if (previousBoardRef.current) {
      setBoard(previousBoardRef.current);
    }
    previousBoardRef.current = null;
    setActiveUserId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const over = event.over;

    if (!over) {
      if (previousBoardRef.current) {
        setBoard(previousBoardRef.current);
      }
      previousBoardRef.current = null;
      setActiveUserId(null);
      return;
    }

    const normalized = normalizeBoard(board);
    const before = previousBoardRef.current;

    setBoard(normalized);
    previousBoardRef.current = null;
    setActiveUserId(null);

    if (!before || boardsEqual(before, normalized)) {
      return;
    }

    try {
      await reorderDealPipeline(flattenBoardToUpdates(normalized));
    } catch (_error) {
      if (before) {
        setBoard(before);
      }
      setErrorMessage('단계 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <section className="grid gap-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">딜 파이프라인</h1>
          <p className="mt-1 text-sm text-slate-600">고객의 진행 단계를 칸반 보드로 확인합니다.</p>
        </div>

        <label className="w-full md:w-[280px]">
          <span className="sr-only">고객 검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="고객명 또는 이메일 검색"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          />
        </label>
      </header>

      {normalizedKeyword ? (
        <p className="text-xs text-slate-500">검색 중에는 드래그를 잠시 비활성화합니다.</p>
      ) : null}

      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

      {loading ? <div className="text-sm text-slate-600">고객 데이터를 불러오는 중...</div> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-max grid-flow-col auto-cols-[260px] gap-4">
            {STAGES.map((stage) => (
              <PipelineColumn key={stage.key} stage={stage} users={displayedBoard[stage.key]} dragDisabled={dragDisabled} />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeUser ? (
            <Card className="w-[248px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-slate-900">{activeUser.name}</p>
                <p className="text-xs text-slate-500">{activeUser.email ?? '이메일 없음'}</p>
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
