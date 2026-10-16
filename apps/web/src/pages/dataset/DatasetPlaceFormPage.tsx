import { Input } from '@tour/ui';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAccommodation, useAccommodations } from '../../features/accommodation/hooks';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import { useCatalogPlaces, useCatalogRegions, useCreateCatalogPlace, useUpdateCatalogPlace } from '../../features/dataset/hooks';
import {
  findGooglePlaceNames,
  getGooglePlaceById,
  looksLikeAdminName,
  nearbyGooglePlaceNames,
  type GooglePlaceNameCandidate,
} from '../../features/dataset/google-place-name';
import { searchAccommodations } from '../../features/dataset/accommodation-search';
import { parsePlaceVisitQuery, visitToPlaceDraft } from '../../features/dataset/place-visit-draft';
import { getTodayInUlaanbaatarDateInputValue } from '../../features/guide/guide-location-map-utils';
import {
  useGuidePlaceVisits,
  useLeaderstepsActiveProjects,
  useLeaderstepsAuthUsers,
  type GuidePlaceVisitRow,
} from '../../features/guide/hooks';
import {
  DatasetPageFooter,
  CATALOG_PLACE_TYPES,
  PLACE_TYPE_LABEL,
  VISIT_JUDGMENT_TYPE_LABEL,
  canLinkAccommodation,
  catalogPlaceTypeLabel,
  defaultVisitJudgmentType,
  nearbyPlaceKind,
  type CatalogPlaceType,
  type CatalogUsageStatus,
  type CatalogVisitJudgmentType,
} from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import { DatasetButton, DatasetCard, DatasetField, DatasetPageShell, DatasetTabs, datasetControlClass } from '../../features/dataset/ui';
import { DatasetPlaceFormMap, type PlaceFormMapFocus } from './DatasetPlaceFormMap';

const PLACE_FOCUS_ZOOM = 15;

type LocationLookupMode = 'visit' | 'google' | 'catalog';

const LOCATION_LOOKUP_TABS: Array<{ id: LocationLookupMode; label: string }> = [
  { id: 'catalog', label: '기존 장소로 검색' },
  { id: 'visit', label: '프로젝트 방문장소로 조회' },
  { id: 'google', label: '구글지도로 검색' },
];

function normalizePlaceSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function catalogPlaceSearchHaystack(row: CatalogPlaceRow): string {
  return [row.name, row.displayName, row.code, row.otherTypeLabel, row.region?.name, row.parentPlace?.name, row.country]
    .filter(Boolean)
    .join(' ');
}

function searchCatalogPlaces(places: CatalogPlaceRow[], query: string, excludeId?: string): CatalogPlaceRow[] {
  const rows = excludeId ? places.filter((row) => row.id !== excludeId) : places;
  const needle = normalizePlaceSearch(query);
  if (!needle) return rows;
  return rows.filter((row) => normalizePlaceSearch(catalogPlaceSearchHaystack(row)).includes(needle));
}

function distanceM(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PLACE_TYPES = CATALOG_PLACE_TYPES;
const DEFAULT_VISIT_RADIUS_M = 50;
const DEFAULT_VISIT_MIN_STAY_MINUTES = 3;
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

function parseOptionalInt(raw: string): number | null {
  const value = parseOptionalNumber(raw);
  if (value == null) return null;
  return Number.isInteger(value) ? value : null;
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

function uniqueKeepFirst(
  first: GooglePlaceNameCandidate,
  rest: GooglePlaceNameCandidate[],
): GooglePlaceNameCandidate[] {
  return [first, ...rest.filter((row) => row.name !== first.name || row.lat !== first.lat || row.lng !== first.lng)].slice(
    0,
    8,
  );
}

function NearbyPlaceButtons({
  places,
  onPick,
}: {
  places: GooglePlaceNameCandidate[];
  onPick: (row: GooglePlaceNameCandidate) => void;
}): JSX.Element | null {
  if (places.length === 0) return null;
  return (
    <ul className="grid gap-1">
      {places.map((row) => (
        <li key={`${row.name}-${row.lat}-${row.lng}`}>
          <button
            type="button"
            className="w-full rounded-lg border border-slate-100 px-3 py-2 text-left text-xs hover:bg-[#F8F6FF]"
            onClick={() => onPick(row)}
          >
            {row.name}
            {row.address ? <span className="mt-0.5 block text-[#9A93C2]">{row.address}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
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
  const { authUsers } = useLeaderstepsAuthUsers();

  const places = placesQuery.data?.catalogPlaces ?? [];
  const regions = regionsQuery.data?.catalogRegions ?? [];
  const editingPlace = useMemo(
    () => (placeId ? places.find((row) => row.id === placeId) ?? null : null),
    [placeId, places],
  );

  const visitQuery = !isEdit ? parsePlaceVisitQuery(searchParams) : null;
  const visitDraft = visitQuery ? visitToPlaceDraft(visitQuery) : null;
  const [name, setName] = useState(
    visitDraft?.name && !looksLikeAdminName(visitDraft.name) ? visitDraft.name : '',
  );
  const [displayName, setDisplayName] = useState('');
  const requestedType = searchParams.get('type') as CatalogPlaceType | null;
  const initialType =
    visitDraft?.placeType ?? (requestedType && PLACE_TYPES.includes(requestedType) ? requestedType : 'LODGING');
  const [placeType, setPlaceType] = useState<CatalogPlaceType>(initialType);
  const [otherTypeLabel, setOtherTypeLabel] = useState('');
  const [status, setStatus] = useState<CatalogUsageStatus>('ACTIVE');
  const [parentPlaceId, setParentPlaceId] = useState(initialType === 'AREA' ? '' : searchParams.get('parentId') ?? '');
  const [country, setCountry] = useState('몽골');
  const [regionId, setRegionId] = useState('');
  const [accommodationId, setAccommodationId] = useState(
    canLinkAccommodation(initialType) ? searchParams.get('accommodationId') ?? '' : '',
  );
  const [accommodationQuery, setAccommodationQuery] = useState('');
  const [lodgingRole, setLodgingRole] = useState<(typeof LODGING_ROLES)[number]['id']>('PICKUP');
  const [latInput, setLatInput] = useState(visitDraft ? String(visitDraft.latitude) : '');
  const [lngInput, setLngInput] = useState(visitDraft ? String(visitDraft.longitude) : '');
  const [pasteInput, setPasteInput] = useState('');
  const [coordSource, setCoordSource] = useState<'map' | 'input' | 'paste' | 'visit' | null>(
    visitDraft ? 'visit' : null,
  );
  const [lookupMode, setLookupMode] = useState<LocationLookupMode>(visitDraft ? 'visit' : 'catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ label: string; name: string | null; lat: number; lng: number }>>(
    [],
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<GooglePlaceNameCandidate[]>([]);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [focus, setFocus] = useState<PlaceFormMapFocus | null>(
    visitDraft ? { lat: visitDraft.latitude, lng: visitDraft.longitude, zoom: PLACE_FOCUS_ZOOM } : null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!isEdit);
  const [visitJudgmentType, setVisitJudgmentType] = useState<CatalogVisitJudgmentType>(
    visitDraft?.visitJudgmentType ?? defaultVisitJudgmentType(initialType),
  );
  const [radiusInput, setRadiusInput] = useState(
    visitDraft ? String(visitDraft.visitRadiusM) : String(DEFAULT_VISIT_RADIUS_M),
  );
  const [stayMinutesInput, setStayMinutesInput] = useState(
    visitDraft
      ? visitDraft.visitMinStayMinutes != null
        ? String(visitDraft.visitMinStayMinutes)
        : ''
      : String(DEFAULT_VISIT_MIN_STAY_MINUTES),
  );
  const [visitGuideId, setVisitGuideId] = useState(isEdit ? '' : searchParams.get('guideId') ?? '');
  const [visitDate, setVisitDate] = useState(
    isEdit ? '' : searchParams.get('date') || getTodayInUlaanbaatarDateInputValue(),
  );
  const [visitProjectId, setVisitProjectId] = useState(isEdit ? '' : searchParams.get('projectId') ?? '');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const visitPeople = useMemo(() => {
    const people = authUsers.map((user) => ({
      id: user.linkedGuideId ?? user.id,
      nameKo: user.linkedGuideNameKo ?? user.displayName ?? user.email ?? '현장 참여자',
      nameMn: user.linkedGuideNameMn,
      linked: Boolean(user.linkedGuideId),
    }));
    const unique = new Map<string, (typeof people)[number]>();
    for (const person of people) {
      unique.set(person.id, person);
    }
    const sorted = [...unique.values()].sort((left, right) => {
      if (left.linked !== right.linked) return left.linked ? -1 : 1;
      return left.nameKo.localeCompare(right.nameKo, 'ko');
    });
    if (visitGuideId && !sorted.some((row) => row.id === visitGuideId)) {
      return [{ id: visitGuideId, nameKo: '현장 참여자', nameMn: null, linked: false }, ...sorted];
    }
    return sorted;
  }, [authUsers, visitGuideId]);
  const { projects: visitProjects } = useLeaderstepsActiveProjects(visitDate || undefined, {
    all: !visitDate,
  });
  const visitProjectOptions = useMemo(() => {
    if (visitProjectId && !visitProjects.some((row) => row.id === visitProjectId)) {
      return [{ id: visitProjectId, name: '선택한 프로젝트' }, ...visitProjects];
    }
    return visitProjects;
  }, [visitProjectId, visitProjects]);
  const { placeVisits, loading: visitLoading, errorMessage: visitError } = useGuidePlaceVisits({
    guideId: lookupMode === 'visit' && visitGuideId ? visitGuideId : undefined,
    projectId: lookupMode === 'visit' && visitProjectId ? visitProjectId : undefined,
    date: lookupMode === 'visit' && visitDate ? visitDate : undefined,
  });

  const latitude = parseOptionalNumber(latInput);
  const longitude = parseOptionalNumber(lngInput);
  const visitRadiusM = parseOptionalInt(radiusInput);
  const visitMinStayMinutes = parseOptionalInt(stayMinutesInput);
  const isStayJudgment = visitJudgmentType === 'STAY';
  const isArea = placeType === 'AREA';
  const isLodging = placeType === 'LODGING';
  const isRestaurant = placeType === 'RESTAURANT';
  const isOther = placeType === 'OTHER';
  const showLodgingSection = canLinkAccommodation(placeType);
  const showRelatedPlaces = showLodgingSection && Boolean(accommodationId);
  let sectionNo = 1;
  const sectionN = {
    basic: sectionNo++,
    parent: sectionNo++,
    lodging: showLodgingSection ? sectionNo++ : 0,
    related: showRelatedPlaces ? sectionNo++ : 0,
    location: sectionNo++,
    judgment: sectionNo++,
    confirm: sectionNo++,
  };
  const { accommodation } = useAccommodation(showLodgingSection ? accommodationId || undefined : undefined);

  const visitLookupLat = visitDraft?.latitude;
  const visitLookupLng = visitDraft?.longitude;
  const visitLookupKind = visitDraft ? nearbyPlaceKind(visitDraft.placeType) : 'any';
  useEffect(() => {
    if (visitLookupLat == null || visitLookupLng == null) return;
    let cancelled = false;
    void nearbyGooglePlaceNames({
      lat: visitLookupLat,
      lng: visitLookupLng,
      kind: visitLookupKind,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setNearbyPlaces([]);
        setNearbyError(result.error === 'unavailable' ? '미연동' : '자료 없음');
        return;
      }
      setNearbyPlaces(result.places);
    });
    return () => {
      cancelled = true;
    };
  }, [visitLookupLat, visitLookupLng, visitLookupKind]);

  useEffect(() => {
    if (!isEdit || !editingPlace || hydrated) return;
    setName(editingPlace.name);
    setDisplayName(editingPlace.displayName ?? '');
    setPlaceType(editingPlace.placeType);
    setOtherTypeLabel(editingPlace.otherTypeLabel ?? '');
    setStatus(editingPlace.status);
    setParentPlaceId(editingPlace.placeType === 'AREA' ? '' : editingPlace.parentPlaceId ?? '');
    setCountry(editingPlace.country);
    setRegionId(editingPlace.regionId ?? '');
    setAccommodationId(canLinkAccommodation(editingPlace.placeType) ? editingPlace.accommodationId ?? '' : '');
    setLatInput(formatCoord(editingPlace.latitude));
    setLngInput(formatCoord(editingPlace.longitude));
    setCoordSource(editingPlace.latitude != null ? 'input' : null);
    setVisitJudgmentType(editingPlace.visitJudgmentType ?? defaultVisitJudgmentType(editingPlace.placeType));
    setRadiusInput(editingPlace.visitRadiusM != null ? String(editingPlace.visitRadiusM) : '');
    setStayMinutesInput(editingPlace.visitMinStayMinutes != null ? String(editingPlace.visitMinStayMinutes) : '');
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
    if (showLodgingSection && parentPlace.accommodationId) setAccommodationId(parentPlace.accommodationId);
    if (parentPlace.latitude != null && parentPlace.longitude != null && latitude == null && longitude == null) {
      setFocus({ lat: parentPlace.latitude, lng: parentPlace.longitude });
    }
  }, [isArea, latitude, longitude, parentPlace, parentPlaceId, showLodgingSection]);

  const relatedPlaces = useMemo(() => {
    if (accommodationId) {
      return places.filter(
        (row) => canLinkAccommodation(row.placeType) && row.accommodationId === accommodationId && row.id !== placeId,
      );
    }
    if (parentPlaceId) {
      return places.filter(
        (row) => (row.id === parentPlaceId || row.parentPlaceId === parentPlaceId) && row.id !== placeId,
      );
    }
    return [];
  }, [accommodationId, parentPlaceId, placeId, places]);

  const catalogSearchResults = useMemo(() => {
    const matches = searchCatalogPlaces(places, searchQuery, placeId);
    if (searchQuery.trim()) return matches.slice(0, 20);
    if (latitude != null && longitude != null) {
      return [...matches]
        .filter((row) => row.latitude != null && row.longitude != null)
        .sort((left, right) => {
          const leftDistance = distanceM(
            { lat: latitude, lng: longitude },
            { lat: left.latitude as number, lng: left.longitude as number },
          );
          const rightDistance = distanceM(
            { lat: latitude, lng: longitude },
            { lat: right.latitude as number, lng: right.longitude as number },
          );
          return leftDistance - rightDistance;
        })
        .slice(0, 12);
    }
    return matches.slice(0, 12);
  }, [latitude, longitude, placeId, places, searchQuery]);

  const catalogMapPlaces = useMemo(
    () => catalogSearchResults.filter((row) => row.latitude != null && row.longitude != null),
    [catalogSearchResults],
  );
  const parentLocksAccommodation = Boolean(parentPlace?.accommodationId);
  const accommodationSearchResults = useMemo(
    () => searchAccommodations(accommodations, accommodationQuery),
    [accommodationQuery, accommodations],
  );

  const regionPath = [country, regions.find((row) => row.id === regionId)?.name, parentPlace?.name]
    .filter(Boolean)
    .join(' / ');

  const judgmentError = (() => {
    if (radiusInput.trim() && visitRadiusM == null) return '판정 반경은 1 이상의 정수(m)여야 합니다.';
    if (visitRadiusM != null && (visitRadiusM < 1 || visitRadiusM > 100000)) return '판정 반경은 1~100000m 사이여야 합니다.';
    if (isStayJudgment && stayMinutesInput.trim() && visitMinStayMinutes == null) {
      return '최소 체류시간은 1 이상의 정수(분)여야 합니다.';
    }
    if (isStayJudgment && visitMinStayMinutes != null && (visitMinStayMinutes < 1 || visitMinStayMinutes > 10080)) {
      return '최소 체류시간은 1~10080분 사이여야 합니다.';
    }
    return null;
  })();

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
  const otherTypeError = isOther && !otherTypeLabel.trim() ? '기타 유형 이름을 입력하세요.' : null;
  const canSave = Boolean(name.trim()) && !coordPairError && !judgmentError && !otherTypeError;

  const applyCoords = (
    lat: number,
    lng: number,
    source: 'map' | 'input' | 'paste' | 'visit',
    options?: { zoom?: number },
  ) => {
    setLatInput(String(lat));
    setLngInput(String(lng));
    setCoordSource(source);
    setFocus({ lat, lng, zoom: options?.zoom, at: Date.now() });
  };

  const applyBusinessName = (nextName: string): boolean => {
    const current = name.trim();
    if (current && current !== nextName && !window.confirm(`장소명을 "${nextName}"(으)로 바꿀까요?`)) {
      return false;
    }
    setName(nextName);
    return true;
  };

  const lookupNearbyPlaces = async (lat: number, lng: number, kind = nearbyPlaceKind(placeType)) => {
    setNearbyLoading(true);
    setNearbyError(null);
    const result = await nearbyGooglePlaceNames({ lat, lng, kind });
    setNearbyLoading(false);
    if (!result.ok) {
      setNearbyPlaces([]);
      setNearbyError(result.error === 'unavailable' ? '미연동' : '자료 없음');
      return;
    }
    setNearbyPlaces(result.places);
  };

  const applyPlaceCandidate = (row: { name: string | null; lat: number; lng: number }) => {
    if (row.name && !applyBusinessName(row.name)) return;
    applyCoords(row.lat, row.lng, 'map', { zoom: PLACE_FOCUS_ZOOM });
  };

  const applyExistingCatalogPlace = (row: CatalogPlaceRow) => {
    if (row.latitude == null || row.longitude == null) return;
    if (!isArea && !blockedParentIds.has(row.id)) {
      setParentPlaceId(row.id);
    } else {
      if (row.country) setCountry(row.country);
      if (row.regionId) setRegionId(row.regionId);
    }
    applyCoords(row.latitude, row.longitude, 'map', { zoom: PLACE_FOCUS_ZOOM });
  };

  const changeLookupMode = (next: LocationLookupMode) => {
    setLookupMode(next);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const handleNearbyPlaces = async () => {
    if (latitude == null || longitude == null) return;
    await lookupNearbyPlaces(latitude, longitude);
  };

  const handleMapPoi = async (placeId: string, lat: number, lng: number) => {
    applyCoords(lat, lng, 'map');
    const result = await getGooglePlaceById(placeId);
    if (result.ok) {
      applyPlaceCandidate(result.place);
      setNearbyPlaces((current) => uniqueKeepFirst(result.place, current));
      setNearbyError(null);
      return;
    }
    await lookupNearbyPlaces(lat, lng);
  };

  const applyVisitDraft = (visit: GuidePlaceVisitRow) => {
    const draft = visitToPlaceDraft(visit);
    setSelectedVisitId(visit.id);
    applyCoords(draft.latitude, draft.longitude, 'visit', { zoom: PLACE_FOCUS_ZOOM });
    setVisitJudgmentType(draft.visitJudgmentType);
    setRadiusInput(String(draft.visitRadiusM));
    setStayMinutesInput(draft.visitMinStayMinutes != null ? String(draft.visitMinStayMinutes) : '');
    setPlaceType(draft.placeType);
    if (draft.placeType !== 'OTHER') setOtherTypeLabel('');
    if (draft.placeType === 'AREA') setParentPlaceId('');
    if (!canLinkAccommodation(draft.placeType)) setAccommodationId('');
    if (draft.name && !name.trim() && !looksLikeAdminName(draft.name)) setName(draft.name);
    void lookupNearbyPlaces(draft.latitude, draft.longitude, nearbyPlaceKind(draft.placeType));
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSearchError(null);
    setSearchResults([]);
    const bias = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;
    const places = await findGooglePlaceNames({ query, bias });
    if (places.ok) {
      setSearchResults(
        places.places.map((row) => ({
          label: row.address ? `${row.name} · ${row.address}` : row.name,
          name: row.name,
          lat: row.lat,
          lng: row.lng,
        })),
      );
      return;
    }

    if (typeof google === 'undefined' || !google.maps?.Geocoder) {
      setSearchError(places.error === 'unavailable' ? '미연동' : '자료 없음');
      return;
    }
    const geocoder = new google.maps.Geocoder();
    void geocoder.geocode({ address: query }, (results, statusCode) => {
      if (statusCode !== 'OK' || !results?.length) {
        setSearchResults([]);
        setSearchError(places.error === 'unavailable' ? '미연동' : '자료 없음');
        return;
      }
      setSearchResults(
        results.slice(0, 5).map((row) => ({
          label: row.formatted_address,
          name: null,
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
    setNearbyPlaces([]);
    setNearbyError(null);
    setFormError(null);
    setVisitJudgmentType(defaultVisitJudgmentType(placeType));
    if (placeType !== 'OTHER') setOtherTypeLabel('');
    setRadiusInput(String(DEFAULT_VISIT_RADIUS_M));
    setStayMinutesInput(String(DEFAULT_VISIT_MIN_STAY_MINUTES));
  };

  const buildInput = () => ({
    name: name.trim(),
    placeType,
    otherTypeLabel: isOther ? otherTypeLabel.trim() || null : null,
    country: country.trim() || '몽골',
    regionId: regionId || null,
    parentPlaceId: isArea ? null : parentPlaceId || null,
    latitude,
    longitude,
    displayName: displayName.trim() || null,
    accommodationId: canLinkAccommodation(placeType) ? accommodationId || null : null,
    visitJudgmentType,
    visitRadiusM,
    visitMinStayMinutes: isStayJudgment ? visitMinStayMinutes : null,
    status,
  });

  const handleSave = async (continueCreating: boolean) => {
    if (!canSave) {
      setFormError(coordPairError ?? judgmentError ?? otherTypeError ?? '장소명을 입력하세요.');
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
        otherTypeLabel !== (editingPlace.otherTypeLabel ?? '') ||
        status !== editingPlace.status ||
        parentPlaceId !== (editingPlace.parentPlaceId ?? '') ||
        country !== editingPlace.country ||
        regionId !== (editingPlace.regionId ?? '') ||
        accommodationId !== (editingPlace.accommodationId ?? '') ||
        latInput !== formatCoord(editingPlace.latitude) ||
        lngInput !== formatCoord(editingPlace.longitude) ||
        visitJudgmentType !== (editingPlace.visitJudgmentType ?? defaultVisitJudgmentType(editingPlace.placeType)) ||
        radiusInput !== (editingPlace.visitRadiusM != null ? String(editingPlace.visitRadiusM) : '') ||
        stayMinutesInput !== (editingPlace.visitMinStayMinutes != null ? String(editingPlace.visitMinStayMinutes) : '');
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
                  : placeType === 'RESTAURANT'
                    ? '숙소에 딸린 식당을 등록하고, 같은 숙소 원본에 연결합니다.'
                    : '목적지나 다른 장소 아래의 지점을 등록합니다. 숙소 원본은 숙소·식당 유형에서만 연결합니다.'}
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
                n={sectionN.basic}
                title="기본정보"
                extra={<span className="text-xs text-[#9A93C2]">{isEdit && editingPlace ? `ID ${editingPlace.code}` : 'ID는 저장 시 생성'}</span>}
              >
                <DatasetField label="장소명">
                  <div className="flex gap-2">
                    <Input
                      className={`${datasetControlClass} min-w-0 flex-1`}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={isRestaurant ? '예: A캠프 식당' : '예: A캠프 추가 픽업 지점'}
                    />
                    <DatasetButton
                      type="button"
                      variant="outline"
                      disabled={latitude == null || longitude == null || nearbyLoading}
                      onClick={() => void handleNearbyPlaces()}
                    >
                      {nearbyLoading ? '찾는 중…' : '근처 상호 찾기'}
                    </DatasetButton>
                  </div>
                </DatasetField>
                {nearbyError ? <p className="text-xs text-amber-600">{nearbyError}</p> : null}
                <NearbyPlaceButtons places={nearbyPlaces} onPick={applyPlaceCandidate} />
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
                        setVisitJudgmentType(defaultVisitJudgmentType(next));
                        if (next !== 'OTHER') setOtherTypeLabel('');
                        if (next === 'AREA') setParentPlaceId('');
                        if (!canLinkAccommodation(next)) setAccommodationId('');
                      }}
                    >
                      {typeOptions.map((value) => (
                        <option key={value} value={value}>
                          {PLACE_TYPE_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </DatasetField>
                  {isOther ? (
                    <DatasetField label="기타 유형">
                      <Input
                        className={datasetControlClass}
                        value={otherTypeLabel}
                        onChange={(event) => setOtherTypeLabel(event.target.value)}
                        placeholder="예: 약국, 은행"
                      />
                      {otherTypeError ? <p className="mt-1 text-xs text-rose-600">{otherTypeError}</p> : null}
                    </DatasetField>
                  ) : null}
                  <DatasetField label="사용 상태">
                    <select className={datasetControlClass} value={status} onChange={(event) => setStatus(event.target.value as CatalogUsageStatus)}>
                      <option value="ACTIVE">사용 중</option>
                      <option value="INACTIVE">사용 안 함</option>
                    </select>
                  </DatasetField>
                </div>
              </Section>

              <Section n={sectionN.parent} title={isArea ? '분류' : '상위 장소'}>
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

              {showLodgingSection ? (
                <>
              <Section n={sectionN.lodging} title="연결 숙소">
                  {parentLocksAccommodation ? (
                    <p className="text-xs text-[#8B83B8]">상위 장소의 숙소 연결을 따릅니다.</p>
                  ) : (
                    <>
                      <Input
                        className={datasetControlClass}
                        value={accommodationQuery}
                        onChange={(event) => setAccommodationQuery(event.target.value)}
                        placeholder="숙소명 · 목적지 · 지역"
                      />
                      {accommodationQuery.trim() ? (
                        accommodationSearchResults.length === 0 ? (
                          <p className="text-xs text-[#8B83B8]">일치하는 숙소가 없습니다.</p>
                        ) : (
                          <ul className="grid max-h-48 gap-1 overflow-auto">
                            {accommodationSearchResults.map((row) => {
                              const selected = row.id === accommodationId;
                              return (
                                <li key={row.id}>
                                  <button
                                    type="button"
                                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs hover:bg-[#F8F6FF] ${
                                      selected ? 'border-[#5B4BD6] bg-[#F8F6FF]' : 'border-slate-100'
                                    }`}
                                    onClick={() => {
                                      setAccommodationId(row.id);
                                      setAccommodationQuery('');
                                    }}
                                  >
                                    {row.name}
                                    <span className="mt-0.5 block text-[#9A93C2]">
                                      {[row.destination, row.region].filter(Boolean).join(' · ') || '지역 미등록'}
                                      {selected ? ' · 선택됨' : ' · 이 숙소 사용'}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )
                      ) : (
                        <p className="text-xs text-[#8B83B8]">숙소명으로 검색하세요. 어기·우기처럼 한글 별칭도 찾습니다.</p>
                      )}
                    </>
                  )}
                  {accommodation ? (
                    <div className="rounded-xl border border-slate-100 bg-[#F8F6FF] px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link className={`text-sm font-semibold ${datasetTheme.link}`} to={`/accommodations/${accommodation.id}`}>
                          {accommodation.name}
                        </Link>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-[#8B83B8]">{firstRoom?.level ?? '등급 미등록'}</span>
                          {parentLocksAccommodation ? null : (
                            <button
                              type="button"
                              className="text-xs font-medium text-[#5B4BD6] hover:underline"
                              onClick={() => {
                                setAccommodationId('');
                                setAccommodationQuery('');
                              }}
                            >
                              연결 해제
                            </button>
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#9A93C2]">
                        {accommodation.id} · {accommodation.destination} · {accommodation.region}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {parentLocksAccommodation
                        ? '상위 장소의 숙소 연결을 따릅니다.'
                        : isRestaurant
                          ? '이 식당이 속한 숙소 원본을 고릅니다. 새 숙소는 여기서 만들지 않습니다.'
                          : '객실·요금 원본인 기존 숙소를 선택합니다. 새 숙소는 여기서 만들지 않습니다.'}
                    </p>
                  )}
                  {isRestaurant ? (
                    <p className="text-xs text-[#8B83B8]">식당은 숙소 원본에만 연결합니다. 객실·요금은 숙소 장소를 따릅니다.</p>
                  ) : (
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
                  )}
                  <p className="text-sm font-medium text-slate-800">{rateLabel}</p>
                  <p className="text-xs text-[#8B83B8]">
                    {parentPlace?.accommodationId
                      ? '상위 장소의 숙소 연결을 따릅니다. 좌표는 복사하지 않습니다.'
                      : '등급·요금은 숙소 원본을 참조합니다. 조회 조건 변경은 요금 수정이 아닙니다.'}
                  </p>
                </Section>

              {!accommodationId ? null : (
                <Section
                  n={sectionN.related}
                  title={`이 숙소에 연결된 기존 장소 ${relatedPlaces.length}개`}
                  extra={
                    <span className="flex items-center gap-3">
                      {accommodationId ? (
                        <Link
                          className={`text-xs font-medium ${datasetTheme.link}`}
                          to={`/dataset/places/new?type=RESTAURANT&accommodationId=${encodeURIComponent(accommodationId)}${
                            parentPlaceId || placeId ? `&parentId=${encodeURIComponent(parentPlaceId || placeId || '')}` : ''
                          }`}
                        >
                          식당 추가
                        </Link>
                      ) : null}
                      <Link className={`text-xs font-medium ${datasetTheme.link}`} to={`/dataset/places`}>
                        전체 보기
                      </Link>
                    </span>
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
                            <p className="text-xs text-[#9A93C2]">{catalogPlaceTypeLabel(row.placeType, row.otherTypeLabel)}</p>
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
                n={sectionN.location}
                title="위치 지정"
                extra={
                  <span className="text-xs text-[#9A93C2]">
                    {latitude != null && longitude != null ? '좌표 등록됨' : '좌표 미등록'}
                  </span>
                }
              >
                <DatasetTabs
                  items={LOCATION_LOOKUP_TABS}
                  activeId={lookupMode}
                  onChange={(id) => changeLookupMode(id as LocationLookupMode)}
                  size="sm"
                />
                {lookupMode === 'visit' ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <DatasetField label="참여자">
                        <select
                          className={datasetControlClass}
                          value={visitGuideId}
                          onChange={(event) => {
                            setVisitGuideId(event.target.value);
                            setSelectedVisitId(null);
                          }}
                        >
                          <option value="">전체 보기</option>
                          {visitPeople.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.nameKo}
                              {row.nameMn ? ` · ${row.nameMn}` : ''}
                            </option>
                          ))}
                        </select>
                      </DatasetField>
                      <DatasetField label="방문 날짜">
                        <Input
                          className={datasetControlClass}
                          type="date"
                          value={visitDate}
                          onChange={(event) => {
                            const nextDate = event.target.value;
                            setVisitDate(nextDate);
                            if (nextDate) setVisitProjectId('');
                            setSelectedVisitId(null);
                          }}
                        />
                      </DatasetField>
                      <DatasetField label="프로젝트">
                        <select
                          className={datasetControlClass}
                          value={visitProjectId}
                          onChange={(event) => {
                            setVisitProjectId(event.target.value);
                            setSelectedVisitId(null);
                          }}
                        >
                          <option value="">{visitDate ? '해당일 전체' : '전체 프로젝트'}</option>
                          {visitProjectOptions.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name}
                            </option>
                          ))}
                        </select>
                      </DatasetField>
                    </div>
                    {visitError ? (
                      <p className="text-xs text-amber-600">{visitError}</p>
                    ) : !visitDate && !visitProjectId && !visitGuideId ? (
                      <p className="text-xs text-[#8B83B8]">날짜나 프로젝트를 고르면 가이드·현장 참여자 방문 핀을 겹칩니다.</p>
                    ) : (
                      <p className="text-xs text-[#8B83B8]">
                        {visitLoading
                          ? '현장 방문을 불러오는 중…'
                          : `주황 핀 ${placeVisits.length}개 · 누르면 좌표·판정 초안을 채웁니다.`}
                      </p>
                    )}
                  </>
                ) : null}
                {lookupMode === 'google' ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        className={datasetControlClass}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="장소명 · 주소 · 좌표로 검색"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSearch();
                          }
                        }}
                      />
                      <DatasetButton type="button" variant="outline" onClick={() => void handleSearch()}>
                        검색
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
                              onClick={() => applyPlaceCandidate(row)}
                            >
                              {row.label}
                              <span className="mt-0.5 block text-[#9A93C2]">
                                {row.name ? '상호 · 이 위치 사용' : '이 위치 사용'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : null}
                {lookupMode === 'catalog' ? (
                  <>
                    <Input
                      className={datasetControlClass}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="등록된 장소명 또는 ID"
                    />
                    {catalogSearchResults.length === 0 ? (
                      <p className="text-xs text-[#8B83B8]">
                        {searchQuery.trim() ? '일치하는 기존 장소가 없습니다.' : '등록된 장소가 없습니다.'}
                      </p>
                    ) : (
                      <ul className="grid max-h-48 gap-1 overflow-auto">
                        {catalogSearchResults.map((row) => {
                          const hasCoords = row.latitude != null && row.longitude != null;
                          return (
                            <li key={row.id}>
                              <button
                                type="button"
                                className="w-full rounded-lg border border-slate-100 px-3 py-2 text-left text-xs hover:bg-[#F8F6FF] disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={!hasCoords}
                                onClick={() => applyExistingCatalogPlace(row)}
                              >
                                {row.name} · {row.code} · {catalogPlaceTypeLabel(row.placeType, row.otherTypeLabel)}
                                <span className="mt-0.5 block text-[#9A93C2]">
                                  {[row.region?.name, row.parentPlace?.name].filter(Boolean).join(' / ') || row.country}
                                  {hasCoords ? ' · 이 위치 사용' : ' · 좌표 없음'}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : null}
                <div className="relative h-[280px] overflow-hidden rounded-xl border border-slate-100">
                  {latitude == null && longitude == null ? (
                    <div className="pointer-events-none absolute left-4 right-20 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm">
                      새 지점의 위치를 지정해 주세요. 상위 좌표는 복사되지 않습니다.
                    </div>
                  ) : null}
                  <DatasetPlaceFormMap
                    relatedPlaces={lookupMode === 'catalog' ? [] : relatedPlaces}
                    existingPlaces={lookupMode === 'catalog' ? catalogMapPlaces : []}
                    latitude={latitude}
                    longitude={longitude}
                    focus={focus}
                    visitRadiusM={visitRadiusM}
                    visits={lookupMode === 'visit' ? placeVisits : []}
                    selectedVisitId={selectedVisitId}
                    clickableIcons={lookupMode === 'google'}
                    onPick={(lat, lng) => {
                      applyCoords(lat, lng, 'map');
                      void lookupNearbyPlaces(lat, lng);
                    }}
                    onPickPoi={(placeId, lat, lng) => void handleMapPoi(placeId, lat, lng)}
                    onSelectVisit={applyVisitDraft}
                    onSelectExisting={applyExistingCatalogPlace}
                  />
                  {nearbyLoading ? <p className="text-xs text-[#8B83B8]">근처 상호를 찾는 중…</p> : null}
                  <NearbyPlaceButtons places={nearbyPlaces} onPick={applyPlaceCandidate} />
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
                        void lookupNearbyPlaces(parsed.lat, parsed.lng);
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
                  <span>
                    입력 출처 ·{' '}
                    {coordSource === 'map'
                      ? '지도 지정'
                      : coordSource === 'paste'
                        ? '붙여넣기'
                        : coordSource === 'input'
                          ? '직접 입력'
                          : coordSource === 'visit'
                            ? '현장 방문'
                            : '미지정'}
                  </span>
                </div>
              </Section>

              <Section
                n={sectionN.judgment}
                title="방문 판정"
                extra={<span className="text-xs text-[#9A93C2]">좌표와 별도 저장</span>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <DatasetField label="판정 유형">
                    <select
                      className={datasetControlClass}
                      value={visitJudgmentType}
                      onChange={(event) => setVisitJudgmentType(event.target.value as CatalogVisitJudgmentType)}
                    >
                      <option value="STAY">{VISIT_JUDGMENT_TYPE_LABEL.STAY}</option>
                      <option value="PASS">{VISIT_JUDGMENT_TYPE_LABEL.PASS}</option>
                    </select>
                  </DatasetField>
                  <DatasetField label="판정 반경 (m)">
                    <Input
                      className={datasetControlClass}
                      value={radiusInput}
                      onChange={(event) => setRadiusInput(event.target.value)}
                      placeholder="예: 50"
                      inputMode="numeric"
                    />
                  </DatasetField>
                </div>
                <DatasetField label="최소 체류시간 (분)">
                  <Input
                    className={datasetControlClass}
                    value={stayMinutesInput}
                    onChange={(event) => setStayMinutesInput(event.target.value)}
                    placeholder={isStayJudgment ? '예: 3' : '통과형에는 적용하지 않습니다'}
                    inputMode="numeric"
                    disabled={!isStayJudgment}
                  />
                </DatasetField>
                {judgmentError ? <p className="text-xs text-rose-600">{judgmentError}</p> : null}
                <p className="text-xs text-[#8B83B8]">
                  {isStayJudgment
                    ? '체류형은 반경 안에서 머문 시간을 봅니다. 입력값은 이 장소에만 저장하며, 판정 엔진은 아직 연결하지 않았습니다.'
                    : '통과형은 진입·이탈 흐름을 봅니다. 체류시간은 입력해도 이 유형에서는 저장·판정에 쓰지 않습니다.'}
                </p>
                {latitude == null || longitude == null ? (
                  <p className="text-xs text-amber-700">좌표가 없으면 반경을 저장할 수는 있지만, 상위 좌표나 0,0으로 대신 판정하지 않습니다.</p>
                ) : null}
              </Section>

              <Section n={sectionN.confirm} title="저장 전 확인">
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">장소명 · 유형</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {name.trim() || '미입력'} · {catalogPlaceTypeLabel(placeType, otherTypeLabel)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">상위 관계</dt>
                    <dd className="text-right text-slate-800">
                      {isArea ? '없음 · 목적지' : parentPlace ? `${parentPlace.name} · ${parentPlace.code}` : '없음'}
                    </dd>
                  </div>
                  {showLodgingSection ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">숙소 원본</dt>
                      <dd className="text-right text-slate-800">
                        {accommodation
                          ? isRestaurant
                            ? `${accommodation.name} · 식당`
                            : `${accommodation.name} · ${LODGING_ROLES.find((row) => row.id === lodgingRole)?.label}`
                          : '연결 안 함'}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">좌표</dt>
                    <dd className="text-right text-slate-800">{latitude != null && longitude != null ? '지정 가능' : '미등록 · 저장 가능'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">방문 판정</dt>
                    <dd className="text-right text-slate-800">
                      {VISIT_JUDGMENT_TYPE_LABEL[visitJudgmentType]}
                      {visitRadiusM != null ? ` · ${visitRadiusM}m` : ' · 반경 미입력'}
                      {isStayJudgment
                        ? visitMinStayMinutes != null
                          ? ` · ${visitMinStayMinutes}분`
                          : ' · 체류시간 미입력'
                        : ' · 체류 미적용'}
                    </dd>
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
                  : isRestaurant
                    ? '새 식당 장소 1개 등록 · 숙소 원본에 연결합니다.'
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
