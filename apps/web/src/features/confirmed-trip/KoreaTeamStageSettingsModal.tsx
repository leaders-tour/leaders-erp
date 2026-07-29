import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  KOREA_TEAM_STAGE_COLOR_LABELS,
  KOREA_TEAM_STAGE_COLOR_TONES,
  type KoreaTeamStageColorTone,
  koreaTeamStageChipClass,
  koreaTeamStageSwatchClass,
} from './korea-team-stage-colors';
import {
  useConfirmedTripKoreaTeamStageOptions,
  useCreateConfirmedTripKoreaTeamStageOption,
  useDeleteConfirmedTripKoreaTeamStageOption,
  useReorderConfirmedTripKoreaTeamStageOptions,
  useUpdateConfirmedTripKoreaTeamStageOption,
  type ConfirmedTripKoreaTeamStageOptionRow,
} from './hooks';

interface KoreaTeamStageSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function SettingsIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function SortableOptionRow({
  option,
  saving,
  onSaveLabel,
  onSaveColor,
  onDelete,
}: {
  option: ConfirmedTripKoreaTeamStageOptionRow;
  saving: boolean;
  onSaveLabel: (id: string, label: string) => Promise<void>;
  onSaveColor: (id: string, colorTone: KoreaTeamStageColorTone) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}): JSX.Element {
  const [labelDraft, setLabelDraft] = useState(option.label);
  const [colorOpen, setColorOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
    disabled: saving,
  });

  useEffect(() => {
    setLabelDraft(option.label);
  }, [option.label]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-3 ${isDragging ? 'opacity-70 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
          aria-label="순서 변경"
          disabled={saving}
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={labelDraft}
              disabled={saving}
              maxLength={50}
              onChange={(event) => setLabelDraft(event.target.value)}
              onBlur={() => {
                const next = labelDraft.trim();
                if (!next || next === option.label) {
                  setLabelDraft(option.label);
                  return;
                }
                void onSaveLabel(option.id, next).catch((error) => {
                  setLabelDraft(option.label);
                  window.alert(error instanceof Error ? error.message : '이름 저장에 실패했습니다.');
                });
              }}
              className="min-w-[8rem] flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-900"
            />
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${koreaTeamStageChipClass(option.colorTone)}`}
            >
              {labelDraft.trim() || option.label}
            </span>
          </div>

          <div className="mt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setColorOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className={`h-3.5 w-3.5 rounded-full ${koreaTeamStageSwatchClass(option.colorTone as KoreaTeamStageColorTone)}`} />
              색상: {KOREA_TEAM_STAGE_COLOR_LABELS[option.colorTone as KoreaTeamStageColorTone] ?? option.colorTone}
            </button>
            {colorOpen ? (
              <div className="mt-2 grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                {KOREA_TEAM_STAGE_COLOR_TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    disabled={saving}
                    title={KOREA_TEAM_STAGE_COLOR_LABELS[tone]}
                    onClick={() => {
                      setColorOpen(false);
                      if (tone === option.colorTone) {
                        return;
                      }
                      void onSaveColor(option.id, tone).catch((error) => {
                        window.alert(error instanceof Error ? error.message : '색상 저장에 실패했습니다.');
                      });
                    }}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-white ${
                      option.colorTone === tone ? 'bg-white ring-2 ring-slate-800' : ''
                    }`}
                  >
                    <span className={`h-5 w-5 rounded-full ${koreaTeamStageSwatchClass(tone)}`} />
                    <span className="text-[10px] text-slate-600">{KOREA_TEAM_STAGE_COLOR_LABELS[tone]}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (!window.confirm(`"${option.label}" 옵션을 삭제할까요?`)) {
              return;
            }
            void onDelete(option.id).catch((error) => {
              window.alert(error instanceof Error ? error.message : '삭제에 실패했습니다.');
            });
          }}
          className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export function KoreaTeamStageSettingsModal({ open, onClose }: KoreaTeamStageSettingsModalProps): JSX.Element | null {
  const { options, loading } = useConfirmedTripKoreaTeamStageOptions(true);
  const { createOption, loading: creating } = useCreateConfirmedTripKoreaTeamStageOption();
  const { updateOption, loading: updating } = useUpdateConfirmedTripKoreaTeamStageOption();
  const { deleteOption, loading: deleting } = useDeleteConfirmedTripKoreaTeamStageOption();
  const { reorderOptions, loading: reordering } = useReorderConfirmedTripKoreaTeamStageOptions();
  const [items, setItems] = useState<ConfirmedTripKoreaTeamStageOptionRow[]>([]);
  const [draftLabel, setDraftLabel] = useState('');

  const saving = creating || updating || deleting || reordering;

  useEffect(() => {
    if (!open) {
      return;
    }
    setItems([...options].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)));
  }, [open, options]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  if (!open) {
    return null;
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const nextItems = arrayMove(items, oldIndex, newIndex);
    setItems(nextItems);
    try {
      const reordered = await reorderOptions(nextItems.map((item, index) => ({ id: item.id, sortOrder: index })));
      setItems(reordered);
    } catch (error) {
      setItems([...options].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)));
      window.alert(error instanceof Error ? error.message : '순서 저장에 실패했습니다.');
    }
  }

  async function handleCreate(): Promise<void> {
    const label = draftLabel.trim();
    if (!label || creating) {
      return;
    }
    try {
      await createOption(label);
      setDraftLabel('');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '옵션 추가에 실패했습니다.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <SettingsIcon />
              <h2 className="text-lg font-semibold">한국팀 진행단계 설정</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">이름·색상·순서를 관리합니다. 사용 중인 옵션은 삭제할 수 없습니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">등록된 진행단계가 없습니다.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(event)}>
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <div className="grid gap-2">
                  {items.map((option) => (
                    <SortableOptionRow
                      key={option.id}
                      option={option}
                      saving={saving}
                      onSaveLabel={async (id, label) => {
                        const updated = await updateOption(id, { label });
                        setItems((current) => current.map((row) => (row.id === id ? updated : row)));
                      }}
                      onSaveColor={async (id, colorTone) => {
                        const updated = await updateOption(id, { colorTone });
                        setItems((current) => current.map((row) => (row.id === id ? updated : row)));
                      }}
                      onDelete={async (id) => {
                        await deleteOption(id);
                        setItems((current) => current.filter((row) => row.id !== id));
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">새 옵션 추가</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={draftLabel}
              disabled={saving}
              maxLength={50}
              placeholder="예: 확정서"
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <button
              type="button"
              disabled={saving || !draftLabel.trim()}
              onClick={() => {
                void handleCreate();
              }}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function KoreaTeamStageSettingsTrigger({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
    >
      <SettingsIcon />
      <span>진행단계 설정</span>
    </button>
  );
}
