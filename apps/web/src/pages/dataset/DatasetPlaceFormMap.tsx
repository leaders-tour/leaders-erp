import { CircleF, GoogleMap, MarkerF, OverlayView, OverlayViewF } from '@react-google-maps/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import { buildPlaceVisitMarkerIcon } from '../../features/guide/guide-location-map-utils';
import type { GuidePlaceVisitRow } from '../../features/guide/hooks';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';
import { useGoogleMapsLoader } from '../../lib/google-maps-loader';

const DEFAULT_CENTER = { lat: 47.8512, lng: 106.912 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };

interface DatasetPlaceFormMapProps {
  relatedPlaces: CatalogPlaceRow[];
  latitude: number | null;
  longitude: number | null;
  focus: { lat: number; lng: number } | null;
  visitRadiusM?: number | null;
  visits?: GuidePlaceVisitRow[];
  selectedVisitId?: string | null;
  onPick: (lat: number, lng: number) => void;
  onSelectVisit?: (visit: GuidePlaceVisitRow) => void;
}

export function DatasetPlaceFormMap({
  relatedPlaces,
  latitude,
  longitude,
  focus,
  visitRadiusM,
  visits = [],
  selectedVisitId = null,
  onPick,
  onSelectVisit,
}: DatasetPlaceFormMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [satellite, setSatellite] = useState(false);

  const relatedMarkers = useMemo(
    () => relatedPlaces.filter((row) => row.latitude != null && row.longitude != null),
    [relatedPlaces],
  );

  const hasDraft = latitude != null && longitude != null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined') return;
    if (focus) {
      map.panTo(focus);
      return;
    }
    if (hasDraft) {
      map.panTo({ lat: latitude, lng: longitude });
      return;
    }
    if (visits.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const visit of visits) {
        bounds.extend({ lat: visit.centerLatitude, lng: visit.centerLongitude });
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
  }, [focus, hasDraft, latitude, longitude, relatedMarkers, visits]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="grid h-full place-items-center bg-slate-50 text-center">
        <p className="text-sm text-slate-500">지도 미연동 · 좌표를 직접 입력하세요.</p>
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
      onClick={(event) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        if (lat == null || lng == null) return;
        onPick(lat, lng);
      }}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        draggableCursor: 'crosshair',
        styles: satellite
          ? undefined
          : [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      }}
    >
      {visits.map((visit) => {
        const selected = visit.id === selectedVisitId;
        return (
          <MarkerF
            key={`visit-${visit.id}`}
            position={{ lat: visit.centerLatitude, lng: visit.centerLongitude }}
            icon={buildPlaceVisitMarkerIcon(selected)}
            zIndex={selected ? 80 : 40}
            onClick={() => onSelectVisit?.(visit)}
          />
        );
      })}
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
      {hasDraft && visitRadiusM != null ? (
        <CircleF
          center={{ lat: latitude, lng: longitude }}
          radius={visitRadiusM}
          options={{
            clickable: false,
            fillColor: '#7C6CE0',
            fillOpacity: 0.16,
            strokeColor: '#5B4BD6',
            strokeOpacity: 0.7,
            strokeWeight: 1,
          }}
        />
      ) : null}
      {hasDraft ? (
        <MarkerF
          position={{ lat: latitude, lng: longitude }}
          draggable
          onDragEnd={(event) => {
            const lat = event.latLng?.lat();
            const lng = event.latLng?.lng();
            if (lat == null || lng == null) return;
            onPick(lat, lng);
          }}
        />
      ) : null}
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
