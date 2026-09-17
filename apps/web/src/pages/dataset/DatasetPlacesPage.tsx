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
import {
  useCatalogPlaces,
  useCatalogRegions,
  useCatalogRoutes,
  useCreateCatalogPlace,
  useCreateCatalogRegion,
  useCreateCatalogRoute,
} from '../../features/dataset/hooks';
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
type CreateKind = 'region' | 'place' | 'route';

const LIST_PLACE_TYPES: CatalogPlaceType[] = ['LODGING', 'EXPERIENCE', 'MEETING', 'GATE'];

const CREATE_LABEL: Record<CreateKind, string> = {
  region: '지역 등록',
  place: '장소 등록',
  route: '경로 등록',
};

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function DatasetPlacesPage(): JSX.Element {
  const [innerTab, setInnerTab] = useState<InnerTab>('places');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('ALL');
  const [regionName, setRegionName] = useState('ALL');
  const [placeType, setPlaceType] = useState<'ALL' | CatalogPlaceType>('ALL');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);

  const [regionNameInput, setRegionNameInput] = useState('');
  const [regionCountryInput, setRegionCountryInput] = useState('몽골');
  const [regionDescriptionInput, setRegionDescriptionInput] = useState('');

  const [placeNameInput, setPlaceNameInput] = useState('');
  const [placeTypeInput, setPlaceTypeInput] = useState<CatalogPlaceType>('LODGING');
  const [placeCountryInput, setPlaceCountryInput] = useState('몽골');
  const [placeRegionIdInput, setPlaceRegionIdInput] = useState('');

  const [routeNameInput, setRouteNameInput] = useState('');
  const [routeFromPlaceId, setRouteFromPlaceId] = useState('');
  const [routeToPlaceId, setRouteToPlaceId] = useState('');
  const [routeRegionId, setRouteRegionId] = useState('');
  const [routeDistanceKm, setRouteDistanceKm] = useState('');
  const [routeTravelHours, setRouteTravelHours] = useState('');

  const regionsQuery = useCatalogRegions();
  const placesQuery = useCatalogPlaces();
  const routesQuery = useCatalogRoutes();
  const [createRegion, createRegionState] = useCreateCatalogRegion();
  const [createPlace, createPlaceState] = useCreateCatalogPlace();
  const [createRoute, createRouteState] = useCreateCatalogRoute();

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

  const routePlaceOptions = useMemo(
    () => [...places].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [places],
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

  const openCreate = (kind: CreateKind) => {
    setCreateKind(kind);
    setStubMessage(null);
  };

  const closeCreate = () => setCreateKind(null);

  const resetCreateForms = () => {
    setRegionNameInput('');
    setRegionCountryInput('몽골');
    setRegionDescriptionInput('');
    setPlaceNameInput('');
    setPlaceTypeInput('LODGING');
    setPlaceCountryInput('몽골');
    setPlaceRegionIdInput('');
    setRouteNameInput('');
    setRouteFromPlaceId('');
    setRouteToPlaceId('');
    setRouteRegionId('');
    setRouteDistanceKm('');
    setRouteTravelHours('');
  };

  const handleCreateRegion = async () => {
    const name = regionNameInput.trim();
    if (!name) return;
    await createRegion({
      variables: {
        input: {
          name,
          country: regionCountryInput.trim() || '몽골',
          description: regionDescriptionInput.trim() || null,
        },
      },
    });
    resetCreateForms();
    closeCreate();
  };

  const handleCreatePlace = async () => {
    const name = placeNameInput.trim();
    if (!name) return;
    await createPlace({
      variables: {
        input: {
          name,
          placeType: placeTypeInput,
          country: placeCountryInput.trim() || '몽골',
          regionId: placeRegionIdInput || null,
        },
      },
    });
    resetCreateForms();
    closeCreate();
  };

  const handleCreateRoute = async () => {
    const name = routeNameInput.trim();
    if (!name || !routeFromPlaceId || !routeToPlaceId) return;
    await createRoute({
      variables: {
        input: {
          name,
          fromPlaceId: routeFromPlaceId,
          toPlaceId: routeToPlaceId,
          regionId: routeRegionId || null,
          averageDistanceKm: parseOptionalNumber(routeDistanceKm),
          averageTravelHours: parseOptionalNumber(routeTravelHours),
        },
      },
    });
    resetCreateForms();
    closeCreate();
  };

  const createLoading =
    createKind === 'region'
      ? createRegionState.loading
      : createKind === 'place'
        ? createPlaceState.loading
        : createKind === 'route'
          ? createRouteState.loading
          : false;

  const createDisabled =
    createKind === 'region'
      ? !regionNameInput.trim()
      : createKind === 'place'
        ? !placeNameInput.trim()
        : createKind === 'route'
          ? !routeNameInput.trim() || !routeFromPlaceId || !routeToPlaceId
          : true;

  const primaryCreateLabel =
    innerTab === 'regions' ? '+ 지역 등록' : innerTab === 'routes' ? '+ 경로 등록' : '+ 장소 등록';

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
              <DatasetButton
                type="button"
                variant="primary"
                onClick={() => openCreate(innerTab === 'regions' ? 'region' : innerTab === 'routes' ? 'route' : 'place')}
              >
                {primaryCreateLabel}
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
                <div className="flex flex-wrap gap-2">
                  <StubButton label="컬럼 설정" onStub={() => showStub('컬럼 설정은 다음 단계에서 구현합니다.')} />
                  <DatasetButton type="button" variant="primary" onClick={() => openCreate('place')}>
                    + 장소 등록
                  </DatasetButton>
                </div>
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">지역 목록</h2>
                <p className="mt-1 text-xs text-[#8B83B8]">결과 {regions.length}</p>
              </div>
              <DatasetButton type="button" variant="primary" onClick={() => openCreate('region')}>
                + 지역 등록
              </DatasetButton>
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">경로 목록</h2>
                <p className="mt-1 text-xs text-[#8B83B8]">결과 {routes.length}</p>
              </div>
              <DatasetButton type="button" variant="primary" onClick={() => openCreate('route')}>
                + 경로 등록
              </DatasetButton>
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

        {createKind ? (
          <>
            <div className="fixed inset-0 z-50 bg-[#2A2155]/30 backdrop-blur-[1px]" onClick={closeCreate} aria-hidden="true" />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className={`w-full max-w-md p-6 shadow-2xl ${datasetTheme.card}`} role="dialog">
                <h2 className="text-lg font-semibold text-slate-900">{CREATE_LABEL[createKind]}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {createKind === 'region'
                    ? '지역명과 국가를 저장합니다.'
                    : createKind === 'place'
                      ? '장소명·유형·권역을 저장합니다.'
                      : '경로명과 출발/도착 장소를 저장합니다.'}
                </p>

                <div className="mt-4 grid gap-3">
                  {createKind === 'region' ? (
                    <>
                      <DatasetField label="지역명">
                        <Input
                          className={datasetControlClass}
                          value={regionNameInput}
                          onChange={(event) => setRegionNameInput(event.target.value)}
                          placeholder="예: 고비사막"
                        />
                      </DatasetField>
                      <DatasetField label="국가">
                        <Input
                          className={datasetControlClass}
                          value={regionCountryInput}
                          onChange={(event) => setRegionCountryInput(event.target.value)}
                          placeholder="몽골"
                        />
                      </DatasetField>
                      <DatasetField label="설명">
                        <Input
                          className={datasetControlClass}
                          value={regionDescriptionInput}
                          onChange={(event) => setRegionDescriptionInput(event.target.value)}
                          placeholder="선택 입력"
                        />
                      </DatasetField>
                    </>
                  ) : null}

                  {createKind === 'place' ? (
                    <>
                      <DatasetField label="장소명">
                        <Input
                          className={datasetControlClass}
                          value={placeNameInput}
                          onChange={(event) => setPlaceNameInput(event.target.value)}
                          placeholder="예: 미니사막 C캠프"
                        />
                      </DatasetField>
                      <DatasetField label="유형">
                        <select
                          className={datasetControlClass}
                          value={placeTypeInput}
                          onChange={(event) => setPlaceTypeInput(event.target.value as CatalogPlaceType)}
                        >
                          {LIST_PLACE_TYPES.map((value) => (
                            <option key={value} value={value}>
                              {PLACE_TYPE_LABEL[value]}
                            </option>
                          ))}
                        </select>
                      </DatasetField>
                      <DatasetField label="국가">
                        <Input
                          className={datasetControlClass}
                          value={placeCountryInput}
                          onChange={(event) => setPlaceCountryInput(event.target.value)}
                          placeholder="몽골"
                        />
                      </DatasetField>
                      <DatasetField label="권역">
                        <select
                          className={datasetControlClass}
                          value={placeRegionIdInput}
                          onChange={(event) => setPlaceRegionIdInput(event.target.value)}
                        >
                          <option value="">선택 안 함</option>
                          {regions.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name}
                            </option>
                          ))}
                        </select>
                      </DatasetField>
                    </>
                  ) : null}

                  {createKind === 'route' ? (
                    <>
                      <DatasetField label="경로명">
                        <Input
                          className={datasetControlClass}
                          value={routeNameInput}
                          onChange={(event) => setRouteNameInput(event.target.value)}
                          placeholder="예: 울란바토르 → 미니사막"
                        />
                      </DatasetField>
                      <DatasetField label="출발 장소">
                        <select
                          className={datasetControlClass}
                          value={routeFromPlaceId}
                          onChange={(event) => setRouteFromPlaceId(event.target.value)}
                        >
                          <option value="">선택</option>
                          {routePlaceOptions.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name} ({row.code})
                            </option>
                          ))}
                        </select>
                      </DatasetField>
                      <DatasetField label="도착 장소">
                        <select
                          className={datasetControlClass}
                          value={routeToPlaceId}
                          onChange={(event) => setRouteToPlaceId(event.target.value)}
                        >
                          <option value="">선택</option>
                          {routePlaceOptions.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name} ({row.code})
                            </option>
                          ))}
                        </select>
                      </DatasetField>
                      <DatasetField label="권역">
                        <select
                          className={datasetControlClass}
                          value={routeRegionId}
                          onChange={(event) => setRouteRegionId(event.target.value)}
                        >
                          <option value="">선택 안 함</option>
                          {regions.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name}
                            </option>
                          ))}
                        </select>
                      </DatasetField>
                      <div className="grid grid-cols-2 gap-3">
                        <DatasetField label="평균 거리(km)">
                          <Input
                            className={datasetControlClass}
                            value={routeDistanceKm}
                            onChange={(event) => setRouteDistanceKm(event.target.value)}
                            placeholder="240"
                          />
                        </DatasetField>
                        <DatasetField label="평균 시간(시간)">
                          <Input
                            className={datasetControlClass}
                            value={routeTravelHours}
                            onChange={(event) => setRouteTravelHours(event.target.value)}
                            placeholder="4"
                          />
                        </DatasetField>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <DatasetButton type="button" variant="outline" onClick={closeCreate}>
                    취소
                  </DatasetButton>
                  <DatasetButton
                    type="button"
                    variant="primary"
                    disabled={createDisabled || createLoading}
                    onClick={() => {
                      if (createKind === 'region') void handleCreateRegion();
                      else if (createKind === 'place') void handleCreatePlace();
                      else void handleCreateRoute();
                    }}
                  >
                    {createLoading ? '저장 중…' : '등록'}
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
