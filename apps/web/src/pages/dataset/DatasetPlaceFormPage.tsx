import { Input } from '@tour/ui';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAccommodation, useAccommodations } from '../../features/accommodation/hooks';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import { useCatalogPlaces, useCatalogRegions, useCreateCatalogPlace, useUpdateCatalogPlace } from '../../features/dataset/hooks';
import { DatasetPageFooter, PLACE_TYPE_LABEL, type CatalogPlaceType, type CatalogUsageStatus } from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import { DatasetButton, DatasetCard, DatasetField, DatasetPageShell, datasetControlClass } from '../../features/dataset/ui';
import { DatasetPlaceFormMap } from './DatasetPlaceFormMap';

const PLACE_TYPES: CatalogPlaceType[] = ['LODGING', 'EXPERIENCE', 'MEETING', 'GATE', 'AREA'];
const LODGING_ROLES = [
  { id: 'REPRESENTATIVE', label: '대표 위치' },
  { id: 'GATE', label: '출입 지점' },
  { id: 'PICKUP', label: '픽업 지점' },
] as const;

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function parseCoordPair(raw: string): { lat: number; lng: number } | null {
  const parts = raw.trim().replace(/[°]/g, '').split(/[,\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function formatCoord(value: number | null): string {
  return value == null ? '' : String(value);
}

function descendantIds(places: CatalogPlaceRow[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const row of places) {
    if (!row.parentPlaceId) continue;
    const list = childrenOf.get(row.parentPlaceId) ?? [];
    list.push(row.id);
    childrenOf.set(row.parentPlaceId, list);
  }
  const found = new Set<string>();
  const stack = [...(childrenOf.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (found.has(id)) continue;
    found.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return found;
}

function Section({
  n,
  title,
  extra,
  children,
}: {
  n: number;
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <DatasetCard>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#5B4BD6] text-xs font-semibold text-white">{n}</span>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        {extra}
      </div>
      <div className="grid gap-3 px-4 py-4">{children}</div>
    </DatasetCard>
  );
}

export function DatasetPlaceFormPage(): JSX.Element {
  const navigate = useNavigate();
  const { placeId } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(placeId);

  const placesQuery = useCatalogPlaces();
  const regionsQuery = useCatalogRegions();
  const [createPlace, createState] = useCreateCatalogPlace();
  const [updatePlace, updateState] = useUpdateCatalogPlace();
  const { accommodations } = useAccommodations({});

  const places = placesQuery.data?.catalogPlaces ?? [];
  const regions = regionsQuery.data?.catalogRegions ?? [];
  const editingPlace = useMemo(
    () => (placeId ? places.find((row) => row.id === placeId) ?? null : null),
    [placeId, places],
  );

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const requestedType = searchParams.get('type') as CatalogPlaceType | null;
  const initialType = requestedType && PLACE_TYPES.includes(requestedType) ? requestedType : 'LODGING';
  const [placeType, setPlaceType] = useState<CatalogPlaceType>(initialType);
  const [status, setStatus] = useState<CatalogUsageStatus>('ACTIVE');
  const [parentPlaceId, setParentPlaceId] = useState(initialType === 'AREA' ? '' : searchParams.get('parentId') ?? '');
  const [country, setCountry] = useState('몽골');
  const [regionId, setRegionId] = useState('');
  const [accommodationId, setAccommodationId] = useState(
    initialType === 'LODGING' ? searchParams.get('accommodationId') ?? '' : '',
  );
  const [lodgingRole, setLodgingRole] = useState<(typeof LODGING_ROLES)[number]['id']>('PICKUP');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [pickEnabled, setPickEnabled] = useState(!isEdit);
  const [coordSource, setCoordSource] = useState<'map' | 'input' | 'paste' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!isEdit);

  const latitude = parseOptionalNumber(latInput);
  const longitude = parseOptionalNumber(lngInput);
  const isArea = placeType === 'AREA';
  const isLodging = placeType === 'LODGING';
  const { accommodation } = useAccommodation(isLodging ? accommodationId || undefined : undefined);

  useEffect(() => {
    if (!isEdit || !editingPlace || hydrated) return;
    setName(editingPlace.name);
    setDisplayName(editingPlace.displayName ?? '');
    setPlaceType(editingPlace.placeType);
    setStatus(editingPlace.status);
    setParentPlaceId(editingPlace.placeType === 'AREA' ? '' : editingPlace.parentPlaceId ?? '');
    setCountry(editingPlace.country);
    setRegionId(editingPlace.regionId ?? '');
    setAccommodationId(editingPlace.placeType === 'LODGING' ? editingPlace.accommodationId ?? '' : '');
    setLatInput(formatCoord(editingPlace.latitude));
    setLngInput(formatCoord(editingPlace.longitude));
    setCoordSource(editingPlace.latitude != null ? 'input' : null);
    setHydrated(true);
  }, [editingPlace, hydrated, isEdit]);

  const parentPlace = useMemo(
    () => places.find((row) => row.id === parentPlaceId) ?? null,
    [parentPlaceId, places],
  );
  const blockedParentIds = useMemo(() => {
    if (!placeId) return new Set<string>();
    const blocked = descendantIds(places, placeId);
    blocked.add(placeId);
    return blocked;
  }, [placeId, places]);

  useEffect(() => {
    if (isArea) {
      if (parentPlaceId) setParentPlaceId('');
      return;
    }
    if (!parentPlace) return;
    if (parentPlace.country) setCountry(parentPlace.country);
    if (parentPlace.regionId) setRegionId(parentPlace.regionId);
    if (isLodging && parentPlace.accommodationId) setAccommodationId(parentPlace.accommodationId);
    if (parentPlace.latitude != null && parentPlace.longitude != null && latitude == null && longitude == null) {
      setFocus({ lat: parentPlace.latitude, lng: parentPlace.longitude });
    }
  }, [isArea, isLodging, latitude, longitude, parentPlace, parentPlaceId]);

  const relatedPlaces = useMemo(() => {
    if (accommodationId) {
      return places.filter((row) => row.placeType === 'LODGING' && row.accommodationId === accommodationId && row.id !== placeId);
    }
    if (parentPlaceId) {
      return places.filter(
        (row) => (row.id === parentPlaceId || row.parentPlaceId === parentPlaceId) && row.id !== placeId,
      );
    }
    return [];
  }, [accommodationId, parentPlaceId, placeId, places]);

  const regionPath = [country, regions.find((row) => row.id === regionId)?.name, parentPlace?.name]
    .filter(Boolean)
    .join(' / ');

  const coordPairError = (() => {
    const latRaw = latInput.trim();
    const lngRaw = lngInput.trim();
    if (!latRaw && !lngRaw) return null;
    if (!latRaw || !lngRaw) return '위도와 경도를 함께 입력하거나 둘 다 비우세요.';
    if (latitude == null || latitude < -90 || latitude > 90) return '위도는 -90~90 사이여야 합니다.';
    if (longitude == null || longitude < -180 || longitude > 180) return '경도는 -180~180 사이여야 합니다.';
    return null;
  })();

  const saving = createState.loading || updateState.loading;
  const canSave = Boolean(name.trim()) && !coordPairError;

  const applyCoords = (lat: number, lng: number, source: 'map' | 'input' | 'paste') => {
    setLatInput(String(lat));
    setLngInput(String(lng));
    setCoordSource(source);
    setFocus({ lat, lng });
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query || typeof google === 'undefined') return;
    setSearchError(null);
    const geocoder = new google.maps.Geocoder();
    void geocoder.geocode({ address: query }, (results, statusCode) => {
      if (statusCode !== 'OK' || !results?.length) {
        setSearchResults([]);
        setSearchError('검색 결과가 없습니다. 조회만 했으며 좌표는 바뀌지 않았습니다.');
        return;
      }
      setSearchResults(
        results.slice(0, 5).map((row) => ({
          label: row.formatted_address,
          lat: row.geometry.location.lat(),
          lng: row.geometry.location.lng(),
        })),
      );
    });
  };

  const resetForNext = () => {
    setName('');
    setDisplayName('');
    setLatInput('');
    setLngInput('');
    setPasteInput('');
    setCoordSource(null);
    setSearchQuery('');
    setSearchResults([]);
    setFormError(null);
    setPickEnabled(true);
  };

  const buildInput = () => ({
    name: name.trim(),
    placeType,
    country: country.trim() || '몽골',
    regionId: regionId || null,
    parentPlaceId: isArea ? null : parentPlaceId || null,
    latitude,
    longitude,
    displayName: displayName.trim() || null,
    accommodationId: isLodging ? accommodationId || null : null,
    status,
  });

  const handleSave = async (continueCreating: boolean) => {
    if (!canSave) {
      setFormError(coordPairError ?? '장소명을 입력하세요.');
      return;
    }
    setFormError(null);
    try {
      if (isEdit && placeId) {
        await updatePlace({ variables: { id: placeId, input: buildInput() } });
        navigate('/dataset/places');
        return;
      }
      await createPlace({ variables: { input: buildInput() } });
      if (continueCreating) {
        resetForNext();
        return;
      }
      navigate('/dataset/places');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  };

  const leaveToList = () => {
    let dirty = false;
    if (isEdit && editingPlace) {
      dirty =
        name !== editingPlace.name ||
        displayName !== (editingPlace.displayName ?? '') ||
        placeType !== editingPlace.placeType ||
        status !== editingPlace.status ||
        parentPlaceId !== (editingPlace.parentPlaceId ?? '') ||
        country !== editingPlace.country ||
        regionId !== (editingPlace.regionId ?? '') ||
        accommodationId !== (editingPlace.accommodationId ?? '') ||
        latInput !== formatCoord(editingPlace.latitude) ||
        lngInput !== formatCoord(editingPlace.longitude);
    } else if (!isEdit) {
      dirty = Boolean(name.trim() || displayName.trim() || latInput.trim() || lngInput.trim() || pasteInput.trim());
    }
    if (dirty && !window.confirm('작성 중인 내용이 있습니다. 목록으로 돌아갈까요?')) return;
    navigate('/dataset/places');
  };

  const firstRoom = accommodation?.options[0] ?? null;
  const rateLabel = firstRoom
    ? `${(firstRoom.pricePeakSeason ?? firstRoom.priceOffSeason)?.toLocaleString() ?? '요금 미등록'} ${firstRoom.priceCurrencyCode} / ${
        firstRoom.paymentMethod === 'PER_PERSON' ? '인' : '객실'
      } · 1박`
    : '요금 미등록';

  const typeOptions: CatalogPlaceType[] = PLACE_TYPES;

  return (
    <DatasetPageShell>
      <section className="grid gap-4 xl:pb-24">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#8B83B8]">일정 데이터 관리 / 장소 · 지역 · 경로 / 장소</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {isEdit ? '장소 편집' : placeType === 'AREA' ? '목적지 등록' : '장소 등록'}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${datasetTheme.badgeSoft}`}>
                {isEdit ? '편집' : placeType === 'AREA' ? '새목적지' : '새장소'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {placeType === 'AREA'
                ? '하위 장소를 묶는 목적지를 등록합니다. 목적지는 상위 장소가 없고, 좌표도 필수가 아닙니다.'
                : placeType === 'LODGING'
                  ? '숙소 장소를 등록하고, 객실·요금 원본인 숙소 정보에 연결합니다.'
                  : '목적지나 다른 장소 아래의 지점을 등록합니다. 숙소 원본은 숙소 유형에서만 연결합니다.'}
            </p>
          </div>
          <DatasetButton type="button" variant="outline" onClick={leaveToList}>
            목록으로
          </DatasetButton>
        </header>

        {isEdit && !hydrated ? (
          placesQuery.loading || editingPlace ? (
            <p className="text-sm text-slate-500">불러오는 중…</p>
          ) : (
            <p className="text-sm text-rose-600">장소를 찾지 못했습니다.</p>
          )
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <div className="grid gap-4">
              <Section
                n={1}
                title="기본정보"
                extra={<span className="text-xs text-[#9A93C2]">{isEdit && editingPlace ? `ID ${editingPlace.code}` : 'ID는 저장 시 생성'}</span>}
              >
                <DatasetField label="장소명">
                  <Input className={datasetControlClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="예: A캠프 추가 픽업 지점" />
                </DatasetField>
                <DatasetField label="고객 표시명">
                  <Input
                    className={datasetControlClass}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="비우면 장소명을 사용합니다"
                  />
                </DatasetField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DatasetField label="장소 유형">
                    <select
                      className={datasetControlClass}
                      value={placeType}
                      onChange={(event) => {
                        const next = event.target.value as CatalogPlaceType;
                        setPlaceType(next);
                        if (next === 'AREA') setParentPlaceId('');
                        if (next !== 'LODGING') setAccommodationId('');
                      }}
                    >
                      {typeOptions.map((value) => (
                        <option key={value} value={value}>
                          {PLACE_TYPE_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </DatasetField>
                  <DatasetField label="사용 상태">
                    <select className={datasetControlClass} value={status} onChange={(event) => setStatus(event.target.value as CatalogUsageStatus)}>
                      <option value="ACTIVE">사용 중</option>
                      <option value="INACTIVE">사용 안 함</option>
                    </select>
                  </DatasetField>
                </div>
              </Section>

              <Section n={2} title={isArea ? '분류' : '상위 장소'}>
                {isArea ? (
                  <p className="text-xs text-[#8B83B8]">목적지는 상위 장소 없이 국가·권역만 가집니다. 다른 장소가 이 목적지를 상위로 둘 수 있습니다.</p>
                ) : (
                  <>
                    <DatasetField label="바로 위 장소">
                      <select
                        className={datasetControlClass}
                        value={parentPlaceId}
                        onChange={(event) => setParentPlaceId(event.target.value)}
                      >
                        <option value="">선택 안 함</option>
                        {places
                          .filter((row) => !blockedParentIds.has(row.id))
                          .map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name} · {row.code}
                            </option>
                          ))}
                      </select>
                    </DatasetField>
                    <p className="text-xs text-[#8B83B8]">분류 경로 · {regionPath || '상위 장소를 선택하면 국가·권역을 참조합니다.'}</p>
                  </>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <DatasetField label="국가">
                    <Input
                      className={datasetControlClass}
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      disabled={!isArea && Boolean(parentPlace)}
                    />
                  </DatasetField>
                  <DatasetField label="권역">
                    <select
                      className={datasetControlClass}
                      value={regionId}
                      onChange={(event) => setRegionId(event.target.value)}
                      disabled={!isArea && Boolean(parentPlace?.regionId)}
                    >
                      <option value="">선택 안 함</option>
                      {regions.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </DatasetField>
                </div>
                {isArea ? null : <p className="text-xs text-[#8B83B8]">상위 장소의 좌표는 새 지점의 좌표로 복사하지 않습니다.</p>}
              </Section>

              {isLodging ? (
                <>
              <Section
                n={3}
                title="연결 숙소"
                extra={
                  <select
                    className={datasetControlClass}
                    value={accommodationId}
                    onChange={(event) => setAccommodationId(event.target.value)}
                    disabled={Boolean(parentPlace?.accommodationId)}
                  >
                    <option value="">숙소 선택</option>
                    {accommodations.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                }
              >
                  {accommodation ? (
                    <div className="rounded-xl border border-slate-100 bg-[#F8F6FF] px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link className={`text-sm font-semibold ${datasetTheme.link}`} to={`/accommodations/${accommodation.id}`}>
                          {accommodation.name}
                        </Link>
                        <span className="text-xs text-[#8B83B8]">{firstRoom?.level ?? '등급 미등록'}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#9A93C2]">
                        {accommodation.id} · {accommodation.destination} · {accommodation.region}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {parentPlace?.accommodationId
                        ? '상위 장소의 숙소 연결을 따릅니다.'
                        : '객실·요금 원본인 기존 숙소를 선택합니다. 새 숙소는 여기서 만들지 않습니다.'}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DatasetField label="연결 용도">
                      <select
                        className={datasetControlClass}
                        value={lodgingRole}
                        onChange={(event) => setLodgingRole(event.target.value as (typeof LODGING_ROLES)[number]['id'])}
                      >
                        {LODGING_ROLES.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.label}
                          </option>
                        ))}
                      </select>
                    </DatasetField>
                    <DatasetField label="요금 조회 기준">
                      <Input className={datasetControlClass} value="매입 · 조회 전용" readOnly />
                    </DatasetField>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{rateLabel}</p>
                  <p className="text-xs text-[#8B83B8]">
                    {parentPlace?.accommodationId
                      ? '상위 장소의 숙소 연결을 따릅니다. 좌표는 복사하지 않습니다.'
                      : '등급·요금은 숙소 원본을 참조합니다. 조회 조건 변경은 요금 수정이 아닙니다.'}
                  </p>
                </Section>

              {!accommodationId ? null : (
                <Section
                  n={8}
                  title={`이 숙소에 연결된 기존 장소 ${relatedPlaces.length}개`}
                  extra={
                    <Link className={`text-xs font-medium ${datasetTheme.link}`} to={`/dataset/places`}>
                      전체 보기
                    </Link>
                  }
                >
                  {relatedPlaces.length === 0 ? (
                    <p className="text-sm text-slate-400">아직 연결된 장소가 없습니다.</p>
                  ) : (
                    <ul className="grid gap-2">
                      {relatedPlaces.map((row) => (
                        <li key={row.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{row.name}</p>
                            <p className="text-xs text-[#9A93C2]">{PLACE_TYPE_LABEL[row.placeType]}</p>
                          </div>
                          <span className="text-xs text-[#8B83B8]">{row.code}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-[#8B83B8]">새 지점은 저장 후 이 목록에 추가됩니다. 기존 대표 위치를 바꾸지 않습니다.</p>
                </Section>
              )}
                </>
              ) : null}
            </div>

            <div className="grid gap-4">
              <Section
                n={4}
                title="위치 지정"
                extra={
                  <span className="text-xs text-[#9A93C2]">
                    {latitude != null && longitude != null ? '좌표 등록됨' : '좌표 미등록'}
                  </span>
                }
              >
                <div className="flex gap-2">
                  <Input
                    className={datasetControlClass}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="장소명 · 주소 · 좌표로 검색"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSearch();
                      }
                    }}
                  />
                  <DatasetButton type="button" variant="outline" onClick={handleSearch}>
                    검색
                  </DatasetButton>
                  <DatasetButton type="button" variant={pickEnabled ? 'primary' : 'outline'} onClick={() => setPickEnabled((value) => !value)}>
                    지도에서 지정
                  </DatasetButton>
                </div>
                {searchError ? <p className="text-xs text-amber-600">{searchError}</p> : null}
                {searchResults.length > 0 ? (
                  <ul className="grid gap-1">
                    {searchResults.map((row) => (
                      <li key={`${row.lat}-${row.lng}-${row.label}`}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-slate-100 px-3 py-2 text-left text-xs hover:bg-[#F8F6FF]"
                          onClick={() => applyCoords(row.lat, row.lng, 'map')}
                        >
                          {row.label}
                          <span className="mt-0.5 block text-[#9A93C2]">이 위치 사용</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="relative h-[280px] overflow-hidden rounded-xl border border-slate-100">
                  {pickEnabled && latitude == null && longitude == null ? (
                    <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm">
                      새 지점의 위치를 지정해 주세요. 상위 좌표는 복사되지 않습니다.
                    </div>
                  ) : null}
                  <DatasetPlaceFormMap
                    relatedPlaces={relatedPlaces}
                    latitude={latitude}
                    longitude={longitude}
                    pickEnabled={pickEnabled}
                    focus={focus}
                    onPick={(lat, lng) => applyCoords(lat, lng, 'map')}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <DatasetField label="위도">
                    <Input
                      className={datasetControlClass}
                      value={latInput}
                      onChange={(event) => setLatInput(event.target.value)}
                      onBlur={() => {
                        if (latitude != null && longitude != null) setCoordSource('input');
                      }}
                      placeholder="비우면 미등록"
                    />
                  </DatasetField>
                  <DatasetField label="경도">
                    <Input
                      className={datasetControlClass}
                      value={lngInput}
                      onChange={(event) => setLngInput(event.target.value)}
                      onBlur={() => {
                        if (latitude != null && longitude != null) setCoordSource('input');
                      }}
                      placeholder="비우면 미등록"
                    />
                  </DatasetField>
                  <div className="flex items-end">
                    <DatasetButton
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const parsed = parseCoordPair(pasteInput || `${latInput},${lngInput}`);
                        if (!parsed) {
                          setFormError('위도, 경도 순서로 붙여넣으세요.');
                          return;
                        }
                        applyCoords(parsed.lat, parsed.lng, 'paste');
                        setPasteInput('');
                      }}
                    >
                      좌표 붙여넣기
                    </DatasetButton>
                  </div>
                </div>
                <Input
                  className={datasetControlClass}
                  value={pasteInput}
                  onChange={(event) => setPasteInput(event.target.value)}
                  placeholder="예: 47.8512, 106.9120"
                />
                {coordPairError ? <p className="text-xs text-rose-600">{coordPairError}</p> : null}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>위치 상태 · {latitude != null && longitude != null ? '등록됨' : '미등록'}</span>
                  <span>입력 출처 · {coordSource === 'map' ? '지도 지정' : coordSource === 'paste' ? '붙여넣기' : coordSource === 'input' ? '직접 입력' : '미지정'}</span>
                </div>
              </Section>

              <Section n={9} title="저장 전 확인">
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">장소명 · 유형</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {name.trim() || '미입력'} · {PLACE_TYPE_LABEL[placeType]}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">상위 관계</dt>
                    <dd className="text-right text-slate-800">
                      {isArea ? '없음 · 목적지' : parentPlace ? `${parentPlace.name} · ${parentPlace.code}` : '없음'}
                    </dd>
                  </div>
                  {isLodging ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">숙소 원본</dt>
                      <dd className="text-right text-slate-800">
                        {accommodation ? `${accommodation.name} · ${LODGING_ROLES.find((row) => row.id === lodgingRole)?.label}` : '연결 안 함'}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">좌표</dt>
                    <dd className="text-right text-slate-800">{latitude != null && longitude != null ? '지정 가능' : '미등록 · 저장 가능'}</dd>
                  </div>
                </dl>
                {latitude == null && longitude == null ? (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">좌표 없이 장소를 먼저 저장할 수 있습니다.</p>
                ) : null}
              </Section>
            </div>
          </div>
        )}

        {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

        {!isEdit || hydrated ? (
        <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 xl:sticky xl:bottom-3 ${datasetTheme.card}`}>
          <p className="text-sm text-slate-600">
            {isEdit
              ? '현재 장소 원본을 저장합니다.'
              : isArea
                ? '새 목적지 1개 등록 · 상위 장소 없이 국가·권역만 저장합니다.'
                : isLodging
                  ? '새 숙소 장소 1개 등록 · 객실·요금 원본만 연결합니다.'
                  : '새 장소 1개 등록 · 상위 장소만 반영하고 숙소 원본은 연결하지 않습니다.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <DatasetButton type="button" variant="outline" onClick={leaveToList}>
              취소
            </DatasetButton>
            {isEdit ? null : (
              <DatasetButton type="button" variant="outline" disabled={!canSave || saving} onClick={() => void handleSave(true)}>
                저장 후 새 장소 등록
              </DatasetButton>
            )}
            <DatasetButton type="button" variant="primary" disabled={!canSave || saving} onClick={() => void handleSave(false)}>
              {saving ? '저장 중…' : '장소 저장'}
            </DatasetButton>
          </div>
        </div>
        ) : null}

        <DatasetPageFooter screenId="T01-03 · 장소 등록·편집" />
      </section>
    </DatasetPageShell>
  );
}
