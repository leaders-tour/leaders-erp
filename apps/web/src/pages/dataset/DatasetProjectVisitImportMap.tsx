import { GoogleMap, MarkerF, OverlayView, OverlayViewF, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import type { ProjectVisitImportRow } from '../../features/dataset/project-visit-import';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';

const DEFAULT_CENTER = { lat: 47.8512, lng: 106.912 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };

function visitMarkerIcon(selected: boolean, enabled: boolean): google.maps.Icon {
  const size = selected ? 38 : 34;
  const fill = !enabled ? '#94a3b8' : selected ? '#c2410c' : '#ea580c';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
      <rect x="4" y="4" width="32" height="32" rx="8" fill="${fill}" stroke="#ffffff" stroke-width="3"/>
      <path d="M20 11c-3.1 0-5.5 2.4-5.5 5.4 0 4.1 5.5 10.6 5.5 10.6s5.5-6.5 5.5-10.6C25.5 13.4 23.1 11 20 11zm0 7.3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="#ffffff"/>
    </svg>
  `.trim();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

interface DatasetProjectVisitImportMapProps {
  rows: ProjectVisitImportRow[];
  catalogPlaces: CatalogPlaceRow[];
  selectedVisitId: string | null;
  onSelectVisit: (visitId: string) => void;
}

export function DatasetProjectVisitImportMap({
  rows,
  catalogPlaces,
  selectedVisitId,
  onSelectVisit,
}: DatasetProjectVisitImportMapProps): JSX.Element {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'catalog-place-map-ko',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    language: 'ko',
    region: 'KR',
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [satellite, setSatellite] = useState(false);

  const relatedMarkers = useMemo(
    () => catalogPlaces.filter((row) => row.latitude != null && row.longitude != null),
    [catalogPlaces],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined') return;
    if (rows.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const row of rows) {
        bounds.extend({ lat: row.latitude, lng: row.longitude });
      }
      map.fitBounds(bounds, 48);
      return;
    }
    if (relatedMarkers.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const row of relatedMarkers) {
      bounds.extend({ lat: row.latitude as number, lng: row.longitude as number });
    }
    map.fitBounds(bounds, 64);
  }, [relatedMarkers, rows]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="grid h-full place-items-center bg-slate-50 text-center">
        <p className="text-sm text-slate-500">지도 미연동 · 방문 좌표는 테이블에서 확인하세요.</p>
      </div>
    );
  }

  if (loadError) {
    return <p className="grid h-full place-items-center text-sm text-rose-600">지도를 불러오지 못했습니다.</p>;
  }

  if (!isLoaded) {
    return <p className="grid h-full place-items-center text-sm text-slate-500">지도 로딩 중…</p>;
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={12}
        mapTypeId={satellite ? 'hybrid' : 'roadmap'}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: satellite
            ? undefined
            : [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
        }}
      >
        {relatedMarkers.map((row) => (
          <OverlayViewF
            key={row.id}
            position={{ lat: row.latitude as number, lng: row.longitude as number }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative h-0 w-0">
              <span className="absolute left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400 ring-2 ring-white" />
              <div className="absolute left-3 top-[-10px] whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm">
                {row.name} · {row.code}
              </div>
            </div>
          </OverlayViewF>
        ))}
        {rows.map((row) => {
          const selected = row.visitId === selectedVisitId;
          return (
            <MarkerF
              key={row.visitId}
              position={{ lat: row.latitude, lng: row.longitude }}
              icon={visitMarkerIcon(selected, row.enabled)}
              zIndex={selected ? 80 : row.enabled ? 40 : 20}
              onClick={() => onSelectVisit(row.visitId)}
            />
          );
        })}
      </GoogleMap>
      <button
        type="button"
        className="absolute right-3 top-3 z-20 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={(event) => {
          event.stopPropagation();
          setSatellite((value) => !value);
        }}
      >
        {satellite ? '지도' : '위성'}
      </button>
    </div>
  );
}
