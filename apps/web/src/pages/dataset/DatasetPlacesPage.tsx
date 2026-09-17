import { Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import {
  DatasetPageFooter,
  DatasetStubNotice,
  MapLink,
  PLACE_TYPE_LABEL,
  StatusBadge,
  TypePill,
  type CatalogPlaceType,
} from '../../features/dataset/labels';
import { useCatalogPlaces, useCatalogRegions, useCatalogRoutes, useCreateCatalogPlace } from '../../features/dataset/hooks';
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
import { DatasetPlaceDetailPanel } from './DatasetPlaceDetailPanel';

type InnerTab = 'regions' | 'places' | 'routes';

const LIST_PLACE_TYPES: CatalogPlaceType[] = ['LODGING', 'EXPERIENCE', 'MEETING', 'GATE'];

export function DatasetPlacesPage(): JSX.Element {
  const [innerTab, setInnerTab] = useState<InnerTab>('places');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('ALL');
  const [regionName, setRegionName] = useState('ALL');
  const [placeType, setPlaceType] = useState<'ALL' | CatalogPlaceType>('ALL');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<CatalogPlaceType>('LODGING');
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);

  const regionsQuery = useCatalogRegions();
  const placesQuery = useCatalogPlaces();
  const routesQuery = useCatalogRoutes();
  const [createPlace, createState] = useCreateCatalogPlace();

  const places = placesQuery.data?.catalogPlaces ?? [];
  const regions = regionsQuery.data?.catalogRegions ?? [];
  const routes = routesQuery.data?.catalogRoutes ?? [];
  const detailPlace = useMemo(
    () => (detailPlaceId ? places.find((row) => row.id === detailPlaceId) ?? null : null),
    [detailPlaceId, places],
  );

  const listPlaces = useMemo(
    () => places.filter((row) => LIST_PLACE_TYPES.includes(row.placeType)),
    [places],
  );

  const filteredPlaces = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return listPlaces.filter((row) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (placeType !== 'ALL' && row.placeType !== placeType) return false;
      if (country !== 'ALL' && row.country !== country) return false;
      if (regionName !== 'ALL' && row.region?.name !== regionName) return false;
      if (!keyword) return true;
      return row.name.toLowerCase().includes(keyword) || row.code.toLowerCase().includes(keyword);
    });
  }, [country, listPlaces, placeType, regionName, search, status]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { LODGING: 0, EXPERIENCE: 0, MEETING: 0, GATE: 0 };
    for (const row of filteredPlaces) {
      counts[row.placeType] = (counts[row.placeType] ?? 0) + 1;
    }
    return counts;
  }, [filteredPlaces]);

  const countries = useMemo(
    () => Array.from(new Set(listPlaces.map((row) => row.country))).sort((a, b) => a.localeCompare(b, 'ko')),
    [listPlaces],
  );
  const regionNames = useMemo(
    () =>
      Array.from(new Set(listPlaces.map((row) => row.region?.name).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, 'ko'),
      ),
    [listPlaces],
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredPlaces.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredPlaces.map((row) => row.id)));
  };

  const showStub = (message: string) => setStubMessage(message);

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    await createPlace({ variables: { input: { name, placeType: createType } } });
    setCreateOpen(false);
    setCreateName('');
    setCreateType('LODGING');
  };

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로"
          title="장소 · 지역 · 경로"
          description="장소의 위치와 연결된 정보를 확인하고, 여러 항목을 한 번에 관리합니다."
          actions={
            <>
              <StubButton label="대량 관리" onStub={() => showStub('대량 관리는 다음 단계에서 구현합니다.')} />
              <DatasetButton type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                + 장소 등록
              </DatasetButton>
            </>
          }
        />

        {stubMessage ? <DatasetStubNotice message={stubMessage} /> : null}

        <DatasetFilterBar>
          <DatasetTabs
            items={[
              { id: 'regions', label: '지역' },
              { id: 'places', label: '장소' },
              { id: 'routes', label: '경로' },
            ]}
            activeId={innerTab}
            onChange={(id) => setInnerTab(id as InnerTab)}
          />
          {innerTab === 'places' ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <DatasetField label="검색">
                  <Input
                    className={datasetControlClass}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="장소명 또는 ID"
                  />
                </DatasetField>
                <DatasetField label="국가">
                  <select className={datasetControlClass} value={country} onChange={(event) => setCountry(event.target.value)}>
                    <option value="ALL">전체</option>
                    {countries.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </DatasetField>
                <DatasetField label="권역">
                  <select className={datasetControlClass} value={regionName} onChange={(event) => setRegionName(event.target.value)}>
                    <option value="ALL">전체</option>
                    {regionNames.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </DatasetField>
                <DatasetField label="장소 유형">
                  <select
                    className={datasetControlClass}
                    value={placeType}
                    onChange={(event) => setPlaceType(event.target.value as 'ALL' | CatalogPlaceType)}
                  >
                    <option value="ALL">전체</option>
                    {LIST_PLACE_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {PLACE_TYPE_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </DatasetField>
                <DatasetField label="사용 상태">
                  <select
                    className={datasetControlClass}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                  >
                    <option value="ALL">전체</option>
                    <option value="ACTIVE">사용 중</option>
                    <option value="INACTIVE">사용 안 함</option>
                  </select>
                </DatasetField>
                <div className="flex items-end">
                  <StubButton label="+ 상세 조건 추가" onStub={() => showStub('상세 조건 필터는 다음 단계에서 연결합니다.')} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#8B83B8]">
                <span className={`rounded-full px-2.5 py-1 ${datasetTheme.badgeSoft}`}>숙소 요금 기준일 · UI만</span>
                <span className={`rounded-full px-2.5 py-1 ${datasetTheme.badgeSoft}`}>기본 객실 · UI만</span>
                <span className={`rounded-full px-2.5 py-1 ${datasetTheme.badgeSoft}`}>매입 요금 · UI만</span>
              </div>
            </>
          ) : null}
        </DatasetFilterBar>

        {innerTab === 'places' ? (
          <>
            <DatasetSelectionBar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              actions={
                <>
                  <StubButton label="일괄 수정" variant="soft" onStub={() => showStub('일괄 수정은 다음 단계에서 구현합니다.')} />
                  <StubButton label="선택 삭제" variant="soft" onStub={() => showStub('선택 삭제는 다음 단계에서 구현합니다.')} />
                  <StubButton label="선택 내보내기" variant="soft" onStub={() => showStub('내보내기는 다음 단계에서 구현합니다.')} />
                </>
              }
            />

            <DatasetCard>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">장소 목록</h2>
                  <p className="mt-1 text-xs text-[#8B83B8]">
                    결과 {filteredPlaces.length} · 숙소 {typeCounts.LODGING} · 체험장 {typeCounts.EXPERIENCE} · 미팅{' '}
                    {typeCounts.MEETING} · 출입 {typeCounts.GATE}
                  </p>
                </div>
                <StubButton label="컬럼 설정" onStub={() => showStub('컬럼 설정은 다음 단계에서 구현합니다.')} />
              </div>

              {placesQuery.loading ? (
                <p className="px-4 py-8 text-sm text-slate-500">불러오는 중…</p>
              ) : placesQuery.error ? (
                <p className="px-4 py-8 text-sm text-rose-600">목록을 불러오지 못했습니다. API/마이그레이션을 확인하세요.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr className="bg-slate-50">
                        <Th>
                          <input
                            type="checkbox"
                            className={datasetTheme.checkbox}
                            checked={filteredPlaces.length > 0 && selectedIds.size === filteredPlaces.length}
                            onChange={toggleAll}
                            aria-label="전체 선택"
                          />
                        </Th>
                        <Th>장소명</Th>
                        <Th>유형</Th>
                        <Th>국가 · 권역</Th>
                        <Th>상위 목적지 / 장소</Th>
                        <Th>위치</Th>
                        <Th>숙소 등급</Th>
                        <Th>요금 요약</Th>
                        <Th>연결정보</Th>
                        <Th>상태</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlaces.map((row) => {
                        const hasCoords = row.latitude != null && row.longitude != null;
                        return (
                          <tr
                            key={row.id}
                            className="cursor-pointer border-t border-slate-100 hover:bg-[#F8F6FF]"
                            onClick={() => setDetailPlaceId(row.id)}
                          >
                            <Td>
                              <input
                                type="checkbox"
                                className={datasetTheme.checkbox}
                                checked={selectedIds.has(row.id)}
                                onChange={() => toggleSelected(row.id)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`${row.name} 선택`}
                              />
                            </Td>
                            <Td>
                              <button
                                type="button"
                                className={`text-left font-medium ${datasetTheme.link}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDetailPlaceId(row.id);
                                }}
                              >
                                {row.name}
                              </button>
                              <div className="text-xs text-[#9A93C2]">{row.code}</div>
                            </Td>
                            <Td>
                              <TypePill label={PLACE_TYPE_LABEL[row.placeType]} tone="violet" />
                            </Td>
                            <Td>
                              {row.country} / {row.region?.name ?? '-'}
                            </Td>
                            <Td>{row.parentPlace?.name ?? '-'}</Td>
                            <Td onClick={(event) => event.stopPropagation()}>
                              {hasCoords ? (
                                <MapLink href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`} />
                              ) : (
                                <span className="text-amber-600">미등록</span>
                              )}
                            </Td>
                            <Td>{row.lodgingLevel ?? '-'}</Td>
                            <Td>{row.placeType === 'LODGING' ? row.rateSummary ?? '요금 미등록' : '-'}</Td>
                            <Td>{row.linkLabel ?? '연결 없음'}</Td>
                            <Td>
                              <StatusBadge status={row.status} />
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </DatasetCard>
          </>
        ) : null}

        {innerTab === 'regions' ? (
          <DatasetCard>
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">지역 목록</h2>
              <p className="mt-1 text-xs text-[#8B83B8]">1차 골격 · 결과 {regions.length}</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="bg-slate-50">
                    <Th>코드</Th>
                    <Th>지역명</Th>
                    <Th>국가</Th>
                    <Th>설명</Th>
                    <Th>상태</Th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <Td>{row.code}</Td>
                      <Td>{row.name}</Td>
                      <Td>{row.country}</Td>
                      <Td>{row.description ?? '-'}</Td>
                      <Td>
                        <StatusBadge status={row.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </DatasetCard>
        ) : null}

        {innerTab === 'routes' ? (
          <DatasetCard>
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">경로 목록</h2>
              <p className="mt-1 text-xs text-[#8B83B8]">1차 골격 · 결과 {routes.length}</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="bg-slate-50">
                    <Th>코드</Th>
                    <Th>경로명</Th>
                    <Th>권역</Th>
                    <Th>출발 → 도착</Th>
                    <Th>거리 · 시간</Th>
                    <Th>상태</Th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <Td>{row.code}</Td>
                      <Td>{row.name}</Td>
                      <Td>{row.region?.name ?? '-'}</Td>
                      <Td>
                        {row.fromPlace.name} → {row.toPlace.name}
                      </Td>
                      <Td>
                        {row.averageDistanceKm ?? '-'}km · {row.averageTravelHours ?? '-'}시간
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </DatasetCard>
        ) : null}

        {createOpen ? (
          <>
            <div className="fixed inset-0 z-50 bg-[#2A2155]/30 backdrop-blur-[1px]" onClick={() => setCreateOpen(false)} aria-hidden="true" />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className={`w-full max-w-md p-6 shadow-2xl ${datasetTheme.card}`} role="dialog">
                <h2 className="text-lg font-semibold text-slate-900">장소 등록</h2>
                <p className="mt-1 text-sm text-slate-500">1차는 이름과 유형만 저장합니다.</p>
                <div className="mt-4 grid gap-3">
                  <DatasetField label="장소명">
                    <Input
                      className={datasetControlClass}
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder="예: 미니사막 C캠프"
                    />
                  </DatasetField>
                  <DatasetField label="유형">
                    <select
                      className={datasetControlClass}
                      value={createType}
                      onChange={(event) => setCreateType(event.target.value as CatalogPlaceType)}
                    >
                      {LIST_PLACE_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {PLACE_TYPE_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </DatasetField>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <DatasetButton type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    취소
                  </DatasetButton>
                  <DatasetButton
                    type="button"
                    variant="primary"
                    disabled={!createName.trim() || createState.loading}
                    onClick={handleCreate}
                  >
                    {createState.loading ? '저장 중…' : '등록'}
                  </DatasetButton>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {detailPlace ? (
          <DatasetPlaceDetailPanel
            place={detailPlace}
            places={places}
            onClose={() => setDetailPlaceId(null)}
            onStub={showStub}
          />
        ) : null}

        <DatasetPageFooter screenId="T01-01 · 장소 목록" />
      </section>
    </DatasetPageShell>
  );
}
