import { CircleF, GoogleMap, MarkerF, OverlayView, OverlayViewF } from '@react-google-maps/api';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_GOOGLE_MAP_TYPE_ID, useGoogleMapsLoader } from '../../lib/google-maps-loader';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';

const DEFAULT_CENTER = { lat: 47.8512, lng: 106.912 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };
const ROADMAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
const HYBRID_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'hybrid',
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};
const ROADMAP_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'roadmap',
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  styles: ROADMAP_STYLES,
};

export interface SampleMapCluster {
  id: string;
  latitude: number;
  longitude: number;
  visitRadiusM: number;
  name: string;
  kind: 'new_place' | 'existing_fix' | 'review';
  visits: Array<{ id: string; latitude: number; longitude: number }>;
}

export interface SampleMapPlace {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

function clusterFill(kind: SampleMapCluster['kind'], selected: boolean): string {
  if (kind === 'review') return selected ? '#b45309' : '#d97706';
  if (kind === 'existing_fix') return selected ? '#1d4ed8' : '#3b82f6';
  return selected ? '#5B4BD6' : '#8B83B8';
}

function clusterIcon(kind: SampleMapCluster['kind'], selected: boolean): google.maps.Icon {
  const size = selected ? 28 : 20;
  const fill = clusterFill(kind, selected);
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

function visitIcon(): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="4.5" fill="#ea580c" stroke="#ffffff" stroke-width="1.5"/>
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(12, 12),
    anchor: new google.maps.Point(6, 6),
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

interface DatasetPlaceSamplesMapProps {
  clusters: SampleMapCluster[];
  places: SampleMapPlace[];
  selectedClusterId: string | null;
  focusNonce: number;
  onSelectCluster: (clusterId: string) => void;
}

function DatasetPlaceSamplesMapView({
  clusters,
  places,
  selectedClusterId,
  focusNonce,
  onSelectCluster,
}: DatasetPlaceSamplesMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const [satellite, setSatellite] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustersRef = useRef(clusters);
  clustersRef.current = clusters;
  const selectedClusterIdRef = useRef(selectedClusterId);
  selectedClusterIdRef.current = selectedClusterId;
  const selected = clusters.find((cluster) => cluster.id === selectedClusterId) ?? null;
  const fitKey = clusters.map((cluster) => `${cluster.id}:${cluster.latitude}:${cluster.longitude}`).join('|');

  const clusterIcons = useMemo(() => {
    if (typeof google === 'undefined') return null;
    return {
      newSelected: clusterIcon('new_place', true),
      newIdle: clusterIcon('new_place', false),
      fixSelected: clusterIcon('existing_fix', true),
      fixIdle: clusterIcon('existing_fix', false),
      reviewSelected: clusterIcon('review', true),
      reviewIdle: clusterIcon('review', false),
      visit: visitIcon(),
      place: placeIcon(),
    };
  }, [isLoaded]);

  const fitAllClusters = useCallback((map: google.maps.Map) => {
    if (typeof google === 'undefined') return;
    const current = clustersRef.current;
    if (current.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const cluster of current) {
      bounds.extend({ lat: cluster.latitude, lng: cluster.longitude });
    }
    map.fitBounds(bounds, 48);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    fitAllClusters(map);
  }, [fitAllClusters, fitKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusNonce === 0 || typeof google === 'undefined') return;
    const current = clustersRef.current.find((cluster) => cluster.id === selectedClusterIdRef.current);
    if (!current) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: current.latitude, lng: current.longitude });
    for (const visit of current.visits) {
      bounds.extend({ lat: visit.latitude, lng: visit.longitude });
    }
    map.fitBounds(bounds, 72);
  }, [focusNonce]);

  const handleLoad = useCallback((nextMap: google.maps.Map) => {
    mapRef.current = nextMap;
    fitAllClusters(nextMap);
  }, [fitAllClusters]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="grid h-full place-items-center bg-slate-50 text-center">
        <p className="text-sm text-slate-500">지도 미연동 · 묶음 좌표는 목록에서 확인하세요.</p>
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
        zoom={6}
        mapTypeId={satellite ? DEFAULT_GOOGLE_MAP_TYPE_ID : 'roadmap'}
        onLoad={handleLoad}
        options={satellite ? HYBRID_OPTIONS : ROADMAP_OPTIONS}
      >
        {places.map((place) => (
          <MarkerF
            key={`place-${place.id}`}
            position={{ lat: place.latitude, lng: place.longitude }}
            icon={clusterIcons?.place}
            clickable={false}
            zIndex={8}
          />
        ))}
        {clusters.map((cluster) => {
          const isSelected = cluster.id === selectedClusterId;
          const icon =
            cluster.kind === 'review'
              ? isSelected
                ? clusterIcons?.reviewSelected
                : clusterIcons?.reviewIdle
              : cluster.kind === 'existing_fix'
                ? isSelected
                  ? clusterIcons?.fixSelected
                  : clusterIcons?.fixIdle
                : isSelected
                  ? clusterIcons?.newSelected
                  : clusterIcons?.newIdle;
          return (
            <MarkerF
              key={cluster.id}
              position={{ lat: cluster.latitude, lng: cluster.longitude }}
              icon={icon}
              zIndex={isSelected ? 60 : 30}
              onClick={() => onSelectCluster(cluster.id)}
            />
          );
        })}
        {selected ? (
          <>
            <CircleF
              center={{ lat: selected.latitude, lng: selected.longitude }}
              radius={selected.visitRadiusM}
              options={{
                strokeColor: clusterFill(selected.kind, true),
                strokeOpacity: 0.9,
                strokeWeight: 1.5,
                fillColor: clusterFill(selected.kind, true),
                fillOpacity: 0.12,
                clickable: false,
              }}
            />
            {selected.visits.map((visit) => (
              <MarkerF
                key={`visit-${visit.id}`}
                position={{ lat: visit.latitude, lng: visit.longitude }}
                icon={clusterIcons?.visit}
                zIndex={50}
                clickable={false}
              />
            ))}
            {selected.name ? (
              <OverlayViewF
                position={{ lat: selected.latitude, lng: selected.longitude }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="relative h-0 w-0 pointer-events-none">
                  <div className="absolute left-3 top-[-10px] whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 shadow-sm">
                    {selected.name} · {selected.visitRadiusM}m
                  </div>
                </div>
              </OverlayViewF>
            ) : null}
          </>
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

export const DatasetPlaceSamplesMap = memo(DatasetPlaceSamplesMapView);
