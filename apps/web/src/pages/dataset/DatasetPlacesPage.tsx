import { Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DatasetPageFooter,
  DatasetStubNotice,
  PLACE_TYPE_LABEL,
  STATUS_LABEL,
  StatusBadge,
  type CatalogPlaceType,
} from '../../features/dataset/labels';
import {
  useBatchUpdateCatalogPlaces,
  useCatalogChangeLogs,
  useCatalogPlaces,
  useCatalogRegions,
  useCatalogRoutes,
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
import { DatasetPlaceMap } from './DatasetPlaceMap';
import { DatasetPlaceSelectionSummary } from './DatasetPlaceSelectionSummary';
import { DatasetRegionsPanel } from './DatasetRegionsPanel';

type InnerTab = 'regions' | 'places' | 'routes';
type CreateKind = 'route';

const LIST_PLACE_TYPES: CatalogPlaceType[] = ['LODGING', 'EXPERIENCE', 'MEETING', 'GATE', 'AREA'];

const CREATE_LABEL: Record<CreateKind, string> = {
  route: '경로 등록',
};

function placeCreatePath(options?: { type?: CatalogPlaceType; parentId?: string }): string {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.parentId) params.set('parentId', options.parentId);
  const query = params.toString();
  return query ? `/dataset/places/new?${query}` : '/dataset/places/new';
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function DatasetPlacesPage(): JSX.Element {
  const navigate = useNavigate();
  const [innerTab, setInnerTab] = useState<InnerTab>('places');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('ALL');
  const [regionName, setRegionName] = useState('ALL');
  const [parentPlaceId, setParentPlaceId] = useState('ALL');
  const [placeType, setPlaceType] = useState<'ALL' | CatalogPlaceType>('ALL');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [viewPlaceId, setViewPlaceId] = useState<string | null>(null);
  const [regionCreateNonce, setRegionCreateNonce] = useState(0);

  const [batchStatus, setBatchStatus] = useState<'ACTIVE' | 'INACTIVE'>('INACTIVE');
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const [routeNameInput, setRouteNameInput] = useState('');
  const [routeFromPlaceId, setRouteFromPlaceId] = useState('');
  const [routeToPlaceId, setRouteToPlaceId] = useState('');
  const [routeRegionId, setRouteRegionId] = useState('');
  const [routeDistanceKm, setRouteDistanceKm] = useState('');
  const [routeTravelHours, setRouteTravelHours] = useState('');

  const regionsQuery = useCatalogRegions();
  const placesQuery = useCatalogPlaces();
  const routesQuery = useCatalogRoutes();
  const [createRoute, createRouteState] = useCreateCatalogRoute();
  const [batchUpdatePlaces, batchState] = useBatchUpdateCatalogPlaces();
  const logsQuery = useCatalogChangeLogs('PLACE');

  const places = placesQuery.data?.catalogPlaces ?? [];
  const regions = regionsQuery.data?.catalogRegions ?? [];
  const routes = routesQuery.data?.catalogRoutes ?? [];
  const detailPlace = useMemo(
    () => (detailPlaceId ? places.find((row) => row.id === detailPlaceId) ?? null : null),
    [detailPlaceId, places],
  );
  const viewPlace = useMemo(
    () => (viewPlaceId ? places.find((row) => row.id === viewPlaceId) ?? null : null),
    [places, viewPlaceId],
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
      if (parentPlaceId !== 'ALL' && row.parentPlaceId !== parentPlaceId) return false;
      if (!keyword) return true;
      return (
        row.name.toLowerCase().includes(keyword) ||
        row.code.toLowerCase().includes(keyword) ||
        (row.parentPlace?.name.toLowerCase().includes(keyword) ?? false)
      );
    });
  }, [country, listPlaces, parentPlaceId, placeType, regionName, search, status]);

  const coordCounts = useMemo(() => {
    let registered = 0;
    for (const row of filteredPlaces) {
      if (row.latitude != null && row.longitude != null) registered += 1;
    }
    return { registered, missing: filteredPlaces.length - registered };
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
  const parentPlaces = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    for (const row of places) {
      if (row.placeType === 'AREA') byId.set(row.id, { id: row.id, name: row.name });
      if (row.parentPlace) byId.set(row.parentPlace.id, row.parentPlace);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [places]);

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

  const goToCreatePlace = (type?: CatalogPlaceType) => {
    const nextType = type ?? (placeType !== 'ALL' ? placeType : undefined);
    const nextParentId = nextType === 'AREA' || parentPlaceId === 'ALL' ? undefined : parentPlaceId;
    navigate(placeCreatePath({ type: nextType, parentId: nextParentId }));
  };

  const goToEditPlace = (id: string) => {
    navigate(`/dataset/places/${id}/edit`);
  };

  const openCreate = (kind: CreateKind) => {
    setCreateKind(kind);
    setStubMessage(null);
  };

  const closeCreate = () => {
    setCreateKind(null);
  };

  const resetCreateForms = () => {
    setRouteNameInput('');
    setRouteFromPlaceId('');
    setRouteToPlaceId('');
    setRouteRegionId('');
    setRouteDistanceKm('');
    setRouteTravelHours('');
  };

  const handleBatchStatus = async () => {
    if (selectedIds.size === 0) return;
    const result = await batchUpdatePlaces({
      variables: { input: { ids: Array.from(selectedIds), status: batchStatus } },
    });
    const rows = result.data?.batchUpdateCatalogPlaces ?? [];
    const failed = rows.filter((row: { ok: boolean }) => !row.ok).length;
    setBatchMessage(`일괄 수정 ${rows.length}건 · 실패 ${failed} · 전체 롤백 없음`);
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

  const createLoading = createKind === 'route' ? createRouteState.loading : false;
  const createDisabled = createKind === 'route' ? !routeNameInput.trim() || !routeFromPlaceId || !routeToPlaceId : true;

  const primaryCreateLabel =
    innerTab === 'regions' ? '+ 지역 등록' : innerTab === 'routes' ? '+ 경로 등록' : '+ 장소 등록';

  const innerTabs = (
    <DatasetTabs
      items={[
        { id: 'regions', label: '지역 · 권역' },
        { id: 'places', label: '장소' },
        { id: 'routes', label: '경로' },
      ]}
      activeId={innerTab}
      onChange={(id) => setInnerTab(id as InnerTab)}
    />
  );

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로"
          title={innerTab === 'regions' ? '지역 · 권역 관리 · 지도' : '장소 · 지역 · 경로'}
          description={
            innerTab === 'regions'
              ? '지역별로 분류된 같은 장소들을 지도와 목록에서 함께 확인합니다.'
              : '장소의 위치와 연결된 정보를 확인하고, 여러 항목을 한 번에 관리합니다.'
          }
          actions={
            <>
              <StubButton label="대량 관리" onStub={() => showStub('대량 관리는 다음 단계에서 구현합니다.')} />
              <DatasetButton
                type="button"
                variant="primary"
                onClick={() => {
                  if (innerTab === 'places') goToCreatePlace();
                  else if (innerTab === 'regions') setRegionCreateNonce((value) => value + 1);
                  else openCreate('route');
                }}
              >
                {primaryCreateLabel}
              </DatasetButton>
            </>
          }
        />

        {stubMessage ? <DatasetStubNotice message={stubMessage} /> : null}

        {innerTab !== 'regions' ? (
        <DatasetFilterBar>
          {innerTabs}
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
                <DatasetField label="상위 목적지">
                  <select
                    className={datasetControlClass}
                    value={parentPlaceId}
                    onChange={(event) => setParentPlaceId(event.target.value)}
                  >
                    <option value="ALL">전체</option>
                    {parentPlaces.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
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
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#8B83B8]">
                <span className={`rounded-full px-2.5 py-1 ${datasetTheme.badgeSoft}`}>숙소 요금 기준일 · UI만</span>
                <span className={`rounded-full px-2.5 py-1 ${datasetTheme.badgeSoft}`}>기본 객실 · UI만</span>
                <span className={`rounded-full px-2.5 py-1 ${datasetTheme.badgeSoft}`}>매입 요금 · UI만</span>
              </div>
            </>
          ) : null}
        </DatasetFilterBar>
        ) : null}

        {innerTab === 'places' ? (
          <>
            <DatasetSelectionBar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              actions={
                <>
                  <select
                    className={datasetControlClass}
                    value={batchStatus}
                    onChange={(event) => setBatchStatus(event.target.value as 'ACTIVE' | 'INACTIVE')}
                  >
                    <option value="INACTIVE">사용 안 함</option>
                    <option value="ACTIVE">사용 중</option>
                  </select>
                  <DatasetButton type="button" variant="soft" disabled={batchState.loading} onClick={() => void handleBatchStatus()}>
                    일괄 상태 변경
                  </DatasetButton>
                  <StubButton label="엑셀 일괄" variant="soft" onStub={() => showStub('엑셀 일괄은 양식 확정 후 연결합니다. (D05)')} />
                </>
              }
            />
            {batchMessage ? <DatasetStubNotice message={batchMessage} /> : null}

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <DatasetCard className="flex flex-col">
                <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">지도</h2>
                  <p className="mt-1 text-xs text-[#8B83B8]">핀 클릭은 조회 선택입니다. 체크와 분리됩니다.</p>
                </div>
                <div className="h-[360px] xl:h-[520px]">
                  <DatasetPlaceMap places={filteredPlaces} selectedId={viewPlaceId} onSelect={setViewPlaceId} />
                </div>
              </DatasetCard>

            <DatasetCard className="flex h-[calc(360px+4rem)] flex-col overflow-hidden xl:h-[calc(520px+4rem)]">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">장소 목록</h2>
                  <p className="mt-1 text-xs text-[#8B83B8]">
                    세부 장소 {filteredPlaces.length}개 · 좌표 등록 {coordCounts.registered} / 미등록 {coordCounts.missing}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DatasetButton type="button" variant="outline" onClick={() => goToCreatePlace('AREA')}>
                    + 목적지 등록
                  </DatasetButton>
                  <DatasetButton type="button" variant="primary" onClick={() => goToCreatePlace()}>
                    + 장소 등록
                  </DatasetButton>
                </div>
              </div>

              {placesQuery.loading ? (
                <p className="min-h-0 flex-1 overflow-auto px-4 py-8 text-sm text-slate-500">불러오는 중…</p>
              ) : placesQuery.error ? (
                <p className="min-h-0 flex-1 overflow-auto px-4 py-8 text-sm text-rose-600">목록을 불러오지 못했습니다. API/마이그레이션을 확인하세요.</p>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="sticky top-0 z-[1] flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-2.5">
                    <input
                      type="checkbox"
                      className={datasetTheme.checkbox}
                      checked={filteredPlaces.length > 0 && selectedIds.size === filteredPlaces.length}
                      onChange={toggleAll}
                      aria-label="전체 선택"
                    />
                    <span className="text-xs text-slate-400">전체 선택</span>
                  </div>
                  <ul>
                    {filteredPlaces.map((row) => {
                      const meta = [
                        row.code,
                        PLACE_TYPE_LABEL[row.placeType],
                        [row.country, row.region?.name].filter(Boolean).join(' / ') || null,
                        row.parentPlace?.name,
                        row.latitude != null && row.longitude != null ? '좌표 등록' : '좌표 미등록',
                        row.lodgingLevel,
                        row.placeType === 'LODGING' ? row.rateSummary ?? '요금 미등록' : null,
                        row.placeType === 'LODGING' ? row.linkLabel ?? (row.accommodation?.name ? `숙소 원본 ${row.accommodation.name}` : '숙소 원본 미연결') : null,
                        STATUS_LABEL[row.status],
                      ].filter((value): value is string => Boolean(value));
                      const selected = viewPlaceId === row.id;
                      return (
                        <li key={row.id}>
                          <div
                            className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 ${
                              selected ? 'bg-[#F8F6FF]' : 'bg-white hover:bg-slate-50'
                            }`}
                            onClick={() => setViewPlaceId(row.id)}
                          >
                            <input
                              type="checkbox"
                              className={`mt-1 ${datasetTheme.checkbox}`}
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleSelected(row.id)}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`${row.name} 일괄 선택`}
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                className="text-left text-sm font-semibold text-[#5B4BD6] hover:underline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setViewPlaceId(row.id);
                                  setDetailPlaceId(row.id);
                                }}
                              >
                                {row.name}
                              </button>
                              <p className="mt-0.5 text-xs leading-relaxed text-[#9A93C2]">{meta.join(' · ')}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </DatasetCard>
            </div>

            {viewPlace ? (
              <DatasetPlaceSelectionSummary
                place={viewPlace}
                places={places}
                onEdit={() => goToEditPlace(viewPlace.id)}
                onOpenDetail={() => setDetailPlaceId(viewPlace.id)}
                onStub={showStub}
              />
            ) : null}
          </>
        ) : null}

        {innerTab === 'regions' ? (
          <DatasetRegionsPanel
            regions={regions}
            places={places}
            selectedPlaceId={viewPlaceId}
            onSelectPlace={setViewPlaceId}
            onStub={showStub}
            tabs={innerTabs}
            createNonce={regionCreateNonce}
          />
        ) : null}

        {innerTab === 'routes' ? (
          <DatasetCard>
            <div className="h-[280px] border-b border-slate-100">
              <DatasetPlaceMap places={listPlaces} selectedId={viewPlaceId} onSelect={setViewPlaceId} />
            </div>
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
                <p className="mt-1 text-sm text-slate-500">경로명과 출발/도착 장소를 저장합니다.</p>

                <div className="mt-4 grid gap-3">
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
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <DatasetButton type="button" variant="outline" onClick={closeCreate}>
                    취소
                  </DatasetButton>
                  <DatasetButton
                    type="button"
                    variant="primary"
                    disabled={createDisabled || createLoading}
                    onClick={() => void handleCreateRoute()}
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
            onEdit={() => goToEditPlace(detailPlace.id)}
            onStub={showStub}
          />
        ) : null}

        {innerTab !== 'regions' ? (
          <DatasetCard>
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold">변경 이력</h2>
              <p className="mt-1 text-xs text-[#8B83B8]">최근 장소 작업 · 영구삭제는 D06 이후</p>
            </div>
            <ul className="grid gap-2 px-4 py-3 text-sm">
              {(logsQuery.data?.catalogChangeLogs ?? []).slice(0, 8).map((row) => (
                <li key={row.id} className="text-slate-600">
                  {row.action} · {row.summary}
                </li>
              ))}
              {(logsQuery.data?.catalogChangeLogs ?? []).length === 0 ? (
                <li className="text-slate-400">아직 기록이 없습니다.</li>
              ) : null}
            </ul>
          </DatasetCard>
        ) : null}

        <DatasetPageFooter
          screenId={innerTab === 'regions' ? 'T01-04 · 지도 품질 우선안' : innerTab === 'routes' ? 'T01-05 · 경로 목록' : 'T01-01 · 장소 목록'}
        />
      </section>
    </DatasetPageShell>
  );
}
