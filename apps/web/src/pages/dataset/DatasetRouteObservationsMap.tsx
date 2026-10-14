import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogRouteObservationStatus } from '../../features/dataset/labels';
import { DEFAULT_GOOGLE_MAP_TYPE_ID, useGoogleMapsLoader } from '../../lib/google-maps-loader';

const DEFAULT_CENTER = { lat: 47.4, lng: 103.7 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };
const SELECT_ZOOM = 16;
const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'hybrid',
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

export interface RouteObservationMapPathPoint {
  lat: number;
  lng: number;
}

export interface RouteObservationMapRow {
  id: string;
  status: CatalogRouteObservationStatus;
  path: RouteObservationMapPathPoint[];
}

export type RouteObservationMapFocus = 'fit-all' | 'fit-route' | 'zoom-obs';

interface DatasetRouteObservationsMapProps {
  observations: RouteObservationMapRow[];
  selectedObservationId: string | null;
  focus: RouteObservationMapFocus;
  focusNonce?: number;
  onSelectObservation: (id: string) => void;
}

function strokeColor(status: CatalogRouteObservationStatus, selected: boolean): string {
  if (status === 'HOLD') return selected ? '#b45309' : '#d97706';
  return selected ? '#5b21b6' : '#2563eb';
}

function pinIcon(fill: string): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(16, 16),
    anchor: new google.maps.Point(8, 8),
  };
}

function fitPaths(map: google.maps.Map, rows: RouteObservationMapRow[]) {
  const bounds = new google.maps.LatLngBounds();
  let count = 0;
  for (const row of rows) {
    for (const point of row.path) {
      bounds.extend({ lat: point.lat, lng: point.lng });
      count += 1;
    }
  }
  if (count > 0) {
    map.fitBounds(bounds, 48);
  }
}

function zoomToPath(map: google.maps.Map, path: RouteObservationMapPathPoint[]) {
  const mid = path[Math.floor((path.length - 1) / 2)] ?? path[0];
  if (!mid) return;
  map.panTo({ lat: mid.lat, lng: mid.lng });
  map.setZoom(SELECT_ZOOM);
}

function DatasetRouteObservationsMapView({
  observations,
  selectedObservationId,
  focus,
  focusNonce = 0,
  onSelectObservation,
}: DatasetRouteObservationsMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const selected = observations.find((row) => row.id === selectedObservationId) ?? null;
  const endpoints = useMemo(() => {
    const points: Array<{ key: string; lat: number; lng: number }> = [];
    for (const row of observations) {
      const start = row.path[0];
      const end = row.path[row.path.length - 1];
      if (start) points.push({ key: `${row.id}-from`, lat: start.lat, lng: start.lng });
      if (end && (end.lat !== start?.lat || end.lng !== start?.lng)) {
        points.push({ key: `${row.id}-to`, lat: end.lat, lng: end.lng });
      }
    }
    return points;
  }, [observations]);

  useEffect(() => {
    if (!map) return;
    if (focus === 'zoom-obs' && selected && selected.path.length > 0) {
      zoomToPath(map, selected.path);
      return;
    }
    fitPaths(map, observations);
  }, [focus, focusNonce, map, observations, selected]);

  if (loadError) {
    return <p className="grid h-full place-items-center text-sm text-rose-600">지도를 불러오지 못했습니다.</p>;
  }
  if (!isLoaded) {
    return <p className="grid h-full place-items-center text-sm text-slate-500">지도 로딩 중…</p>;
  }

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={7}
      mapTypeId={DEFAULT_GOOGLE_MAP_TYPE_ID}
      onLoad={(loaded) => {
        mapRef.current = loaded;
        setMap(loaded);
        fitPaths(loaded, observations);
      }}
      options={MAP_OPTIONS}
    >
      {observations.map((row) => {
        if (row.path.length < 2) return null;
        const isSelected = row.id === selectedObservationId;
        return (
          <PolylineF
            key={row.id}
            path={row.path}
            options={{
              strokeColor: strokeColor(row.status, isSelected),
              strokeOpacity: isSelected ? 1 : 0.7,
              strokeWeight: isSelected ? 5 : 3,
              zIndex: isSelected ? 30 : 10,
              clickable: true,
            }}
            onClick={() => onSelectObservation(row.id)}
          />
        );
      })}
      {endpoints.map((point) => (
        <MarkerF
          key={point.key}
          position={{ lat: point.lat, lng: point.lng }}
          icon={pinIcon('#334155')}
          clickable={false}
          zIndex={8}
        />
      ))}
    </GoogleMap>
  );
}

export const DatasetRouteObservationsMap = memo(DatasetRouteObservationsMapView);
