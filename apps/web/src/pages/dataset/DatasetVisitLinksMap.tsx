import { CircleF, GoogleMap, MarkerF } from '@react-google-maps/api';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { CatalogVisitLinkStatus } from '../../features/dataset/labels';
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

interface DatasetVisitLinksMapProps {
  visits: VisitLinkMapRow[];
  places: VisitLinkMapPlace[];
  selectedId: string | null;
  focusNonce?: number;
  onSelect: (id: string) => void;
}

function DatasetVisitLinksMapView({
  visits,
  places,
  selectedId,
  focusNonce = 0,
  onSelect,
}: DatasetVisitLinksMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const visitsRef = useRef(visits);
  visitsRef.current = visits;
  const selected = visits.find((row) => row.id === selectedId) ?? null;
  const fitKey = visits.map((row) => `${row.id}:${row.latitude}:${row.longitude}`).join('|');

  const icons = useMemo(() => {
    if (typeof google === 'undefined') return null;
    return { place: placeIcon() };
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
    const map = mapRef.current;
    if (!map || !selected || typeof google === 'undefined') return;
    map.panTo({ lat: selected.latitude, lng: selected.longitude });
    if (focusNonce > 0) map.setZoom(SELECT_ZOOM);
  }, [focusNonce, selected, selectedId]);

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
      onLoad={(map) => {
        mapRef.current = map;
        fitAll(map);
      }}
      options={MAP_OPTIONS}
    >
      {places.map((place) => (
        <MarkerF
          key={`place-${place.id}`}
          position={{ lat: place.latitude, lng: place.longitude }}
          icon={icons?.place}
          clickable={false}
          zIndex={8}
        />
      ))}
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
