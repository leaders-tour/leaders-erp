import { useState } from 'react';
import {
  useAddCatalogBlockDay,
  useAddCatalogBlockPlacement,
  useCatalogElements,
  useRemoveCatalogBlockPlacement,
  type CatalogBlockRow,
} from '../../features/dataset/hooks';
import { datasetTheme } from '../../features/dataset/theme';
import { DatasetButton, DatasetField, datasetControlClass } from '../../features/dataset/ui';

interface DatasetBlockDetailPanelProps {
  block: CatalogBlockRow;
  onClose: () => void;
}

export function DatasetBlockDetailPanel({ block, onClose }: DatasetBlockDetailPanelProps): JSX.Element {
  const { data } = useCatalogElements();
  const elements = data?.catalogElements ?? [];
  const [dayIndex, setDayIndex] = useState(1);
  const [elementId, setElementId] = useState('');
  const [addDay] = useAddCatalogBlockDay();
  const [addPlacement, addState] = useAddCatalogBlockPlacement();
  const [removePlacement] = useRemoveCatalogBlockPlacement();

  const days = Array.from({ length: Math.max(block.dayCount, 1) }, (_, index) => index + 1);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#2A2155]/35" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-6">
        <div className={`relative my-auto w-full max-w-3xl p-5 shadow-2xl ${datasetTheme.card}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#8B83B8]">일정 블록 / 1~n일 편집</p>
              <h2 className="text-lg font-semibold">{block.name}</h2>
              <p className="text-xs text-[#9A93C2]">
                {block.code} · v{block.version} · {block.dayCount}일 · 같은 블록 ID
              </p>
            </div>
            <DatasetButton type="button" variant="outline" onClick={onClose}>
              닫기
            </DatasetButton>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <DatasetButton type="button" variant="soft" onClick={() => void addDay({ variables: { id: block.id } })}>
              하루 추가
            </DatasetButton>
          </div>

          <div className="mt-4 grid gap-4">
            {days.map((day) => {
              const items = block.placements.filter((row) => row.dayIndex === day);
              return (
                <section key={day} className="rounded-xl border border-slate-100 p-3">
                  <h3 className="text-sm font-semibold">{day}일차</h3>
                  {items.length === 0 ? <p className="mt-2 text-xs text-[#9A93C2]">빈 날짜 유지 · 자동 비용 없음</p> : null}
                  <ul className="mt-2 grid gap-2">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between text-sm">
                        <span>
                          {item.element.name} <span className="text-xs text-[#9A93C2]">({item.element.code})</span>
                        </span>
                        <DatasetButton type="button" variant="ghost" onClick={() => void removePlacement({ variables: { id: item.id } })}>
                          제외
                        </DatasetButton>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_auto]">
            <DatasetField label="일차">
              <select className={datasetControlClass} value={dayIndex} onChange={(event) => setDayIndex(Number(event.target.value))}>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}일차
                  </option>
                ))}
              </select>
            </DatasetField>
            <DatasetField label="요소">
              <select className={datasetControlClass} value={elementId} onChange={(event) => setElementId(event.target.value)}>
                <option value="">선택</option>
                {elements.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </DatasetField>
            <div className="flex items-end">
              <DatasetButton
                type="button"
                variant="primary"
                disabled={!elementId || addState.loading}
                onClick={() => void addPlacement({ variables: { input: { blockId: block.id, elementId, dayIndex } } })}
              >
                배치
              </DatasetButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
