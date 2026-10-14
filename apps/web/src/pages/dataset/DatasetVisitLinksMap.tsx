import { CircleF, GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { haversineMeters } from '@tour/domain';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogVisitLinkStatus } from '../../features/dataset/labels';
import { GuideMapPathsLayer } from '../../features/guide/GuideMapPathsLayer';
import { normalizeGuideMapPath, prepareGuidePathForMap } from '../../features/guide/guide-location-map-utils';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';
import { DEFAULT_GOOGLE_MAP_TYPE_ID, useGoogleMapsLoader } from '../../lib/google-maps-loader';

const DEFAULT_CENTER = { lat: 47.4, lng: 103.7 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'hybrid',
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

export interface VisitLinkMapRow {
  id: string;
  latitude: number;
  longitude: number;
  status: CatalogVisitLinkStatus;
}

export interface VisitLinkMapPlace {
  id: string;
  latitude: number;
  longitude: number;
}

export interface VisitLinkMapNeighbor {
  id: string;
  latitude: number;
  longitude: number;
}

export interface VisitLinkMapPathPoint {
  latitude: number;
  longitude: number;
}

function statusFill(status: CatalogVisitLinkStatus, selected: boolean): string {
  if (status === 'REVIEW') return selected ? '#b45309' : '#d97706';
  if (status === 'UNLINKED') return selected ? '#be185d' : '#ec4899';
  if (status === 'MANUAL') return selected ? '#1d4ed8' : '#3b82f6';
  return selected ? '#047857' : '#10b981';
}

function pinIcon(fill: string, selected: boolean): google.maps.Icon {
  const size = selected ? 26 : 18;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="${fill}" stroke="#ffffff" stroke-width="3"/>
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

function neighborIcon(): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7" fill="#2563eb" stroke="#ffffff" stroke-width="2.5"/>
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(20, 20),
    anchor: new google.maps.Point(10, 10),
  };
}

function placeIcon(): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.5" fill="#ffffff" stroke="#334155" stroke-width="2"/>
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(16, 16),
    anchor: new google.maps.Point(8, 8),
  };
}

const SELECT_ZOOM = 15;
const CONTEXT_FIT_M = 25_000;

interface DatasetVisitLinksMapProps {
  visits: VisitLinkMapRow[];
  places: VisitLinkMapPlace[];
  selectedId: string | null;
  focusNonce?: number;
  previous?: VisitLinkMapNeighbor | null;
  next?: VisitLinkMapNeighbor | null;
  contextPath?: VisitLinkMapPathPoint[];
  onSelect: (id: string) => void;
}

function DatasetVisitLinksMapView({
  visits,
  places,
  selectedId,
  focusNonce = 0,
  previous = null,
  next = null,
  contextPath = [],
  onSelect,
}: DatasetVisitLinksMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const visitsRef = useRef(visits);
  visitsRef.current = visits;
  const selected = visits.find((row) => row.id === selectedId) ?? null;
  const fitKey = visits.map((row) => `${row.id}:${row.latitude}:${row.longitude}`).join('|');
  const neighborPath = useMemo(() => {
    if (!selected) return [];
    const points: Array<{ lat: number; lng: number }> = [];
    if (previous) points.push({ lat: previous.latitude, lng: previous.longitude });
    points.push({ lat: selected.latitude, lng: selected.longitude });
    if (next) points.push({ lat: next.latitude, lng: next.longitude });
    return points.length >= 2 ? points : [];
  }, [next, previous, selected]);
  const gpsPath = useMemo(() => normalizeGuideMapPath(contextPath), [contextPath]);
  const pathLayers = useMemo(
    () =>
      gpsPath.length >= 2
        ? [
            {
              guideId: 'visit-context',
              path: prepareGuidePathForMap(gpsPath, { zoom: 12 }),
              color: '#2563eb',
              focused: true,
              dimmed: false,
            },
          ]
        : [],
    [gpsPath],
  );

  const icons = useMemo(() => {
    if (typeof google === 'undefined') return null;
    return { place: placeIcon(), neighbor: neighborIcon() };
  }, [isLoaded]);

  const fitAll = useCallback((map: google.maps.Map) => {
    if (typeof google === 'undefined') return;
    const current = visitsRef.current;
    if (current.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const row of current) bounds.extend({ lat: row.latitude, lng: row.longitude });
    map.fitBounds(bounds, 48);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    fitAll(map);
  }, [fitAll, fitKey]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !selected || typeof google === 'undefined') return;
    if (focusNonce <= 0) {
      instance.panTo({ lat: selected.latitude, lng: selected.longitude });
      return;
    }
    const origin = { latitude: selected.latitude, longitude: selected.longitude };
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: selected.latitude, lng: selected.longitude });
    let extra = 0;
    for (const neighbor of [previous, next]) {
      if (!neighbor) continue;
      if (haversineMeters(origin, neighbor) > CONTEXT_FIT_M) continue;
      bounds.extend({ lat: neighbor.latitude, lng: neighbor.longitude });
      extra += 1;
    }
    for (const point of gpsPath) {
      if (haversineMeters(origin, { latitude: point.lat, longitude: point.lng }) > CONTEXT_FIT_M) continue;
      bounds.extend(point);
      extra += 1;
    }
    if (extra > 0) {
      instance.fitBounds(bounds, 48);
      return;
    }
    instance.panTo({ lat: selected.latitude, lng: selected.longitude });
    instance.setZoom(SELECT_ZOOM);
  }, [focusNonce, gpsPath, next, previous, selected, selectedId]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="grid h-full place-items-center bg-slate-50 text-center">
        <p className="text-sm text-slate-500">지도 미연동 · 방문 좌표는 목록에서 확인하세요.</p>
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
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={7}
      mapTypeId={DEFAULT_GOOGLE_MAP_TYPE_ID}
      onLoad={(loaded) => {
        mapRef.current = loaded;
        setMap(loaded);
        fitAll(loaded);
      }}
      options={MAP_OPTIONS}
    >
      <GuideMapPathsLayer map={map} layers={pathLayers} />
      {pathLayers.length === 0 && neighborPath.length >= 2 ? (
        <PolylineF
          path={neighborPath}
          options={{
            strokeColor: '#2563eb',
            strokeOpacity: 0.7,
            strokeWeight: 3,
            zIndex: 20,
          }}
        />
      ) : null}
      {places.map((place) => (
        <MarkerF
          key={`place-${place.id}`}
          position={{ lat: place.latitude, lng: place.longitude }}
          icon={icons?.place}
          clickable={false}
          zIndex={8}
        />
      ))}
      {[previous, next].map((neighbor) =>
        neighbor && neighbor.id !== selectedId ? (
          <MarkerF
            key={`neighbor-${neighbor.id}`}
            position={{ lat: neighbor.latitude, lng: neighbor.longitude }}
            icon={icons?.neighbor}
            clickable={false}
            zIndex={40}
          />
        ) : null,
      )}
      {visits.map((row) => {
        const isSelected = row.id === selectedId;
        return (
          <MarkerF
            key={row.id}
            position={{ lat: row.latitude, lng: row.longitude }}
            icon={pinIcon(statusFill(row.status, isSelected), isSelected)}
            zIndex={isSelected ? 60 : 30}
            onClick={() => onSelect(row.id)}
          />
        );
      })}
      {selected ? (
        <CircleF
          center={{ lat: selected.latitude, lng: selected.longitude }}
          radius={150}
          options={{
            strokeColor: statusFill(selected.status, true),
            strokeOpacity: 0.9,
            strokeWeight: 1.5,
            fillColor: statusFill(selected.status, true),
            fillOpacity: 0.12,
            clickable: false,
          }}
        />
      ) : null}
    </GoogleMap>
  );
}

export const DatasetVisitLinksMap = memo(DatasetVisitLinksMapView);
