import { Input, Table, Td, Th } from '@tour/ui';
import { Fragment, useMemo, useState } from 'react';
import {
  DatasetPageFooter,
  DatasetStubNotice,
  ELEMENT_KIND_LABEL,
  TypePill,
  type CatalogElementKind,
} from '../../features/dataset/labels';
import { useCatalogElements, useCreateCatalogElement } from '../../features/dataset/hooks';
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

export function DatasetElementsPage(): JSX.Element {
  const [mode, setMode] = useState<ModeTab>('source');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'ALL' | CatalogElementKind>('ALL');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createKind, setCreateKind] = useState<CatalogElementKind>('EXPERIENCE');

  const { data, loading, error } = useCatalogElements();
  const [createElement, createState] = useCreateCatalogElement();
  const rows = data?.catalogElements ?? [];

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (kind !== 'ALL' && row.kind !== kind) return false;
      if (!keyword) return true;
      return (
        row.name.toLowerCase().includes(keyword) ||
        row.code.toLowerCase().includes(keyword) ||
        (row.customerText ?? '').toLowerCase().includes(keyword)
      );
    });
  }, [kind, rows, search, status]);

  const showStub = (message: string) => setStubMessage(message);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    await createElement({
      variables: {
        input: {
          name,
          kind: createKind,
          composition: 'SINGLE',
          customerText: name,
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
        breadcrumb="일정 데이터 관리 / 일정요소"
        title="일정요소"
        description="최소 행동 단위의 기본값과 세트를 관리하고, 배치된 일정의 사용 값을 확인합니다."
        actions={
          <>
            <StubButton label="대량 관리" onStub={() => showStub('대량 관리는 다음 단계에서 구현합니다.')} />
            <StubButton label="+ 세트 만들기" onStub={() => showStub('세트 만들기는 다음 단계에서 구현합니다.')} />
            <DatasetButton type="button" variant="primary" onClick={() => setCreateOpen(true)}>
              + 일정요소 등록
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
          <p className="mt-2 text-sm text-slate-500">
            원본을 일정/견적에 꽂은 스냅샷은 생산 파이프라인과 연결하는 다음 단계에서 표시합니다.
          </p>
        </div>
      ) : (
        <>
          <DatasetFilterBar>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="grid gap-1 text-xs text-[#8B83B8]">
                검색
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="요소명, 세트명, ID" />
              </label>
              <label className="grid gap-1 text-xs text-[#8B83B8]">
                요소 유형
                <select
                  className={datasetControlClass}
                  value={kind}
                  onChange={(event) => setKind(event.target.value as 'ALL' | CatalogElementKind)}
                >
                  <option value="ALL">전체</option>
                  {(Object.keys(ELEMENT_KIND_LABEL) as CatalogElementKind[]).map((value) => (
                    <option key={value} value={value}>
                      {ELEMENT_KIND_LABEL[value]}
                    </option>
                  ))}
                </select>
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
              <div className="flex items-end xl:col-span-2">
                <StubButton
                  label="+ 상세 조건 추가"
                  onStub={() => showStub('시간·비용·계산방식 상세 조건은 다음 단계에서 연결합니다.')}
                />
              </div>
            </div>
          </DatasetFilterBar>

          <DatasetSelectionBar
            count={selectedIds.size}
            onClear={() => setSelectedIds(new Set())}
            actions={
              <>
                <StubButton label="일괄 수정" variant="soft" onStub={() => showStub('일괄 수정은 다음 단계에서 구현합니다.')} />
                <StubButton label="선택 삭제" variant="soft" onStub={() => showStub('선택 삭제는 다음 단계에서 구현합니다.')} />
                <StubButton label="선택 내보내기" variant="soft" onStub={() => showStub('내보내기는 다음 단계에서 구현합니다.')} />
                <StubButton label="선택으로 세트 만들기" variant="soft" onStub={() => showStub('세트 만들기는 다음 단계에서 구현합니다.')} />
              </>
            }
          />

          <DatasetCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">원본 목록</h2>
                <p className="mt-1 text-xs text-[#8B83B8]">결과 {filtered.length}</p>
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
                      <Th>이름 / 버전</Th>
                      <Th>구분</Th>
                      <Th>유형</Th>
                      <Th>기본 위치</Th>
                      <Th>기본 시간</Th>
                      <Th>비용 규칙</Th>
                      <Th>고객 기본문구</Th>
                      <Th>사용처</Th>
                      <Th>값 설정 상태</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const expanded = expandedIds.has(row.id);
                      const isSet = row.composition === 'SET';
                      return (
                        <Fragment key={row.id}>
                          <tr className="border-t border-slate-100 hover:bg-slate-50">
                            <Td>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(row.id)}
                                onChange={() => toggleSelected(row.id)}
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
                                    {isSet ? ` · ${row.setItems.length}개` : ''}
                                  </div>
                                </div>
                              </div>
                            </Td>
                            <Td>
                              <TypePill label={isSet ? '세트' : '단일'} tone={isSet ? 'violet' : 'slate'} />
                            </Td>
                            <Td>
                              <TypePill label={ELEMENT_KIND_LABEL[row.kind]} tone="sky" />
                            </Td>
                            <Td>{row.defaultPlace?.name ?? row.defaultPlaceMode ?? '-'}</Td>
                            <Td>{row.durationText ?? '-'}</Td>
                            <Td>{row.costRuleText ?? '미설정'}</Td>
                            <Td className="max-w-[220px] truncate">{row.customerText ?? '-'}</Td>
                            <Td>{row.usageCount}곳</Td>
                            <Td>
                              <TypePill
                                label={row.valueStatusText}
                                tone={row.valueStatusText.includes('설정됨') ? 'sky' : 'amber'}
                              />
                            </Td>
                          </tr>
                          {expanded
                            ? row.setItems.map((item) => (
                                <tr key={item.id} className="border-t border-slate-100 bg-slate-50/80">
                                  <Td />
                                  <Td colSpan={9}>
                                    <span className="pl-8 text-sm text-slate-600">
                                      └ {item.memberElement.name}{' '}
                                      <span className="text-xs text-slate-400">({item.memberElement.code})</span>
                                    </span>
                                  </Td>
                                </tr>
                              ))
                            : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </DatasetCard>

          <p className="text-xs text-slate-400">
            세트 시간은 순차 기준이며, 실제 시간·비용은 일정에 배치된 뒤 조건에 따라 계산됩니다. (1차는 시드 값 표시)
          </p>
        </>
      )}

      {createOpen ? (
        <>
          <div className="fixed inset-0 z-50 bg-[#2A2155]/30 backdrop-blur-[1px]" onClick={() => setCreateOpen(false)} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className={`w-full max-w-md p-6 shadow-2xl ${datasetTheme.card}`} role="dialog">
              <h2 className="text-lg font-semibold text-slate-900">일정요소 등록</h2>
              <p className="mt-1 text-sm text-slate-500">1차는 이름과 유형만 저장합니다.</p>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs text-[#8B83B8]">
                  이름
                  <Input className={datasetControlClass} value={createName} onChange={(event) => setCreateName(event.target.value)} />
                </label>
                <label className="grid gap-1 text-xs text-[#8B83B8]">
                  유형
                  <select
                    className={datasetControlClass}
                    value={createKind}
                    onChange={(event) => setCreateKind(event.target.value as CatalogElementKind)}
                  >
                    {(Object.keys(ELEMENT_KIND_LABEL) as CatalogElementKind[]).map((value) => (
                      <option key={value} value={value}>
                        {ELEMENT_KIND_LABEL[value]}
                      </option>
                    ))}
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

      <DatasetPageFooter screenId="T02-01 · 일정요소 원본 목록" />
    </section>
    </DatasetPageShell>
  );
}
