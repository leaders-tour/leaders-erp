import { Button, Card, Input } from '@tour/ui';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useGuideLocations,
  useGuides,
  type GuideLocationRow,
} from '../features/guide/hooks';
import { GOOGLE_MAPS_API_KEY } from '../lib/google-maps-api-key';

const DEFAULT_MAP_CENTER = { lat: 47.9189, lng: 106.9176 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '680px' };
const ULAANBAATAR_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ulaanbaatar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const ULAANBAATAR_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Ulaanbaatar',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function getTodayInUlaanbaatar(): string {
  return ULAANBAATAR_DATE_FORMATTER.format(new Date());
}

function formatRecordedAt(value: string): string {
  return ULAANBAATAR_TIME_FORMATTER.format(new Date(value));
}

function createMarkerIcon(focused: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: focused ? '#4f46e5' : '#6366f1',
    fillOpacity: 0.88,
    strokeColor: focused ? '#312e81' : '#4338ca',
    strokeWeight: 3,
    scale: focused ? 13 : 10,
  };
}

function fitMapToLocations(map: google.maps.Map, locations: GuideLocationRow[]): void {
  if (locations.length === 0) {
    map.setCenter(DEFAULT_MAP_CENTER);
    map.setZoom(11);
    return;
  }
  if (locations.length === 1) {
    const location = locations[0];
    if (location) {
      map.setCenter({ lat: location.latitude, lng: location.longitude });
      map.setZoom(14);
    }
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  for (const location of locations) {
    bounds.extend({ lat: location.latitude, lng: location.longitude });
  }
  map.fitBounds(bounds, 48);
}

function GuideGoogleMap({
  locations,
  focusedGuideId,
  onFocusGuide,
}: {
  locations: GuideLocationRow[];
  focusedGuideId: string | null;
  onFocusGuide: (guideId: string) => void;
}): JSX.Element {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [infoWindowGuideId, setInfoWindowGuideId] = useState<string | null>(null);
  const focusedLocation =
    locations.find((location) => location.guideId === focusedGuideId) ?? null;
  const infoWindowLocation =
    locations.find((location) => location.guideId === infoWindowGuideId) ?? null;

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitMapToLocations(map, locations);
    },
    [locations],
  );

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
      lat: focusedLocation.latitude,
      lng: focusedLocation.longitude,
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
      {locations.map((location) => {
        const focused = focusedGuideId === location.guideId;
        return (
          <MarkerF
            key={location.guideId}
            position={{ lat: location.latitude, lng: location.longitude }}
            icon={createMarkerIcon(focused)}
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
            lat: infoWindowLocation.latitude,
            lng: infoWindowLocation.longitude,
          }}
          onCloseClick={() => setInfoWindowGuideId(null)}
        >
          <div className="min-w-48 text-sm text-slate-800">
            <strong>{infoWindowLocation.guideNameKo}</strong>
            {infoWindowLocation.guideNameMn ? ` · ${infoWindowLocation.guideNameMn}` : ''}
            <br />
            기록: {formatRecordedAt(infoWindowLocation.recordedAt)}
            <br />
            정확도: 약 {Math.round(infoWindowLocation.accuracy)}m
          </div>
        </InfoWindowF>
      ) : null}
    </GoogleMap>
  );
}

export function GuideLocationMapPage(): JSX.Element {
  const [date, setDate] = useState(getTodayInUlaanbaatar);
  const [guideId, setGuideId] = useState('');
  const [focusedGuideId, setFocusedGuideId] = useState<string | null>(null);
  const { guides, loading: guidesLoading } = useGuides();
  const {
    locations,
    loading: locationsLoading,
    refreshing,
    errorMessage,
    refetch,
  } = useGuideLocations(date, guideId || undefined);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'guide-location-map-ko',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    language: 'ko',
    region: 'KR',
  });
  const linkedGuides = useMemo(
    () => guides.filter((guide) => guide.leaderstepsAuthUserId),
    [guides],
  );
  const isToday = date === getTodayInUlaanbaatar();

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
            선택한 날짜에 기록된 각 가이드의 마지막 GPS 위치를 Google Maps에 표시합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            연결 가이드 {linkedGuides.length}명
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            위치 확인 {locations.length}명
          </span>
          {isToday ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
              1분마다 자동 갱신
            </span>
          ) : null}
        </div>
      </header>

      <Card className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,220px)_minmax(240px,1fr)_auto] md:items-end">
        <div>
          <label htmlFor="guide-location-date" className="mb-2 block text-sm font-medium text-slate-700">
            날짜
          </label>
          <Input
            id="guide-location-date"
            type="date"
            value={date}
            max={getTodayInUlaanbaatar()}
            onChange={(event) => {
              setDate(event.target.value);
              setFocusedGuideId(null);
            }}
          />
        </div>
        <div>
          <label htmlFor="guide-location-guide" className="mb-2 block text-sm font-medium text-slate-700">
            가이드
          </label>
          <select
            id="guide-location-guide"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
            value={guideId}
            disabled={guidesLoading}
            onChange={(event) => {
              setGuideId(event.target.value);
              setFocusedGuideId(null);
            }}
          >
            <option value="">연결된 가이드 전체</option>
            {linkedGuides.map((guide) => (
              <option key={guide.id} value={guide.id}>
                {guide.nameKo}
                {guide.nameMn ? ` · ${guide.nameMn}` : ''}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={locationsLoading || refreshing || !date}
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
          Google Maps API 키가 필요합니다. 루트 <code className="font-mono">.env</code>에{' '}
          <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code>를 추가하고 Maps JavaScript API를
          활성화해 주세요.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Google Maps를 불러오지 못했습니다. API 키와 Maps JavaScript API 설정을 확인해 주세요.
        </div>
      ) : null}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="relative min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm">
          {locationsLoading || !GOOGLE_MAPS_API_KEY || !isLoaded ? (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/75 text-sm text-slate-500 backdrop-blur-sm">
              {!GOOGLE_MAPS_API_KEY
                ? 'Google Maps API 키를 설정해 주세요.'
                : loadError
                  ? 'Google Maps를 불러오지 못했습니다.'
                  : '지도를 불러오는 중...'}
            </div>
          ) : null}
          {GOOGLE_MAPS_API_KEY && isLoaded ? (
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
              <p className="mt-1 text-xs text-slate-500">울란바토르 시간 기준</p>
            </div>
            <span className="text-xs text-slate-500">{locations.length}명</span>
          </div>
          <div className="mt-4 grid max-h-[600px] gap-2 overflow-y-auto pr-1">
            {!locationsLoading && locations.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                선택한 조건에 기록된 위치가 없습니다.
              </div>
            ) : (
              locations.map((location) => {
                const focused = focusedGuideId === location.guideId;
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
                    <span className="block font-semibold text-slate-900">
                      {location.guideNameKo}
                      {location.guideNameMn ? ` · ${location.guideNameMn}` : ''}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatRecordedAt(location.recordedAt)} · 정확도 약{' '}
                      {Math.round(location.accuracy)}m
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
