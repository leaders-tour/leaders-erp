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
import { Card, dealPipelineTokens } from '@tour/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../features/auth/context';
import {
  useCreateUserNote,
  useReorderDealPipeline,
  useUpdateUserDealTodoStatus,
  useUserDealTodos,
  useUserNotes,
  useUsers,
  type DealPipelineCardUpdateInput,
  type DealStageValue,
  type DealTodoStatusValue,
  type UserDealTodoRow,
  type UserNoteRow,
  type UserRow,
} from '../features/plan/hooks';

const STAGES: Array<{ key: DealStageValue; label: string }> = [
  { key: 'CONSULTING', label: '컨설팅' },
  { key: 'CONTRACTING', label: '계약단계' },
  { key: 'CONTRACT_CONFIRMED', label: '계약확정' },
  { key: 'MONGOL_ASSIGNING', label: '몽골배정단계' },
  { key: 'MONGOL_ASSIGNED', label: '몽골배정완료' },
  { key: 'ON_HOLD', label: '대기중' },
  { key: 'BEFORE_DEPARTURE_10D', label: '출발 10일이내' },
  { key: 'BEFORE_DEPARTURE_3D', label: '출발 3일이내' },
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR');
}

function formatDateTimeParts(value: string): { date: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: '-', time: '' };
  }
  return {
    date: date.toLocaleDateString('ko-KR'),
    time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function stageLabel(stage: DealStageValue): string {
  return STAGES.find((item) => item.key === stage)?.label ?? stage;
}

function todoStatusLabel(status: DealTodoStatusValue): string {
  if (status === 'TODO') {
    return 'TODO';
  }
  if (status === 'DOING') {
    return '진행중';
  }
  return '완료';
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

function PipelineCard({
  user,
  disabled,
  onClick,
}: {
  user: UserRow;
  disabled: boolean;
  onClick: (userId: string) => void;
}): JSX.Element {
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
  const stageTodos = (user.userDealTodos ?? []).filter((todo) => todo.stage === user.dealStage);
  const previewTodos = stageTodos.slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={disabled ? undefined : dealPipelineTokens.card.wrapperCursor}
      onClick={() => {
        if (disabled) {
          return;
        }
        onClick(user.id);
      }}
    >
      <Card className={`${dealPipelineTokens.card.base} ${isDragging ? dealPipelineTokens.card.dragging : ''}`}>
        <div className="grid gap-1">
          <p className={dealPipelineTokens.card.title}>{user.name}</p>
          <p className={dealPipelineTokens.card.subtitle}>{user.email ?? '이메일 없음'}</p>
        </div>

        <div className={dealPipelineTokens.card.todoPreviewWrap}>
          <div className={dealPipelineTokens.card.todoPreviewHeader}>
            <span className={dealPipelineTokens.card.todoPreviewLabel}>TODO</span>
            <span className={dealPipelineTokens.card.todoPreviewCount}>{stageTodos.length}</span>
          </div>

          {previewTodos.length === 0 ? (
            <p className={dealPipelineTokens.card.todoPreviewEmpty}>현재 단계 TODO 없음</p>
          ) : (
            <div className={dealPipelineTokens.card.todoPreviewTimelineList}>
              {previewTodos.map((todo, index) => (
                <div key={todo.id} className={dealPipelineTokens.card.todoPreviewTimelineItem}>
                  <div className={dealPipelineTokens.card.todoPreviewRail}>
                    <span
                      className={`${dealPipelineTokens.card.todoPreviewBulletBase} ${
                        todo.status === 'DONE'
                          ? dealPipelineTokens.card.todoPreviewBulletDone
                          : dealPipelineTokens.card.todoPreviewBulletActive
                      }`}
                    >
                      {index + 1}
                    </span>
                    {index < previewTodos.length - 1 ? <span className={dealPipelineTokens.card.todoPreviewConnector} /> : null}
                  </div>
                  <p className={todo.status === 'DONE' ? dealPipelineTokens.card.todoPreviewTextDone : dealPipelineTokens.card.todoPreviewText}>
                    {todo.title}
                  </p>
                </div>
              ))}

              {stageTodos.length > previewTodos.length ? (
                <p className={dealPipelineTokens.card.todoPreviewMore}>+{stageTodos.length - previewTodos.length}개 더</p>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function PipelineColumn({
  stage,
  users,
  dragDisabled,
  onCardClick,
}: {
  stage: { key: DealStageValue; label: string };
  users: UserRow[];
  dragDisabled: boolean;
  onCardClick: (userId: string) => void;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: columnId(stage.key) });

  return (
    <section
      ref={setNodeRef}
      className={`${dealPipelineTokens.column.base} ${isOver ? dealPipelineTokens.column.over : ''}`}
    >
      <header className={dealPipelineTokens.column.header}>
        <h2 className={dealPipelineTokens.column.title}>{stage.label}</h2>
        <span className={dealPipelineTokens.column.count}>{users.length}</span>
      </header>

      <SortableContext items={users.map((user) => user.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-2">
          {users.length === 0 ? (
            <Card className={dealPipelineTokens.column.emptyCard}>
              현재 단계에 고객이 없습니다.
            </Card>
          ) : null}

          {users.map((user) => (
            <PipelineCard key={user.id} user={user} disabled={dragDisabled} onClick={onCardClick} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function UserDetailDrawer({
  user,
  onClose,
  onTodoChanged,
}: {
  user: UserRow | null;
  onClose: () => void;
  onTodoChanged?: () => void;
}): JSX.Element | null {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<'note' | 'todo' | 'estimate'>('note');
  const [isNoteComposerOpen, setIsNoteComposerOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [todoError, setTodoError] = useState<string | null>(null);

  const userId = user?.id;
  const { notes, loading: notesLoading } = useUserNotes(userId);
  const { todos, loading: todosLoading, refetch: refetchTodos } = useUserDealTodos(userId, true);
  const { createUserNote, loading: noteCreating } = useCreateUserNote();
  const { updateUserDealTodoStatus, loading: todoUpdating } = useUpdateUserDealTodoStatus();

  useEffect(() => {
    setIsNoteComposerOpen(false);
    setNoteContent('');
    setNoteError(null);
    setTodoError(null);
  }, [userId]);

  if (!user) {
    return null;
  }

  const handleCreateNote = async () => {
    const content = noteContent.trim();
    const createdBy = employee?.name?.trim() ?? '';

    if (!content) {
      setNoteError('노트 내용을 입력해주세요.');
      return;
    }
    if (!createdBy) {
      setNoteError('작성자를 입력해주세요.');
      return;
    }

    setNoteError(null);
    try {
      await createUserNote({
        userId: user.id,
        content,
        createdBy,
      });
      setNoteContent('');
    } catch (_error) {
      setNoteError('노트 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleTodoStatusChange = async (todo: UserDealTodoRow, status: DealTodoStatusValue) => {
    if (todo.status === status) {
      return;
    }

    setTodoError(null);
    try {
      await updateUserDealTodoStatus({ id: todo.id, status });
      await refetchTodos();
      onTodoChanged?.();
    } catch (_error) {
      setTodoError('TODO 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const currentStageTodos = todos.filter((todo) => todo.stage === user.dealStage);

  return (
    <div className={dealPipelineTokens.drawer.overlay}>
      <button type="button" aria-label="닫기" className={dealPipelineTokens.drawer.backdrop} onClick={onClose} />
      <aside className={dealPipelineTokens.drawer.panel}>
        <header className={dealPipelineTokens.drawer.header}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={dealPipelineTokens.drawer.headingTopLabel}>고객정보</p>
              <h2 className={dealPipelineTokens.drawer.headingTitle}>{user.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={dealPipelineTokens.drawer.closeButton}
            >
              닫기
            </button>
          </div>

          <div className={dealPipelineTokens.drawer.infoCard}>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>이메일</span>
              <span>{user.email ?? '이메일 없음'}</span>
            </div>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>현재 단계</span>
              <span className={dealPipelineTokens.drawer.infoEmphasis}>{stageLabel(user.dealStage)}</span>
            </div>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>순서</span>
              <span>{user.dealStageOrder + 1}번째</span>
            </div>
          </div>
        </header>

        <div className={dealPipelineTokens.drawer.tabsWrap}>
          <div className={dealPipelineTokens.drawer.tabsRow}>
            {[
              { key: 'note', label: '노트' },
              { key: 'todo', label: 'TODO' },
              { key: 'estimate', label: '견적서' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'note' | 'todo' | 'estimate')}
                className={`${dealPipelineTokens.drawer.tabButtonBase} ${
                  activeTab === tab.key
                    ? dealPipelineTokens.drawer.tabButtonActive
                    : dealPipelineTokens.drawer.tabButtonInactive
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={dealPipelineTokens.drawer.contentWrap}>
          {activeTab === 'note' ? (
            <section className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className={dealPipelineTokens.drawer.sectionLabel}>노트</p>
                <button
                  type="button"
                  onClick={() => setIsNoteComposerOpen((current) => !current)}
                  className={dealPipelineTokens.drawer.noteComposerToggle}
                >
                  {isNoteComposerOpen ? '입력 닫기' : '노트 추가'}
                </button>
              </div>

              {isNoteComposerOpen ? (
                <Card className={dealPipelineTokens.drawer.noteComposerCard}>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <span className={dealPipelineTokens.drawer.fieldLabel}>작성자</span>
                      <div className={`${dealPipelineTokens.drawer.fieldInput} flex items-center bg-slate-50 text-slate-600`}>
                        {employee?.name ?? '알 수 없음'}
                      </div>
                    </div>

                    <label className="grid gap-1">
                      <span className={dealPipelineTokens.drawer.fieldLabel}>내용</span>
                      <textarea
                        rows={4}
                        value={noteContent}
                        onChange={(event) => setNoteContent(event.target.value)}
                        placeholder={`${user.name} 고객 관련 메모를 입력하세요.`}
                        className={dealPipelineTokens.drawer.fieldTextarea}
                      />
                    </label>

                    {noteError ? <p className={dealPipelineTokens.drawer.noteError}>{noteError}</p> : null}

                    <div>
                      <button
                        type="button"
                        onClick={handleCreateNote}
                        disabled={noteCreating}
                        className={dealPipelineTokens.drawer.noteSubmitButton}
                      >
                        {noteCreating ? '저장 중...' : '노트 저장'}
                      </button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {notesLoading ? <p className={dealPipelineTokens.drawer.notesLoading}>노트를 불러오는 중...</p> : null}

              <div className="grid gap-2">
                {notes.length === 0 ? (
                  <Card className={dealPipelineTokens.drawer.notesEmptyCard}>
                    아직 작성된 노트가 없습니다.
                  </Card>
                ) : null}
                {notes.map((note: UserNoteRow) => (
                  <Card key={note.id} className={dealPipelineTokens.drawer.noteItemCard}>
                    {(() => {
                      const parts = formatDateTimeParts(note.createdAt);
                      return (
                        <div className={dealPipelineTokens.drawer.noteMetaRow}>
                          <span className={dealPipelineTokens.drawer.noteMetaAuthor}>{note.createdBy}</span>
                          <span className="inline-flex items-center gap-2">
                            <span className={dealPipelineTokens.drawer.noteMetaDateStrong}>{parts.date}</span>
                            <span className={dealPipelineTokens.drawer.noteMetaTime}>{parts.time}</span>
                          </span>
                        </div>
                      );
                    })()}
                    <p className={dealPipelineTokens.drawer.noteText}>{note.content}</p>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'todo' ? (
            <section className="grid gap-3">
              <p className={dealPipelineTokens.drawer.sectionLabel}>TODO · {stageLabel(user.dealStage)}</p>

              {todoError ? <p className={dealPipelineTokens.drawer.todoError}>{todoError}</p> : null}
              {todosLoading ? <p className={dealPipelineTokens.drawer.todoLoading}>TODO를 불러오는 중...</p> : null}

              {currentStageTodos.length === 0 && !todosLoading ? (
                <Card className={dealPipelineTokens.drawer.todoEmptyCard}>현재 단계 TODO 없음</Card>
              ) : null}

              <div className={dealPipelineTokens.drawer.todoTimelineList}>
                {currentStageTodos.map((todo, index) => (
                  <div key={todo.id} className={dealPipelineTokens.drawer.todoTimelineItem}>
                    <div className={dealPipelineTokens.drawer.todoTimelineRail}>
                      <span
                        className={`${dealPipelineTokens.drawer.todoTimelineBulletBase} ${
                          todo.status === 'DONE'
                            ? dealPipelineTokens.drawer.todoTimelineBulletDone
                            : dealPipelineTokens.drawer.todoTimelineBulletActive
                        }`}
                      >
                        {index + 1}
                      </span>
                      {index < currentStageTodos.length - 1 ? (
                        <span className={dealPipelineTokens.drawer.todoTimelineConnector} />
                      ) : null}
                    </div>

                    <Card
                      className={todo.status === 'DONE' ? dealPipelineTokens.drawer.todoDoneCard : dealPipelineTokens.drawer.simpleCard}
                    >
                      <div
                        className={
                          todo.status === 'DONE' ? dealPipelineTokens.drawer.todoDoneMetaRow : dealPipelineTokens.drawer.todoItemMetaRow
                        }
                      >
                        <span>{formatDateTime(todo.createdAt)}</span>
                        <span>{todoStatusLabel(todo.status)}</span>
                      </div>
                      <p className={todo.status === 'DONE' ? dealPipelineTokens.drawer.todoDoneTitle : dealPipelineTokens.drawer.todoItemTitle}>
                        {todo.title}
                      </p>
                      {todo.description ? (
                        <p
                          className={
                            todo.status === 'DONE'
                              ? dealPipelineTokens.drawer.todoDoneDescription
                              : dealPipelineTokens.drawer.todoItemDescription
                          }
                        >
                          {todo.description}
                        </p>
                      ) : null}

                      <div className={dealPipelineTokens.drawer.todoStatusButtons}>
                        {(['TODO', 'DOING', 'DONE'] as DealTodoStatusValue[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={todoUpdating}
                            onClick={() => handleTodoStatusChange(todo, status)}
                            className={`${dealPipelineTokens.drawer.todoStatusButtonBase} ${
                              todo.status === status
                                ? todo.status === 'DONE'
                                  ? dealPipelineTokens.drawer.todoStatusButtonDoneActive
                                  : dealPipelineTokens.drawer.todoStatusButtonActive
                                : dealPipelineTokens.drawer.todoStatusButtonInactive
                            }`}
                          >
                            {todoStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'estimate' ? (
            <section className="grid gap-3">
              <p className={dealPipelineTokens.drawer.sectionLabel}>견적서</p>
              <Card className={dealPipelineTokens.drawer.simpleCard}>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 text-sm">
                  <span className="text-slate-500">고객명</span>
                  <span className="text-slate-900">{user.name}</span>
                  <span className="text-slate-500">현재 금액</span>
                  <span className="font-medium text-slate-900">0 원</span>
                  <span className="text-slate-500">상태</span>
                  <span className="text-slate-900">초안</span>
                </div>
              </Card>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function DealPipelinePage(): JSX.Element {
  const { users, loading, refetch: refetchUsers } = useUsers();
  const { reorderDealPipeline, loading: reorderLoading } = useReorderDealPipeline();

  const [search, setSearch] = useState('');
  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousBoardRef = useRef<BoardState | null>(null);

  useEffect(() => {
    const nextBoard = buildBoard(users);
    setBoard((current) => (boardsEqual(current, nextBoard) ? current : nextBoard));
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
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedUser = useMemo(() => {
    if (!selectedUserId) {
      return null;
    }
    for (const stage of STAGES) {
      const found = board[stage.key].find((user) => user.id === selectedUserId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [board, selectedUserId]);

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
      void refetchUsers();
    } catch (_error) {
      if (before) {
        setBoard(before);
      }
      setErrorMessage('단계 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <section className={dealPipelineTokens.board.section}>
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

      {normalizedKeyword ? <p className={dealPipelineTokens.board.searchHint}>검색 중에는 드래그를 잠시 비활성화합니다.</p> : null}

      {errorMessage ? <p className={dealPipelineTokens.board.errorText}>{errorMessage}</p> : null}

      {loading ? <div className={dealPipelineTokens.board.loadingText}>고객 데이터를 불러오는 중...</div> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={dealPipelineTokens.board.track}>
          <div className={dealPipelineTokens.board.grid}>
            {STAGES.map((stage) => (
              <PipelineColumn
                key={stage.key}
                stage={stage}
                users={displayedBoard[stage.key]}
                dragDisabled={dragDisabled}
                onCardClick={setSelectedUserId}
              />
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

      <UserDetailDrawer
        user={selectedUser}
        onClose={() => setSelectedUserId(null)}
        onTodoChanged={() => {
          void refetchUsers();
        }}
      />
    </section>
  );
}
