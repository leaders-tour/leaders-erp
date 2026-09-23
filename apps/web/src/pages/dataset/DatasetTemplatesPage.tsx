import { Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import {
  useAddCatalogJourneyPlacement,
  useCatalogBlocks,
  useCatalogJourneys,
  useCreateCatalogJourney,
  useRemoveCatalogJourneyPlacement,
} from '../../features/dataset/hooks';
import { DatasetPageFooter, DatasetStubNotice, StatusBadge } from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import {
  DatasetButton,
  DatasetCard,
  DatasetField,
  DatasetPageHeader,
  DatasetPageShell,
  DatasetTabs,
  datasetControlClass,
} from '../../features/dataset/ui';

export function DatasetTemplatesPage(): JSX.Element {
  const [mode, setMode] = useState<'source' | 'usage'>('source');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dayCount, setDayCount] = useState(5);
  const [nightCount, setNightCount] = useState(4);
  const [blockId, setBlockId] = useState('');
  const [dayOffset, setDayOffset] = useState(0);

  const journeysQuery = useCatalogJourneys();
  const blocksQuery = useCatalogBlocks();
  const [createJourney, createState] = useCreateCatalogJourney();
  const [addPlacement, addState] = useAddCatalogJourneyPlacement();
  const [removePlacement] = useRemoveCatalogJourneyPlacement();

  const journeys = journeysQuery.data?.catalogJourneys ?? [];
  const blocks = blocksQuery.data?.catalogBlocks ?? [];
  const selected = useMemo(
    () => (selectedId ? journeys.find((row) => row.id === selectedId) ?? null : null),
    [journeys, selectedId],
  );

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 여정 템플릿"
          title="여정 템플릿"
          description="블록 사용본을 순서와 일차 오프셋으로 배치합니다. 기존 견적 빌더는 바꾸지 않습니다."
        />

        <DatasetTabs
          items={[
            { id: 'source', label: '원본 관리' },
            { id: 'usage', label: '사용본 조회' },
          ]}
          activeId={mode}
          onChange={(id) => setMode(id as 'source' | 'usage')}
        />

        {mode === 'usage' ? (
          <DatasetStubNotice message="고객 일정 사용본은 빌더 연동 전이라 미연동입니다." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <DatasetCard>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold">여정 목록</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr className="bg-slate-50">
                      <Th>여정</Th>
                      <Th>기간</Th>
                      <Th>구성</Th>
                      <Th>지표</Th>
                      <Th>상태</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {journeys.map((row) => (
                      <tr
                        key={row.id}
                        className={`cursor-pointer border-t border-slate-100 hover:bg-[#F8F6FF] ${selectedId === row.id ? 'bg-[#F8F6FF]' : ''}`}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <Td>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-[#9A93C2]">
                            {row.code} · v{row.version}
                          </div>
                        </Td>
                        <Td>
                          {row.nightCount}박{row.dayCount}일
                        </Td>
                        <Td>블록 {row.placements.length}개</Td>
                        <Td>{row.calcStatusText}</Td>
                        <Td>
                          <StatusBadge status={row.status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-4">
                <DatasetField label="새 여정 이름">
                  <Input className={datasetControlClass} value={name} onChange={(event) => setName(event.target.value)} />
                </DatasetField>
                <DatasetField label="일수">
                  <Input
                    className={datasetControlClass}
                    type="number"
                    value={dayCount}
                    onChange={(event) => setDayCount(Number(event.target.value) || 1)}
                  />
                </DatasetField>
                <DatasetField label="박수">
                  <Input
                    className={datasetControlClass}
                    type="number"
                    value={nightCount}
                    onChange={(event) => setNightCount(Number(event.target.value) || 0)}
                  />
                </DatasetField>
                <div className="flex items-end">
                  <DatasetButton
                    type="button"
                    variant="primary"
                    disabled={!name.trim() || createState.loading}
                    onClick={() => void createJourney({ variables: { input: { name: name.trim(), dayCount, nightCount } } })}
                  >
                    등록
                  </DatasetButton>
                </div>
              </div>
            </DatasetCard>

            <DatasetCard>
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold">{selected ? selected.name : '여정을 선택하세요'}</h2>
                {selected ? (
                  <p className="mt-1 text-xs text-[#8B83B8]">
                    {selected.code} · 지표는 {selected.calcStatusText}. 가짜 총액을 만들지 않습니다.
                  </p>
                ) : null}
              </div>
              {selected ? (
                <div className="grid gap-3 p-4">
                  {selected.placements.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                      <span>
                        +{item.dayOffset}일 · {item.block.name} ({item.block.dayCount}일)
                      </span>
                      <DatasetButton type="button" variant="ghost" onClick={() => void removePlacement({ variables: { id: item.id } })}>
                        제외
                      </DatasetButton>
                    </div>
                  ))}
                  <DatasetField label="블록 추가">
                    <select className={datasetControlClass} value={blockId} onChange={(event) => setBlockId(event.target.value)}>
                      <option value="">선택</option>
                      {blocks.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </DatasetField>
                  <DatasetField label="일차 오프셋">
                    <Input
                      className={datasetControlClass}
                      type="number"
                      value={dayOffset}
                      onChange={(event) => setDayOffset(Number(event.target.value) || 0)}
                    />
                  </DatasetField>
                  <DatasetButton
                    type="button"
                    variant="primary"
                    disabled={!blockId || addState.loading}
                    onClick={() =>
                      void addPlacement({ variables: { input: { journeyId: selected.id, blockId, dayOffset } } })
                    }
                  >
                    배치
                  </DatasetButton>
                </div>
              ) : (
                <p className="px-4 py-8 text-sm text-slate-500">목록에서 여정 이름을 누르면 상세가 열립니다.</p>
              )}
            </DatasetCard>
          </div>
        )}

        <DatasetPageFooter screenId="T04-01 · 여정 템플릿" />
      </section>
    </DatasetPageShell>
  );
}
