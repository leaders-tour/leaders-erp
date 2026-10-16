import { Input, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CatalogPlaceRow, CatalogRegionRow } from '../../features/dataset/hooks';
import {
  useCatalogChangeLogs,
  useCreateCatalogRegion,
  useUpdateCatalogPlace,
  useUpdateCatalogRegion,
} from '../../features/dataset/hooks';
import {
  StatusBadge,
  catalogPlaceHasRegion,
  catalogPlaceRegionIds,
  catalogPlaceTypeLabel,
  type CatalogUsageStatus,
} from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import { DatasetButton, DatasetCard, DatasetField, DatasetFilterBar, datasetControlClass } from '../../features/dataset/ui';
import { DatasetPlaceMap } from './DatasetPlaceMap';

interface DatasetRegionsPanelProps {
  regions: CatalogRegionRow[];
  places: CatalogPlaceRow[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  onStub: (message: string) => void;
  tabs: ReactNode;
  createNonce?: number;
}

function ancestorArea(places: CatalogPlaceRow[], place: CatalogPlaceRow): CatalogPlaceRow | null {
  let current: CatalogPlaceRow | null = place;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    if (current.placeType === 'AREA') return current;
    current = current.parentPlaceId ? places.find((row) => row.id === current?.parentPlaceId) ?? null : null;
  }
  return null;
}

export function DatasetRegionsPanel({
  regions,
  places,
  selectedPlaceId,
  onSelectPlace,
  onStub,
  tabs,
  createNonce = 0,
}: DatasetRegionsPanelProps): JSX.Element {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | CatalogUsageStatus>('ACTIVE');
  const [parentPlaceId, setParentPlaceId] = useState('ALL');
  const [layout, setLayout] = useState<'map' | 'table'>('map');
  const [showPlaces, setShowPlaces] = useState(true);
  const [showRegionLayer, setShowRegionLayer] = useState(true);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(regions[0]?.id ?? null);
  const [fitNonce, setFitNonce] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectPlaceId, setConnectPlaceId] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [countryInput, setCountryInput] = useState('몽골');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [createRegion, createState] = useCreateCatalogRegion();
  const [updateRegion, updateState] = useUpdateCatalogRegion();
  const [updatePlace, updatePlaceState] = useUpdateCatalogPlace();
  const logsQuery = useCatalogChangeLogs('REGION');

  const countries = useMemo(
    () => Array.from(new Set(regions.map((row) => row.country))).sort((a, b) => a.localeCompare(b, 'ko')),
    [regions],
  );

  const filteredRegions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return regions.filter((row) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (country !== 'ALL' && row.country !== country) return false;
      if (!keyword) return true;
      return row.name.toLowerCase().includes(keyword) || row.code.toLowerCase().includes(keyword);
    });
  }, [country, regions, search, status]);

  useEffect(() => {
    if (selectedRegionId && regions.some((row) => row.id === selectedRegionId)) return;
    setSelectedRegionId(filteredRegions[0]?.id ?? null);
  }, [filteredRegions, regions, selectedRegionId]);

  useEffect(() => {
    if (!selectedPlaceId) return;
    const place = places.find((row) => row.id === selectedPlaceId);
    if (!place) return;
    if (selectedRegionId && catalogPlaceHasRegion(place, selectedRegionId)) return;
    const nextId = catalogPlaceRegionIds(place)[0];
    if (nextId) setSelectedRegionId(nextId);
  }, [places, selectedPlaceId, selectedRegionId]);

  const selectedRegion = regions.find((row) => row.id === selectedRegionId) ?? null;
  const regionPlaces = useMemo(
    () => (selectedRegion ? places.filter((row) => catalogPlaceHasRegion(row, selectedRegion.id)) : []),
    [places, selectedRegion],
  );
  const parentPlaces = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    for (const row of regionPlaces) {
      if (row.placeType === 'AREA') byId.set(row.id, { id: row.id, name: row.name });
      if (row.parentPlace) byId.set(row.parentPlace.id, row.parentPlace);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [regionPlaces]);

  const displayedPlaces = useMemo(() => {
    if (parentPlaceId === 'ALL') return regionPlaces;
    return regionPlaces.filter((row) => {
      if (row.id === parentPlaceId || row.parentPlaceId === parentPlaceId) return true;
      return ancestorArea(places, row)?.id === parentPlaceId;
    });
  }, [parentPlaceId, places, regionPlaces]);

  const mappedPlaces = displayedPlaces.filter((row) => row.latitude != null && row.longitude != null);
  const areaCount = displayedPlaces.filter((row) => row.placeType === 'AREA').length;
  const detailCount = displayedPlaces.length - areaCount;

  const groupedPlaces = useMemo(() => {
    const groups = new Map<string, { root: CatalogPlaceRow; members: CatalogPlaceRow[] }>();
    const ungrouped: CatalogPlaceRow[] = [];
    for (const row of displayedPlaces) {
      const root = ancestorArea(places, row);
      if (!root) {
        ungrouped.push(row);
        continue;
      }
      const current = groups.get(root.id) ?? { root, members: [] };
      if (!current.members.some((item) => item.id === row.id)) current.members.push(row);
      groups.set(root.id, current);
    }
    return { groups: [...groups.values()], ungrouped };
  }, [displayedPlaces, places]);

  useEffect(() => {
    setParentPlaceId('ALL');
  }, [selectedRegionId]);

  useEffect(() => {
    if (createNonce <= 0) return;
    setEditingRegionId(null);
    setNameInput('');
    setCountryInput('몽골');
    setDescriptionInput('');
    setFormError(null);
    setEditorOpen(true);
  }, [createNonce]);

  const openEdit = () => {
    if (!selectedRegion) return;
    setEditingRegionId(selectedRegion.id);
    setNameInput(selectedRegion.name);
    setCountryInput(selectedRegion.country);
    setDescriptionInput(selectedRegion.description ?? '');
    setFormError(null);
    setEditorOpen(true);
  };

  const handleSaveRegion = async () => {
    const name = nameInput.trim();
    if (!name) {
      setFormError('지역명을 입력하세요.');
      return;
    }
    try {
      if (editingRegionId) {
        await updateRegion({
          variables: {
            id: editingRegionId,
            input: { name, country: countryInput.trim() || '몽골', description: descriptionInput.trim() || null },
          },
        });
      } else {
        const result = await createRegion({
          variables: {
            input: { name, country: countryInput.trim() || '몽골', description: descriptionInput.trim() || null },
          },
        });
        const createdId = result.data?.createCatalogRegion?.id;
        if (createdId) setSelectedRegionId(createdId);
      }
      setEditorOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  };

  const handleConnectPlace = async () => {
    if (!selectedRegion || !connectPlaceId) return;
    const place = places.find((row) => row.id === connectPlaceId);
    const nextIds = [...catalogPlaceRegionIds(place ?? {}), selectedRegion.id];
    await updatePlace({
      variables: { id: connectPlaceId, input: { regionIds: [...new Set(nextIds)] } },
    });
    setConnectOpen(false);
    setConnectPlaceId('');
  };

  const selectRegion = (id: string) => {
    setSelectedRegionId(id);
    const selected = places.find((row) => row.id === selectedPlaceId);
    if (selected && !catalogPlaceHasRegion(selected, id)) onSelectPlace(null);
  };

  const resetFilters = () => {
    setSearch('');
    setCountry('ALL');
    setStatus('ACTIVE');
    setParentPlaceId('ALL');
  };

  const saving = createState.loading || updateState.loading;
  const connectablePlaces = places.filter(
    (row) => selectedRegionId && !catalogPlaceHasRegion(row, selectedRegionId),
  );

  return (
    <div className="grid gap-4">
      <DatasetFilterBar>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tabs}
          <div className="flex flex-wrap items-center gap-2">
            <p className="hidden text-xs text-[#8B83B8] xl:block">공통 지도 · 탭을 바꿔도 지도 위 선택 장소를 유지합니다.</p>
            <button
              type="button"
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${layout === 'map' ? datasetTheme.outline : datasetTheme.tabInactive}`}
              onClick={() => setLayout('map')}
            >
              지도 + 목록
            </button>
            <button
              type="button"
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${layout === 'table' ? datasetTheme.tabActive : datasetTheme.tabInactive}`}
              onClick={() => setLayout('table')}
            >
              표 넓게 보기
            </button>
          </div>
        </div>
        <p className="text-xs text-[#8B83B8] xl:hidden">공통 지도 · 탭을 바꿔도 지도 위 선택 장소를 유지합니다.</p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <DatasetField label="검색">
            <Input className={datasetControlClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름 · 검색 번호 · ID" />
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
          <DatasetField label="지역 · 권역">
            <select
              className={datasetControlClass}
              value={selectedRegionId ?? ''}
              onChange={(event) => selectRegion(event.target.value)}
            >
              {filteredRegions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.code}
                </option>
              ))}
            </select>
          </DatasetField>
          <DatasetField label="상위 목적지">
            <select className={datasetControlClass} value={parentPlaceId} onChange={(event) => setParentPlaceId(event.target.value)}>
              <option value="ALL">전체</option>
              {parentPlaces.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </DatasetField>
          <DatasetField label="운영 상태">
            <select className={datasetControlClass} value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | CatalogUsageStatus)}>
              <option value="ACTIVE">운영 권역</option>
              <option value="ALL">전체</option>
              <option value="INACTIVE">사용 안 함</option>
            </select>
          </DatasetField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8B83B8]">
          <p>목록과 지도는 같은 장소 ID를 사용합니다.</p>
          <button type="button" className={`font-medium ${datasetTheme.link}`} onClick={resetFilters}>
            필터 초기화
          </button>
        </div>
      </DatasetFilterBar>

      {layout === 'table' ? (
        <DatasetCard>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr className="bg-slate-50">
                  <Th>코드</Th>
                  <Th>지역명</Th>
                  <Th>국가</Th>
                  <Th>연결 장소</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRegions.map((row) => {
                  const count = places.filter((place) => catalogPlaceHasRegion(place, row.id)).length;
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selectedRegionId === row.id ? 'bg-[#F8F6FF]' : ''}`}
                      onClick={() => selectRegion(row.id)}
                    >
                      <Td>{row.code}</Td>
                      <Td>{row.name}</Td>
                      <Td>{row.country}</Td>
                      <Td>{count}개</Td>
                      <Td>
                        <StatusBadge status={row.status} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </DatasetCard>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <DatasetCard className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" className={datasetTheme.checkbox} checked={showPlaces} onChange={(event) => setShowPlaces(event.target.checked)} />
                  장소
                </label>
                <label className="inline-flex items-center gap-1.5 text-slate-400">
                  <input
                    type="checkbox"
                    className={datasetTheme.checkbox}
                    checked={false}
                    onChange={() => onStub('경로 레이어는 다음 단계에서 연결합니다.')}
                  />
                  경로
                </label>
                <label className="inline-flex items-center gap-1.5 text-slate-400">
                  <input
                    type="checkbox"
                    className={datasetTheme.checkbox}
                    checked={false}
                    onChange={() => onStub('현장 기록 레이어는 방문 판정 이후 연결합니다.')}
                  />
                  현장 기록
                </label>
                <label className="inline-flex items-center gap-1.5 text-slate-400">
                  <input
                    type="checkbox"
                    className={datasetTheme.checkbox}
                    checked={false}
                    onChange={() => onStub('가이드 위치 레이어는 다음 단계에서 연결합니다.')}
                  />
                  가이드 위치
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className={datasetTheme.checkbox}
                    checked={showRegionLayer}
                    onChange={(event) => setShowRegionLayer(event.target.checked)}
                  />
                  권역
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" className={`text-xs font-medium ${datasetTheme.link}`} onClick={() => onStub('추가 레이어는 다음 단계에서 연결합니다.')}>
                  레이어 더 보기
                </button>
                <DatasetButton type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setFitNonce((value) => value + 1)}>
                  전체 범위
                </DatasetButton>
              </div>
            </div>
            <div className="h-[360px] xl:h-[520px]">
              <DatasetPlaceMap
                places={displayedPlaces}
                selectedId={selectedPlaceId}
                onSelect={(id) => onSelectPlace(id)}
                regionOverlay={showRegionLayer && selectedRegion ? { name: selectedRegion.name, code: selectedRegion.code } : null}
                showPlaceMarkers={showPlaces}
                fitToCollection
                fitNonce={fitNonce}
              />
            </div>
            <p className="px-4 py-2 text-[11px] text-[#9A93C2]">
              권역 색은 연결된 장소 위치를 보여 주는 표시 범위입니다. 등록된 경계선이 아닙니다.
            </p>
          </DatasetCard>

          <div className="grid gap-4">
            <DatasetCard>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">지역 목록</h2>
                  <p className="mt-0.5 text-xs text-[#8B83B8]">
                    {filteredRegions[0]?.country ?? '몽골'} · 운영 권역 {filteredRegions.length}건
                  </p>
                </div>
              </div>
              <ul>
                {filteredRegions.map((row) => {
                  const selected = row.id === selectedRegionId;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between px-4 py-3 text-left ${selected ? 'bg-[#F3F0FF]' : 'hover:bg-slate-50'}`}
                        onClick={() => selectRegion(row.id)}
                      >
                        <span className={`text-sm font-medium ${selected ? 'text-[#5B4BD6]' : 'text-slate-800'}`}>{row.name}</span>
                        <span className="text-xs text-[#9A93C2]">{row.code}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </DatasetCard>

            {selectedRegion ? (
              <DatasetCard>
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">{selectedRegion.name}에 연결된 장소</h3>
                  <p className="mt-0.5 text-xs text-[#8B83B8]">
                    목적지 {areaCount} · 세부 장소 {detailCount} · 장소 ID {displayedPlaces.length}개
                  </p>
                </div>
                <div className="grid gap-3 px-4 py-3">
                  {groupedPlaces.groups.map((group) => {
                    const children = group.members.filter((row) => row.id !== group.root.id);
                    return (
                      <div key={group.root.id}>
                        <button
                          type="button"
                          className={`text-sm font-semibold ${datasetTheme.link}`}
                          onClick={() => onSelectPlace(group.root.id)}
                        >
                          {group.root.name} {group.root.code}
                        </button>
                        {children.length > 0 ? (
                          <p className="mt-1 text-xs leading-relaxed text-[#9A93C2]">
                            {children.map((row) => row.name).join(' · ')}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  {groupedPlaces.ungrouped.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="text-left text-sm text-slate-700"
                      onClick={() => onSelectPlace(row.id)}
                    >
                      {row.name} · {row.code} · {catalogPlaceTypeLabel(row.placeType, row.otherTypeLabel)}
                    </button>
                  ))}
                  {displayedPlaces.length === 0 ? <p className="text-sm text-slate-400">연결된 장소가 없습니다.</p> : null}
                  <p className="text-[11px] text-[#9A93C2]">
                    경로상 지점은 권역을 여러 개 붙일 수 있습니다. 연결은 기존 권역을 유지한 채 추가합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <DatasetButton type="button" variant="outline" className="h-9 px-3 text-xs" onClick={() => setConnectOpen(true)}>
                      기존 장소 연결
                    </DatasetButton>
                    <DatasetButton
                      type="button"
                      variant="outline"
                      className="h-9 px-3 text-xs"
                      onClick={() => onStub('분류 일괄 수정은 선택 장소의 권역만 바꾸며, 다음 단계에서 연결합니다.')}
                    >
                      분류 일괄 수정
                    </DatasetButton>
                  </div>
                  <p className="text-[11px] text-[#9A93C2]">
                    지도는 좌표가 있는 {mappedPlaces.length}개 장소를 표시합니다. 좌표 미등록 {displayedPlaces.length - mappedPlaces.length}개는 목록에서만 보입니다.
                  </p>
                </div>
              </DatasetCard>
            ) : null}
          </div>
        </div>
      )}

      {selectedRegion ? (
        <DatasetCard>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedRegion.name} · {selectedRegion.code}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${datasetTheme.badgeSoft}`}>
                  {selectedRegion.status === 'ACTIVE' ? '운영 권역' : '사용 안 함'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                국가 {selectedRegion.country} · 상위 지역 없음 · {selectedRegion.description ?? '설명 없음'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DatasetButton type="button" variant="outline" onClick={() => onStub('사용처·변경이력 상세는 다음 단계에서 연결합니다.')}>
                사용처 · 변경이력
              </DatasetButton>
              <DatasetButton type="button" variant="outline" onClick={openEdit}>
                지역 정보 편집
              </DatasetButton>
            </div>
          </div>
          <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-[#F3F0FF] px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">지역은 장소를 분류하는 기준</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">지역을 누르면 연결된 장소들이 지도에 표시됩니다.</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">지역 화면과 장소 화면은 같은 장소 ID를 사용합니다.</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">명칭만 바꿔도 장소 점·좌표는 유지됩니다.</p>
            </div>
            <div className="rounded-2xl bg-[#F8F6FF] px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">지도 표시 범위</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">경계가 없으면 연결된 장소가 보이도록 화면을 맞춥니다.</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">운영 경계가 등록된 경우에만 경계선을 표시합니다. 현재는 미등록입니다.</p>
              <p className="mt-2 text-xs text-[#9A93C2]">최근 이력 {(logsQuery.data?.catalogChangeLogs ?? []).length}건</p>
            </div>
          </div>
        </DatasetCard>
      ) : null}

      {editorOpen ? (
        <>
          <div className="fixed inset-0 z-50 bg-[#2A2155]/30 backdrop-blur-[1px]" onClick={() => setEditorOpen(false)} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className={`w-full max-w-md p-6 shadow-2xl ${datasetTheme.card}`} role="dialog">
              <h2 className="text-lg font-semibold text-slate-900">{editingRegionId ? '지역 정보 편집' : '지역 등록'}</h2>
              <p className="mt-1 text-sm text-slate-500">중부·고비 같은 넓은 분류입니다. 장소 좌표는 바꾸지 않습니다.</p>
              <div className="mt-4 grid gap-3">
                <DatasetField label="지역명">
                  <Input className={datasetControlClass} value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="예: 테를지" />
                </DatasetField>
                <DatasetField label="국가">
                  <Input className={datasetControlClass} value={countryInput} onChange={(event) => setCountryInput(event.target.value)} />
                </DatasetField>
                <DatasetField label="설명">
                  <Input className={datasetControlClass} value={descriptionInput} onChange={(event) => setDescriptionInput(event.target.value)} placeholder="선택 입력" />
                </DatasetField>
                {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <DatasetButton type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  취소
                </DatasetButton>
                <DatasetButton type="button" variant="primary" disabled={!nameInput.trim() || saving} onClick={() => void handleSaveRegion()}>
                  {saving ? '저장 중…' : '저장'}
                </DatasetButton>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {connectOpen && selectedRegion ? (
        <>
          <div className="fixed inset-0 z-50 bg-[#2A2155]/30 backdrop-blur-[1px]" onClick={() => setConnectOpen(false)} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className={`w-full max-w-md p-6 shadow-2xl ${datasetTheme.card}`} role="dialog">
              <h2 className="text-lg font-semibold text-slate-900">기존 장소 연결</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedRegion.name} 권역을 추가합니다. 기존 권역은 유지하고, 좌표·상위 장소는 바꾸지 않습니다.
              </p>
              <div className="mt-4">
                <DatasetField label="장소">
                  <select className={datasetControlClass} value={connectPlaceId} onChange={(event) => setConnectPlaceId(event.target.value)}>
                    <option value="">선택</option>
                    {connectablePlaces.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.code}
                      </option>
                    ))}
                  </select>
                </DatasetField>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <DatasetButton type="button" variant="outline" onClick={() => setConnectOpen(false)}>
                  취소
                </DatasetButton>
                <DatasetButton
                  type="button"
                  variant="primary"
                  disabled={!connectPlaceId || updatePlaceState.loading}
                  onClick={() => void handleConnectPlace()}
                >
                  {updatePlaceState.loading ? '연결 중…' : '권역만 연결'}
                </DatasetButton>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
