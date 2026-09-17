import { Input, Table, Td, Th } from '@tour/ui';
import { Fragment, useMemo, useState } from 'react';
import {
  DatasetPageFooter,
  DatasetStubNotice,
  TypePill,
  type CatalogBlockShape,
} from '../../features/dataset/labels';
import { useCatalogBlocks, useCreateCatalogBlock, type CatalogBlockRow } from '../../features/dataset/hooks';
import { datasetTheme } from '../../features/dataset/theme';
import {
  DatasetButton,
  DatasetCard,
  DatasetField,
  DatasetFilterBar,
  DatasetPageHeader,
  DatasetPageShell,
  DatasetSelectionBar,
  DatasetTabs,
  StubButton,
  datasetControlClass,
} from '../../features/dataset/ui';

type ModeTab = 'source' | 'usage';
type ShapeFilter = 'ALL' | CatalogBlockShape;

function formatDistanceTime(row: Pick<CatalogBlockRow, 'distanceKm' | 'travelHours'>): string {
  const distance = row.distanceKm != null ? `${row.distanceKm}km` : '-';
  const hours = row.travelHours != null ? `${row.travelHours}시간` : '-';
  return `${distance} · ${hours}`;
}

function calcTone(text: string): 'sky' | 'amber' | 'slate' {
  if (text.includes('계산됨')) return 'sky';
  if (text.includes('필요') || text.includes('확인')) return 'amber';
  return 'slate';
}

export function DatasetBlocksPage(): JSX.Element {
  const [mode, setMode] = useState<ModeTab>('source');
  const [shapeFilter, setShapeFilter] = useState<ShapeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createShape, setCreateShape] = useState<CatalogBlockShape>('DAY');

  const { data, loading, error } = useCatalogBlocks();
  const [createBlock, createState] = useCreateCatalogBlock();
  const rows = data?.catalogBlocks ?? [];

  const memberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      for (const item of row.setItems) {
        ids.add(item.memberBlock.id);
      }
    }
    return ids;
  }, [rows]);

  const topRows = useMemo(() => rows.filter((row) => !memberIds.has(row.id)), [memberIds, rows]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return topRows.filter((row) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (shapeFilter !== 'ALL' && row.shape !== shapeFilter) return false;
      if (!keyword) return true;
      return row.name.toLowerCase().includes(keyword) || row.code.toLowerCase().includes(keyword);
    });
  }, [search, shapeFilter, status, topRows]);

  const dayCount = topRows.filter((row) => row.shape === 'DAY').length;
  const setCount = topRows.filter((row) => row.shape === 'SET').length;

  const showStub = (message: string) => setStubMessage(message);

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    await createBlock({
      variables: {
        input: {
          name,
          shape: createShape,
        },
      },
    });
    setCreateOpen(false);
    setCreateName('');
  };

  return (
    <DatasetPageShell>
    <section className="grid gap-5">
      <DatasetPageHeader
        breadcrumb="일정 데이터 관리 / 일정 블록"
        title="일정 블록"
        description="하루 일정과 여러 날짜를 묶는 블록 세트를 관리합니다."
        actions={
          <>
            <StubButton label="대량 관리" onStub={() => showStub('대량 관리는 다음 단계에서 구현합니다.')} />
            <StubButton label="+ 블록 세트" onStub={() => showStub('블록 세트 만들기는 다음 단계에서 구현합니다.')} />
            <DatasetButton type="button" variant="primary" onClick={() => setCreateOpen(true)}>
              + 하루 블록 등록
            </DatasetButton>
          </>
        }
      />

      {stubMessage ? <DatasetStubNotice message={stubMessage} /> : null}

      <DatasetTabs
        items={[
          { id: 'source', label: '원본 관리' },
          { id: 'usage', label: '사용본 조회' },
        ]}
        activeId={mode}
        onChange={(id) => setMode(id as ModeTab)}
      />

      {mode === 'usage' ? (
        <div className="rounded-2xl border border-dashed border-[#D9D2F8] bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">사용본 조회는 아직 연결되지 않았습니다.</p>
          <p className="mt-2 text-sm text-slate-500">템플릿/견적에 배치된 블록 스냅샷은 다음 단계에서 표시합니다.</p>
        </div>
      ) : (
        <>
          <DatasetFilterBar>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="grid gap-1 text-xs text-[#8B83B8]">
                검색
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="블록명, 세트명, ID" />
              </label>
              <label className="grid gap-1 text-xs text-[#8B83B8]">
                사용 상태
                <select
                  className={datasetControlClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                >
                  <option value="ALL">전체</option>
                  <option value="ACTIVE">사용 중</option>
                  <option value="INACTIVE">사용 안 함</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-[#8B83B8]">
                비교 조건
                <Input value="6인 · 차량 1대" readOnly className="bg-slate-50" />
              </label>
              <label className="grid gap-1 text-xs text-[#8B83B8]">
                계산 기준
                <select className={datasetControlClass} defaultValue="basic">
                  <option value="basic">기본 조건</option>
                </select>
              </label>
              <div className="flex items-end">
                <StubButton label="+ 상세 조건 추가" onStub={() => showStub('상세 조건은 다음 단계에서 연결합니다.')} />
              </div>
            </div>
            <p className="text-xs text-slate-400">예상 값은 기본 조건 기준 시드 표시입니다. 실시간 재계산은 없습니다.</p>
          </DatasetFilterBar>

          <DatasetSelectionBar
            count={selectedIds.size}
            onClear={() => setSelectedIds(new Set())}
            actions={
              <>
                <StubButton label="일괄 수정" variant="soft" onStub={() => showStub('일괄 수정은 다음 단계에서 구현합니다.')} />
                <StubButton label="선택 삭제" variant="soft" onStub={() => showStub('선택 삭제는 다음 단계에서 구현합니다.')} />
                <StubButton label="선택 내보내기" variant="soft" onStub={() => showStub('내보내기는 다음 단계에서 구현합니다.')} />
                <StubButton label="선택으로 블록 세트" variant="soft" onStub={() => showStub('블록 세트 만들기는 다음 단계에서 구현합니다.')} />
              </>
            }
          />

          <DatasetCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">블록 목록</h2>
                <DatasetTabs
                  items={[
                    { id: 'ALL', label: `전체 ${topRows.length}` },
                    { id: 'DAY', label: `하루 블록 ${dayCount}` },
                    { id: 'SET', label: `블록 세트 ${setCount}` },
                  ]}
                  activeId={shapeFilter}
                  onChange={(id) => setShapeFilter(id as ShapeFilter)}
                />
              </div>
              <StubButton label="컬럼 설정" onStub={() => showStub('컬럼 설정은 다음 단계에서 구현합니다.')} />
            </div>

            {loading ? (
              <p className="px-4 py-8 text-sm text-slate-500">불러오는 중…</p>
            ) : error ? (
              <p className="px-4 py-8 text-sm text-rose-600">목록을 불러오지 못했습니다. API/마이그레이션을 확인하세요.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr className="bg-slate-50">
                      <Th />
                      <Th>블록명 / 버전</Th>
                      <Th>형태 · 일수</Th>
                      <Th>시작 → 종료</Th>
                      <Th>구성</Th>
                      <Th>이동거리 · 시간</Th>
                      <Th>시간 포화도</Th>
                      <Th>피로도</Th>
                      <Th>예상 원가</Th>
                      <Th>사용처</Th>
                      <Th>계산 상태</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const isSet = row.shape === 'SET';
                      const expanded = expandedIds.has(row.id);
                      return (
                        <Fragment key={row.id}>
                          <tr className="border-t border-slate-100 hover:bg-slate-50">
                            <Td>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(row.id)}
                                onChange={() =>
                                  setSelectedIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(row.id)) next.delete(row.id);
                                    else next.add(row.id);
                                    return next;
                                  })
                                }
                                aria-label={`${row.name} 선택`}
                              />
                            </Td>
                            <Td>
                              <div className="flex items-start gap-2">
                                {isSet ? (
                                  <button
                                    type="button"
                                    className="mt-0.5 text-slate-500"
                                    onClick={() =>
                                      setExpandedIds((current) => {
                                        const next = new Set(current);
                                        if (next.has(row.id)) next.delete(row.id);
                                        else next.add(row.id);
                                        return next;
                                      })
                                    }
                                  >
                                    {expanded ? '▾' : '▸'}
                                  </button>
                                ) : (
                                  <span className="w-3" />
                                )}
                                <div>
                                  <div className="font-medium text-slate-900">{row.name}</div>
                                  <div className="text-xs text-slate-400">
                                    {row.code} · v{row.version}
                                  </div>
                                </div>
                              </div>
                            </Td>
                            <Td>
                              <TypePill label={isSet ? `세트 · ${row.dayCount}일` : `하루 · ${row.dayCount}일`} tone={isSet ? 'violet' : 'slate'} />
                            </Td>
                            <Td>
                              {row.fromLabel ?? '-'} → {row.toLabel ?? '-'}
                            </Td>
                            <Td>{row.compositionText ?? '-'}</Td>
                            <Td>{formatDistanceTime(row)}</Td>
                            <Td>
                              {row.timeSaturationPct != null ? `${row.timeSaturationPct}%` : '-'}
                              {row.timeSaturationText ? ` · ${row.timeSaturationText}` : ''}
                            </Td>
                            <Td>{row.fatigueScore != null ? row.fatigueScore.toFixed(2) : '-'}</Td>
                            <Td>{row.estimatedCostText ?? '-'}</Td>
                            <Td>{row.usageCount}곳</Td>
                            <Td>
                              <TypePill label={row.calcStatusText} tone={calcTone(row.calcStatusText)} />
                            </Td>
                          </tr>
                          {expanded
                            ? row.setItems.map((item) => {
                                const child = item.memberBlock;
                                return (
                                  <tr key={item.id} className="border-t border-slate-100 bg-slate-50/80">
                                    <Td />
                                    <Td>
                                      <div className="pl-8">
                                        <div className="text-sm text-slate-800">{child.name}</div>
                                        <div className="text-xs text-slate-400">
                                          {child.code} · v{child.version}
                                        </div>
                                      </div>
                                    </Td>
                                    <Td>
                                      <TypePill label={`하루 · ${child.dayCount}일`} />
                                    </Td>
                                    <Td>
                                      {child.fromLabel ?? '-'} → {child.toLabel ?? '-'}
                                    </Td>
                                    <Td>{child.compositionText ?? '-'}</Td>
                                    <Td>{formatDistanceTime(child)}</Td>
                                    <Td>
                                      {child.timeSaturationPct != null ? `${child.timeSaturationPct}%` : '-'}
                                      {child.timeSaturationText ? ` · ${child.timeSaturationText}` : ''}
                                    </Td>
                                    <Td>{child.fatigueScore != null ? child.fatigueScore.toFixed(2) : '-'}</Td>
                                    <Td>{child.estimatedCostText ?? '-'}</Td>
                                    <Td>{child.usageCount}곳</Td>
                                    <Td>
                                      <TypePill label={child.calcStatusText} tone={calcTone(child.calcStatusText)} />
                                    </Td>
                                  </tr>
                                );
                              })
                            : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </DatasetCard>
        </>
      )}

      {createOpen ? (
        <>
          <div className="fixed inset-0 z-50 bg-[#2A2155]/30 backdrop-blur-[1px]" onClick={() => setCreateOpen(false)} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className={`w-full max-w-md p-6 shadow-2xl ${datasetTheme.card}`} role="dialog">
              <h2 className="text-lg font-semibold text-slate-900">하루 블록 등록</h2>
              <p className="mt-1 text-sm text-slate-500">1차는 이름과 형태만 저장합니다.</p>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs text-[#8B83B8]">
                  이름
                  <Input className={datasetControlClass} value={createName} onChange={(event) => setCreateName(event.target.value)} />
                </label>
                <label className="grid gap-1 text-xs text-[#8B83B8]">
                  형태
                  <select
                    className={datasetControlClass}
                    value={createShape}
                    onChange={(event) => setCreateShape(event.target.value as CatalogBlockShape)}
                  >
                    <option value="DAY">하루</option>
                    <option value="SET">세트</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <DatasetButton type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  취소
                </DatasetButton>
                <DatasetButton type="button" variant="primary" disabled={!createName.trim() || createState.loading} onClick={handleCreate}>
                  {createState.loading ? '저장 중…' : '등록'}
                </DatasetButton>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <DatasetPageFooter screenId="T03-01 · 일정 블록 목록" />
    </section>
    </DatasetPageShell>
  );
}
