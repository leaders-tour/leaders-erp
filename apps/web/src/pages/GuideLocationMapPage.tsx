import { Button, Card } from '@tour/ui';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GuideMapPathsLayer } from '../features/guide/GuideMapPathsLayer';
import {
  buildGuideMarkerIcon,
  collectMapBounds,
  formatGuideLocationMapDateLabel,
  getGuidePathColor,
  getTodayInUlaanbaatarDateInputValue,
  normalizeGuideMapPath,
} from '../features/guide/guide-location-map-utils';
import {
  useGuideLiveLocations,
  useLeaderstepsActiveProjects,
  type GuideLiveLocationRow,
} from '../features/guide/hooks';
import { GOOGLE_MAPS_API_KEY } from '../lib/google-maps-api-key';

const DEFAULT_MAP_CENTER = { lat: 47.9189, lng: 106.9176 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '680px' };
const ULAANBAATAR_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Ulaanbaatar',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatRecordedAt(value: string): string {
  return ULAANBAATAR_TIME_FORMATTER.format(new Date(value));
}

function fitMapToLocations(map: google.maps.Map, locations: GuideLiveLocationRow[]): void {
  const bounds = collectMapBounds(locations);
  if (!bounds) {
    map.setCenter(DEFAULT_MAP_CENTER);
    map.setZoom(11);
    return;
  }
  map.fitBounds(bounds, 48);
}

function GuideGoogleMap({
  locations,
  focusedGuideId,
  onFocusGuide,
}: {
  locations: GuideLiveLocationRow[];
  focusedGuideId: string | null;
  onFocusGuide: (guideId: string) => void;
}): JSX.Element {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindowGuideId, setInfoWindowGuideId] = useState<string | null>(null);
  const locationColorByGuideId = useMemo(
    () =>
      new Map(
        locations.map((location, index) => [location.guideId, getGuidePathColor(index)] as const),
      ),
    [locations],
  );
  const pathsByGuideId = useMemo(
    () =>
      new Map(
        locations.map((location) => [
          location.guideId,
          normalizeGuideMapPath(location.path),
        ] as const),
      ),
    [locations],
  );
  const pathLayers = useMemo(
    () =>
      locations.map((location) => ({
        guideId: location.guideId,
        path: pathsByGuideId.get(location.guideId) ?? [],
        color: locationColorByGuideId.get(location.guideId) ?? '#4f46e5',
        focused: focusedGuideId === location.guideId,
      })),
    [locations, pathsByGuideId, locationColorByGuideId, focusedGuideId],
  );
  const focusedLocation =
    locations.find((location) => location.guideId === focusedGuideId) ?? null;
  const infoWindowLocation =
    locations.find((location) => location.guideId === infoWindowGuideId) ?? null;

  const handleMapLoad = useCallback((loadedMap: google.maps.Map) => {
    mapRef.current = loadedMap;
    setMap(loadedMap);
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    fitMapToLocations(mapRef.current, locations);
  }, [locations]);

  useEffect(() => {
    if (!mapRef.current || !focusedLocation) {
      return;
    }
    mapRef.current.panTo({
      lat: focusedLocation.latestLatitude,
      lng: focusedLocation.latestLongitude,
    });
    const zoom = mapRef.current.getZoom() ?? 11;
    if (zoom < 15) {
      mapRef.current.setZoom(15);
    }
    setInfoWindowGuideId(focusedLocation.guideId);
  }, [focusedLocation]);

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={DEFAULT_MAP_CENTER}
      zoom={11}
      options={{
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      }}
      onLoad={handleMapLoad}
    >
      <GuideMapPathsLayer map={map} layers={pathLayers} />
      {locations.map((location) => {
        const color = locationColorByGuideId.get(location.guideId) ?? '#4f46e5';
        const focused = focusedGuideId === location.guideId;
        return (
          <MarkerF
            key={`marker-${location.guideId}`}
            position={{ lat: location.latestLatitude, lng: location.latestLongitude }}
            icon={buildGuideMarkerIcon(location.profileImageUrl, location.guideNameKo, color, focused)}
            zIndex={focused ? 1000 : 100}
            onClick={() => {
              onFocusGuide(location.guideId);
              setInfoWindowGuideId(location.guideId);
            }}
          />
        );
      })}
      {infoWindowLocation ? (
        <InfoWindowF
          position={{
            lat: infoWindowLocation.latestLatitude,
            lng: infoWindowLocation.latestLongitude,
          }}
          onCloseClick={() => setInfoWindowGuideId(null)}
        >
          <div className="min-w-48 text-sm text-slate-800">
            <strong>{infoWindowLocation.guideNameKo}</strong>
            {infoWindowLocation.guideNameMn ? ` · ${infoWindowLocation.guideNameMn}` : ''}
            <br />
            최근 기록: {formatRecordedAt(infoWindowLocation.latestRecordedAt)}
            <br />
            정확도: 약 {Math.round(infoWindowLocation.latestAccuracy)}m
            <br />
            경로 포인트: {infoWindowLocation.path.length}개
          </div>
        </InfoWindowF>
      ) : null}
    </GoogleMap>
  );
}

export function GuideLocationMapPage(): JSX.Element {
  const [selectedDate, setSelectedDate] = useState(getTodayInUlaanbaatarDateInputValue);
  const [projectId, setProjectId] = useState('');
  const [personId, setPersonId] = useState('');
  const [focusedGuideId, setFocusedGuideId] = useState<string | null>(null);
  const [mapsAuthFailure, setMapsAuthFailure] = useState(false);
  const selectedDateLabel = useMemo(
    () => formatGuideLocationMapDateLabel(selectedDate),
    [selectedDate],
  );
  const { projects, loading: projectsLoading } = useLeaderstepsActiveProjects(selectedDate);
  const {
    locations: allLocations,
    loading: locationsLoading,
    refreshing,
    errorMessage,
    refetch,
  } = useGuideLiveLocations({
    projectId: projectId || undefined,
    date: selectedDate,
  });
  const locations = useMemo(
    () =>
      personId ? allLocations.filter((location) => location.guideId === personId) : allLocations,
    [allLocations, personId],
  );
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'guide-location-map-ko',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    language: 'ko',
    region: 'KR',
  });
  const personFilterOptions = useMemo(
    () =>
      [...allLocations].sort((left, right) =>
        left.guideNameKo.localeCompare(right.guideNameKo, 'ko'),
      ),
    [allLocations],
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      return;
    }

    window.gm_authFailure = () => {
      setMapsAuthFailure(true);
    };

    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  useEffect(() => {
    if (personId && !allLocations.some((location) => location.guideId === personId)) {
      setPersonId('');
    }
  }, [personId, allLocations]);

  useEffect(() => {
    if (focusedGuideId && !locations.some((location) => location.guideId === focusedGuideId)) {
      setFocusedGuideId(null);
    }
  }, [focusedGuideId, locations]);

  return (
    <section className="grid gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">가이드 위치</h1>
          <p className="mt-1 text-sm text-slate-600">
            선택한 날짜(울란바토르)에 진행 중인 Leadersteps 프로젝트의 GPS 경로와 참여자의 최근
            위치를 표시합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            {selectedDateLabel} 프로젝트 {projects.length}개
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            위치 확인 {allLocations.length}명
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
            1분마다 자동 갱신
          </span>
        </div>
      </header>

      <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1fr)_minmax(240px,1fr)_auto] md:items-end">
        <div>
          <label htmlFor="guide-location-date" className="mb-2 block text-sm font-medium text-slate-700">
            기준일
          </label>
          <input
            id="guide-location-date"
            type="date"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setProjectId('');
              setPersonId('');
              setFocusedGuideId(null);
            }}
          />
          <p className="mt-1 text-xs text-slate-500">울란바토르 시간 기준</p>
        </div>
        <div>
          <label htmlFor="guide-location-project" className="mb-2 block text-sm font-medium text-slate-700">
            프로젝트
          </label>
          <select
            id="guide-location-project"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
            value={projectId}
            disabled={projectsLoading}
            onChange={(event) => {
              setProjectId(event.target.value);
              setFocusedGuideId(null);
            }}
          >
            <option value="">해당일 활성 프로젝트 전체</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="guide-location-person" className="mb-2 block text-sm font-medium text-slate-700">
            참여자
          </label>
          <select
            id="guide-location-person"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
            value={personId}
            disabled={locationsLoading}
            onChange={(event) => {
              setPersonId(event.target.value);
              setFocusedGuideId(null);
            }}
          >
            <option value="">전체 참여자</option>
            {personFilterOptions.map((location) => (
              <option key={location.guideId} value={location.guideId}>
                {location.guideNameKo}
                {location.guideNameMn ? ` · ${location.guideNameMn}` : ''}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={locationsLoading || refreshing}
          onClick={() => void refetch()}
        >
          {refreshing ? '갱신 중...' : '새로고침'}
        </Button>
      </Card>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!GOOGLE_MAPS_API_KEY ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Google Maps API 키가 필요합니다. <code className="font-mono">apps/web/.env</code>에{' '}
          <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code>를 추가해 주세요.
        </div>
      ) : null}

      {loadError || mapsAuthFailure ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Google Maps를 불러오지 못했습니다. API 키와 Maps JavaScript API 설정을 확인해 주세요.
          {mapsAuthFailure ? (
            <>
              <br />
              Google Cloud Console에서 이 사이트 도메인(
              <code className="font-mono">{window.location.origin}</code>)을 Maps API 키 HTTP referrer
              허용 목록에 추가해야 합니다.
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="relative min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm">
          {locationsLoading || !GOOGLE_MAPS_API_KEY || !isLoaded || mapsAuthFailure ? (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/75 text-sm text-slate-500 backdrop-blur-sm">
              {!GOOGLE_MAPS_API_KEY
                ? 'Google Maps API 키를 설정해 주세요.'
                : loadError || mapsAuthFailure
                  ? 'Google Maps를 불러오지 못했습니다.'
                  : '지도를 불러오는 중...'}
            </div>
          ) : null}
          {GOOGLE_MAPS_API_KEY && isLoaded && !mapsAuthFailure ? (
            <GuideGoogleMap
              locations={locations}
              focusedGuideId={focusedGuideId}
              onFocusGuide={setFocusedGuideId}
            />
          ) : (
            <div className="min-h-[680px] w-full bg-slate-100" />
          )}
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">위치 목록</h2>
              <p className="mt-1 text-xs text-slate-500">프로젝트 전체 기간 경로 · 울란바토르 시간</p>
            </div>
            <span className="text-xs text-slate-500">{locations.length}명</span>
          </div>
          <div className="mt-4 grid max-h-[600px] gap-2 overflow-y-auto pr-1">
            {!locationsLoading && locations.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                {selectedDateLabel} 활성 프로젝트에 기록된 위치가 없습니다.
              </div>
            ) : (
              locations.map((location, index) => {
                const focused = focusedGuideId === location.guideId;
                const color = getGuidePathColor(index);
                return (
                  <button
                    key={location.guideId}
                    type="button"
                    aria-pressed={focused}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      focused
                        ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                    onClick={() => setFocusedGuideId(location.guideId)}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-slate-900">
                        {location.guideNameKo}
                        {location.guideNameMn ? ` · ${location.guideNameMn}` : ''}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatRecordedAt(location.latestRecordedAt)} · 정확도 약{' '}
                      {Math.round(location.latestAccuracy)}m · 경로 {location.path.length}포인트
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
