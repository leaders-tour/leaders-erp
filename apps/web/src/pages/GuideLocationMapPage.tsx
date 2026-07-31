import { Button, Card } from '@tour/ui';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GuideMapPathsLayer } from '../features/guide/GuideMapPathsLayer';
import {
  applyGuidePathTimeFilter,
  buildGuideMarkerIcon,
  buildGuidePathDayOptions,
  buildLocationProjectLabels,
  buildPlaceVisitMarkerIcon,
  collectMapBounds,
  filterPlaceVisitsByTimeRange,
  formatGuideLocationMapDateLabel,
  formatGuidePathTimeRangeLabel,
  formatPlaceVisitPinTypeLabel,
  formatVisitDuration,
  getGuidePathColor,
  getTodayInUlaanbaatarDateInputValue,
  normalizeGuideMapPath,
  type GuideProjectDayOption,
} from '../features/guide/guide-location-map-utils';
import {
  useGuideLiveLocations,
  useGuidePlaceVisits,
  useLeaderstepsActiveProjects,
  type GuideLiveLocationRow,
  type GuidePlaceVisitRow,
  type LeaderstepsActiveProjectRow,
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

function fitMapToLocations(map: google.maps.Map, locations: GuideLiveLocationRow[]): boolean {
  const bounds = collectMapBounds(locations);
  if (!bounds) {
    return false;
  }
  map.fitBounds(bounds, 48);
  return true;
}

function GuideFocusedPathFilters({
  dayOptions,
  focusedDayDate,
  filteredPathPointCount,
  filteredPlaceVisitCount,
  timeRangeMinutes,
  onDayChange,
  onTimeRangeChange,
}: {
  dayOptions: GuideProjectDayOption[];
  focusedDayDate: string | null;
  filteredPathPointCount: number;
  filteredPlaceVisitCount: number;
  timeRangeMinutes: [number, number];
  onDayChange: (dayDate: string | null) => void;
  onTimeRangeChange: (timeRangeMinutes: [number, number]) => void;
}): JSX.Element {
  const [startMinutes, endMinutes] = timeRangeMinutes;
  const selectedDay = dayOptions.find((day) => day.date === focusedDayDate) ?? null;

  return (
    <div className="mt-3 space-y-3 border-t border-indigo-200 pt-3">
      <div>
        <p className="text-xs font-medium text-indigo-900">일차</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              focusedDayDate == null
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50'
            }`}
            onClick={() => onDayChange(null)}
          >
            전체
          </button>
          {dayOptions.map((day) => {
            const selected = focusedDayDate === day.date;
            return (
              <button
                key={day.date}
                type="button"
                title={`${day.fullLabel} · GPS ${day.pointCount}포인트`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50'
                }`}
                onClick={() => onDayChange(day.date)}
              >
                {day.dayLabel}
              </button>
            );
          })}
        </div>
        <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">
          {focusedDayDate == null ? (
            <>전체 · 경로 {filteredPathPointCount}포인트 · 방문 {filteredPlaceVisitCount}곳</>
          ) : selectedDay ? (
            <>
              {selectedDay.fullLabel} · 경로 {filteredPathPointCount}포인트 · 방문{' '}
              {filteredPlaceVisitCount}곳
            </>
          ) : null}
        </p>
      </div>
      {focusedDayDate ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-indigo-900">시간 범위</p>
            <span className="text-xs text-slate-500">
              {formatGuidePathTimeRangeLabel(timeRangeMinutes)}
            </span>
          </div>
          <div className="mt-2 space-y-2">
            <input
              type="range"
              min={0}
              max={24 * 60}
              step={5}
              value={startMinutes}
              className="h-2 w-full cursor-pointer accent-indigo-600"
              onChange={(event) => {
                const nextStart = Number(event.target.value);
                onTimeRangeChange([Math.min(nextStart, endMinutes), endMinutes]);
              }}
            />
            <input
              type="range"
              min={0}
              max={24 * 60}
              step={5}
              value={endMinutes}
              className="h-2 w-full cursor-pointer accent-indigo-600"
              onChange={(event) => {
                const nextEnd = Number(event.target.value);
                onTimeRangeChange([startMinutes, Math.max(nextEnd, startMinutes)]);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GuideGoogleMap({
  locations,
  focusedGuideId,
  focusedDayDate,
  mapFitSource,
  placeVisits,
  projects,
  onFocusGuide,
}: {
  locations: GuideLiveLocationRow[];
  focusedGuideId: string | null;
  focusedDayDate: string | null;
  mapFitSource: GuideLiveLocationRow | null;
  placeVisits: GuidePlaceVisitRow[];
  projects: LeaderstepsActiveProjectRow[];
  onFocusGuide: (guideId: string | null) => void;
}): JSX.Element {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindowGuideId, setInfoWindowGuideId] = useState<string | null>(null);
  const [selectedPlaceVisitId, setSelectedPlaceVisitId] = useState<string | null>(null);
  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name] as const)),
    [projects],
  );
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
      locations.map((location) => {
        const focused = focusedGuideId === location.guideId;
        const dimmed = focusedGuideId != null && !focused;
        return {
          guideId: location.guideId,
          path: pathsByGuideId.get(location.guideId) ?? [],
          color: locationColorByGuideId.get(location.guideId) ?? '#4f46e5',
          focused,
          dimmed,
        };
      }),
    [locations, pathsByGuideId, locationColorByGuideId, focusedGuideId],
  );
  const focusedLocation =
    locations.find((location) => location.guideId === focusedGuideId) ?? null;
  const infoWindowLocation =
    locations.find((location) => location.guideId === infoWindowGuideId) ?? null;
  const selectedPlaceVisit =
    placeVisits.find((visit) => visit.id === selectedPlaceVisitId) ?? null;
  const selectedPlaceVisitPinTypeLabel = selectedPlaceVisit
    ? formatPlaceVisitPinTypeLabel(selectedPlaceVisit.pinType)
    : null;
  const hasPlaceVisitNotes = Boolean(
    selectedPlaceVisit &&
      (selectedPlaceVisitPinTypeLabel ||
        selectedPlaceVisit.description ||
        selectedPlaceVisit.photoUrls.length > 0),
  );
  const visiblePlaceVisits = focusedGuideId ? placeVisits : [];

  const handleMapLoad = useCallback((loadedMap: google.maps.Map) => {
    mapRef.current = loadedMap;
    setMap(loadedMap);
  }, []);

  useEffect(() => {
    setSelectedPlaceVisitId(null);
  }, [focusedGuideId]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    if (!focusedGuideId) {
      fitMapToLocations(mapRef.current, locations);
      return;
    }
    if (mapFitSource) {
      fitMapToLocations(mapRef.current, [mapFitSource]);
      setInfoWindowGuideId(mapFitSource.guideId);
    }
  }, [focusedGuideId, mapFitSource]);

  useEffect(() => {
    if (!mapRef.current || focusedGuideId) {
      return;
    }
    fitMapToLocations(mapRef.current, locations);
  }, [locations, focusedGuideId]);

  const handleToggleFocus = useCallback(
    (guideId: string) => {
      onFocusGuide(focusedGuideId === guideId ? null : guideId);
      if (focusedGuideId === guideId) {
        setInfoWindowGuideId(null);
        setSelectedPlaceVisitId(null);
      }
    },
    [focusedGuideId, onFocusGuide],
  );

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
      {visiblePlaceVisits.map((visit) => {
        const selected = selectedPlaceVisitId === visit.id;
        return (
          <MarkerF
            key={`place-visit-${visit.id}`}
            position={{ lat: visit.centerLatitude, lng: visit.centerLongitude }}
            icon={buildPlaceVisitMarkerIcon(selected)}
            zIndex={selected ? 900 : 50}
            onClick={() => {
              setSelectedPlaceVisitId(visit.id);
              setInfoWindowGuideId(null);
            }}
          />
        );
      })}
      {locations.map((location) => {
        const color = locationColorByGuideId.get(location.guideId) ?? '#4f46e5';
        const focused = focusedGuideId === location.guideId;
        const dimmed = focusedGuideId != null && !focused;
        if (focused && focusedDayDate && location.path.length === 0) {
          return null;
        }
        return (
          <MarkerF
            key={`marker-${location.guideId}`}
            position={{ lat: location.latestLatitude, lng: location.latestLongitude }}
            icon={buildGuideMarkerIcon(
              location.profileImageUrl,
              location.guideNameKo,
              color,
              focused,
              dimmed,
            )}
            opacity={dimmed ? 0.35 : 1}
            zIndex={focused ? 1000 : dimmed ? 10 : 100}
            onClick={() => {
              handleToggleFocus(location.guideId);
              if (focusedGuideId !== location.guideId) {
                setInfoWindowGuideId(location.guideId);
              }
              setSelectedPlaceVisitId(null);
            }}
          />
        );
      })}
      {selectedPlaceVisit ? (
        <InfoWindowF
          position={{
            lat: selectedPlaceVisit.centerLatitude,
            lng: selectedPlaceVisit.centerLongitude,
          }}
          onCloseClick={() => setSelectedPlaceVisitId(null)}
        >
          <div className="min-w-52 max-w-72 text-sm text-slate-800">
            <strong>장소 방문</strong>
            <div className="mt-1">
              프로젝트: {projectNameById.get(selectedPlaceVisit.projectId) ?? '알 수 없음'}
            </div>
            <div>
              체류: {formatRecordedAt(selectedPlaceVisit.startedAt)} ~{' '}
              {formatRecordedAt(selectedPlaceVisit.endedAt)}
            </div>
            <div>시간: {formatVisitDuration(selectedPlaceVisit.durationMs)}</div>
            <div>
              반경: 약 {Math.round(selectedPlaceVisit.radiusMeters)}m · GPS{' '}
              {selectedPlaceVisit.pointCount}포인트
            </div>
            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
              {hasPlaceVisitNotes ? (
                <>
                  {selectedPlaceVisitPinTypeLabel || selectedPlaceVisit.description ? (
                    <div className="flex flex-wrap items-center gap-2 text-slate-600">
                      {selectedPlaceVisit.description ? (
                        <span className="whitespace-pre-wrap">{selectedPlaceVisit.description}</span>
                      ) : null}
                      {selectedPlaceVisitPinTypeLabel ? (
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                          {selectedPlaceVisitPinTypeLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedPlaceVisit.photoUrls.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPlaceVisit.photoUrls.map((photoUrl, index) => (
                        <a
                          key={`${photoUrl}-${index}`}
                          href={photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded border border-slate-200"
                        >
                          <img
                            src={photoUrl}
                            alt={`장소 사진 ${index + 1}`}
                            className="h-16 w-16 object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex h-16 items-center justify-center rounded bg-slate-100 text-sm text-slate-500">
                  기록 없음
                </div>
              )}
            </div>
          </div>
        </InfoWindowF>
      ) : null}
      {infoWindowLocation && !selectedPlaceVisit ? (
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
  const [focusedDayDate, setFocusedDayDate] = useState<string | null>(null);
  const [focusedTimeRangeMinutes, setFocusedTimeRangeMinutes] = useState<[number, number]>([
    0,
    24 * 60,
  ]);
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
  const focusedLocationSource =
    locations.find((location) => location.guideId === focusedGuideId) ?? null;
  const focusedProjectIds = useMemo(() => {
    if (!focusedLocationSource) {
      return [];
    }
    return projectId ? [projectId] : focusedLocationSource.projectIds;
  }, [focusedLocationSource, projectId]);
  const focusedDayOptions = useMemo(() => {
    if (!focusedLocationSource) {
      return [];
    }
    return buildGuidePathDayOptions(focusedLocationSource.path, focusedProjectIds);
  }, [focusedLocationSource, focusedProjectIds]);
  const displayLocations = useMemo(() => {
    if (!focusedGuideId || !focusedLocationSource) {
      return locations;
    }

    return locations.map((location) => {
      if (location.guideId !== focusedGuideId) {
        return location;
      }
      return applyGuidePathTimeFilter(location, focusedDayDate, focusedTimeRangeMinutes);
    });
  }, [locations, focusedGuideId, focusedLocationSource, focusedDayDate, focusedTimeRangeMinutes]);
  const { placeVisits } = useGuidePlaceVisits({
    guideId: focusedGuideId || undefined,
    projectId: projectId || undefined,
    date: selectedDate,
  });
  const displayPlaceVisits = useMemo(
    () => filterPlaceVisitsByTimeRange(placeVisits, focusedDayDate, focusedTimeRangeMinutes),
    [placeVisits, focusedDayDate, focusedTimeRangeMinutes],
  );
  const focusedDisplayLocation =
    displayLocations.find((location) => location.guideId === focusedGuideId) ?? null;
  const filteredPathPointCount = focusedDisplayLocation?.path.length ?? 0;

  useEffect(() => {
    if (focusedDayDate && !focusedDayOptions.some((day) => day.date === focusedDayDate)) {
      setFocusedDayDate(null);
    }
  }, [focusedDayDate, focusedDayOptions]);
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

  useEffect(() => {
    if (!focusedGuideId) {
      setFocusedDayDate(null);
      setFocusedTimeRangeMinutes([0, 24 * 60]);
      return;
    }

    setFocusedDayDate(null);
    setFocusedTimeRangeMinutes([0, 24 * 60]);
  }, [focusedGuideId, projectId]);

  useEffect(() => {
    setFocusedTimeRangeMinutes([0, 24 * 60]);
  }, [focusedDayDate]);

  return (
    <section className="grid w-full max-w-none gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">가이드 위치</h1>
          <p className="mt-1 text-sm text-slate-600">
            선택한 날짜(울란바토르)에 진행 중인 Leadersteps 프로젝트의 GPS 경로와 참여자의 최근
            위치를 표시합니다. 참여자를 선택하면 장소 방문(place_visits)이 주황색 사각 핀으로
            표시됩니다.
          </p>
          {focusedGuideId ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-8 px-3 text-xs"
              onClick={() => setFocusedGuideId(null)}
            >
              전체 보기
            </Button>
          ) : null}
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

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
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
              locations={displayLocations}
              focusedGuideId={focusedGuideId}
              focusedDayDate={focusedDayDate}
              mapFitSource={focusedLocationSource}
              placeVisits={displayPlaceVisits}
              projects={projects}
              onFocusGuide={setFocusedGuideId}
            />
          ) : (
            <div className="min-h-[680px] w-full bg-slate-100" />
          )}
        </Card>

        <Card className="flex min-h-[680px] min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">위치 목록</h2>
              <p className="mt-1 text-xs text-slate-500">프로젝트 전체 기간 경로 · 울란바토르 시간</p>
            </div>
            <span className="shrink-0 text-xs text-slate-500">{locations.length}명</span>
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1">
            <div className="grid gap-2">
            {!locationsLoading && locations.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                {selectedDateLabel} 활성 프로젝트에 기록된 위치가 없습니다.
              </div>
            ) : (
              locations.map((location, index) => {
                const focused = focusedGuideId === location.guideId;
                const dimmed = focusedGuideId != null && !focused;
                const color = getGuidePathColor(index);
                const projectLabels = buildLocationProjectLabels(location.projectIds, projects);
                const displayLocation =
                  displayLocations.find((row) => row.guideId === location.guideId) ?? location;
                return (
                  <div
                    key={location.guideId}
                    className={`min-w-0 overflow-visible rounded-2xl border transition ${
                      focused
                        ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 ring-inset'
                        : 'border-slate-200'
                    } ${dimmed ? 'opacity-40 saturate-50' : ''}`}
                  >
                    <button
                      type="button"
                      aria-pressed={focused}
                      className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                        focused ? '' : 'hover:border-indigo-300 hover:bg-indigo-50/40'
                      } ${dimmed ? 'hover:opacity-70' : ''}`}
                      onClick={() => setFocusedGuideId(focused ? null : location.guideId)}
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <span
                          className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="min-w-0 break-words font-semibold text-slate-900">
                          {location.guideNameKo}
                          {location.guideNameMn ? ` · ${location.guideNameMn}` : ''}
                        </span>
                      </span>
                      {projectLabels.map((project) => (
                        <span
                          key={project.projectId}
                          className="mt-1 block break-words pl-4 text-xs leading-relaxed text-slate-500"
                        >
                          {project.label}
                        </span>
                      ))}
                      <span className="mt-1 block break-words pl-4 text-xs leading-relaxed text-slate-500">
                        {formatRecordedAt(displayLocation.latestRecordedAt)} · 정확도 약{' '}
                        {Math.round(displayLocation.latestAccuracy)}m · 경로{' '}
                        {displayLocation.path.length}포인트
                        {focused ? ` · 장소 방문 ${displayPlaceVisits.length}곳` : ''}
                      </span>
                    </button>
                    {focused && focusedDayOptions.length > 0 ? (
                      <div className="px-4 pb-3">
                        <GuideFocusedPathFilters
                          dayOptions={focusedDayOptions}
                          focusedDayDate={focusedDayDate}
                          filteredPathPointCount={filteredPathPointCount}
                          filteredPlaceVisitCount={displayPlaceVisits.length}
                          timeRangeMinutes={focusedTimeRangeMinutes}
                          onDayChange={setFocusedDayDate}
                          onTimeRangeChange={setFocusedTimeRangeMinutes}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
