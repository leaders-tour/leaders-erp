import { GoogleMap, MarkerF, OverlayView, OverlayViewF } from '@react-google-maps/api';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GuideMapPathsLayer } from '../../features/guide/GuideMapPathsLayer';
import {
  getGuidePathColor,
  normalizeGuideMapPath,
  prepareGuidePathForMap,
} from '../../features/guide/guide-location-map-utils';
import type { GuideLiveLocationRow } from '../../features/guide/hooks';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';
import { DEFAULT_GOOGLE_MAP_TYPE_ID, useGoogleMapsLoader } from '../../lib/google-maps-loader';

const DEFAULT_CENTER = { lat: 47.8512, lng: 106.912 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };
const FOCUS_ZOOM = 16;
const LABEL_MIN_ZOOM = 14;
const MAX_VISIBLE_LABELS = 80;
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

export interface ImportMapVisitPin {
  visitId: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
  position: { lat: number; lng: number };
}

export interface ImportMapCatalogPin {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  position: { lat: number; lng: number };
}

function visitBoundsKey(pins: ImportMapVisitPin[]): string {
  return pins.map((pin) => `${pin.visitId}:${pin.latitude}:${pin.longitude}`).join('|');
}

function catalogBoundsKey(pins: ImportMapCatalogPin[]): string {
  return pins.map((pin) => `${pin.id}:${pin.latitude}:${pin.longitude}`).join('|');
}

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
  visitPins: ImportMapVisitPin[];
  catalogPins: ImportMapCatalogPin[];
  locations?: GuideLiveLocationRow[];
  selectedVisitId: string | null;
  focusNonce?: number;
  onSelectVisit: (visitId: string) => void;
}

function DatasetProjectVisitImportMapView({
  visitPins,
  catalogPins,
  locations = [],
  selectedVisitId,
  focusNonce = 0,
  onSelectVisit,
}: DatasetProjectVisitImportMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const visitPinsRef = useRef(visitPins);
  const catalogPinsRef = useRef(catalogPins);
  visitPinsRef.current = visitPins;
  catalogPinsRef.current = catalogPins;
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [satellite, setSatellite] = useState(true);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [view, setView] = useState<{
    zoom: number;
    bounds: { south: number; west: number; north: number; east: number } | null;
  }>({ zoom: 6, bounds: null });

  const visitFitKey = visitBoundsKey(visitPins);
  const catalogFitKey = catalogBoundsKey(catalogPins);

  const visitIcons = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return null;
    return {
      selected: visitMarkerIcon(true, true),
      enabled: visitMarkerIcon(false, true),
      disabled: visitMarkerIcon(false, false),
    };
  }, [isLoaded]);

  const catalogIcon = useMemo<google.maps.Symbol | undefined>(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5,
      fillColor: '#94a3b8',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  }, [isLoaded]);

  const fullPaths = useMemo(
    () =>
      locations.map((location, index) => ({
        guideId: location.guideId,
        path: normalizeGuideMapPath(location.path),
        color: getGuidePathColor(index),
      })),
    [locations],
  );

  const pathLayers = useMemo(
    () =>
      fullPaths.map((layer) => ({
        guideId: layer.guideId,
        path: prepareGuidePathForMap(layer.path, view),
        color: layer.color,
        focused: true,
        dimmed: false,
        arrows: false,
      })),
    [fullPaths, view],
  );

  const refreshView = useCallback(() => {
    const instance = mapRef.current;
    if (!instance) return;
    const zoom = instance.getZoom() ?? 0;
    const bounds = instance.getBounds();
    if (zoom < LABEL_MIN_ZOOM) {
      setLabelIds((current) => (current.length === 0 ? current : []));
    } else if (bounds) {
      const next: string[] = [];
      for (const pin of catalogPinsRef.current) {
        if (!bounds.contains({ lat: pin.latitude, lng: pin.longitude })) continue;
        next.push(pin.id);
        if (next.length >= MAX_VISIBLE_LABELS) break;
      }
      setLabelIds((current) => (current.join('|') === next.join('|') ? current : next));
    }

    const nextBounds = bounds
      ? {
          south: bounds.getSouthWest().lat(),
          west: bounds.getSouthWest().lng(),
          north: bounds.getNorthEast().lat(),
          east: bounds.getNorthEast().lng(),
        }
      : null;
    setView((current) => {
      const sameZoom = Math.round(current.zoom) === Math.round(zoom);
      const sameBounds =
        current.bounds != null &&
        nextBounds != null &&
        current.bounds.south.toFixed(3) === nextBounds.south.toFixed(3) &&
        current.bounds.west.toFixed(3) === nextBounds.west.toFixed(3) &&
        current.bounds.north.toFixed(3) === nextBounds.north.toFixed(3) &&
        current.bounds.east.toFixed(3) === nextBounds.east.toFixed(3);
      if (sameZoom && (sameBounds || nextBounds == null)) return current;
      return { zoom, bounds: nextBounds };
    });
  }, []);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || typeof google === 'undefined') return;
    const pins = visitPinsRef.current;
    const bounds = new google.maps.LatLngBounds();
    if (pins.length > 0) {
      for (const pin of pins) bounds.extend({ lat: pin.latitude, lng: pin.longitude });
      mapInstance.fitBounds(bounds, 48);
      return;
    }
    const catalog = catalogPinsRef.current;
    if (catalog.length === 0) return;
    for (const pin of catalog) bounds.extend({ lat: pin.latitude, lng: pin.longitude });
    mapInstance.fitBounds(bounds, 64);
  }, [catalogFitKey, visitFitKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVisitId || focusNonce === 0) return;
    const pin = visitPinsRef.current.find((item) => item.visitId === selectedVisitId);
    if (!pin) return;
    map.panTo({ lat: pin.latitude, lng: pin.longitude });
    map.setZoom(FOCUS_ZOOM);
  }, [focusNonce, selectedVisitId]);

  const handleLoad = useCallback(
    (nextMap: google.maps.Map) => {
      mapRef.current = nextMap;
      setMap(nextMap);
      refreshView();
    },
    [refreshView],
  );

  const labeledPins = useMemo(() => {
    if (labelIds.length === 0) return [];
    const wanted = new Set(labelIds);
    return catalogPins.filter((pin) => wanted.has(pin.id));
  }, [catalogPins, labelIds]);

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
        mapTypeId={satellite ? DEFAULT_GOOGLE_MAP_TYPE_ID : 'roadmap'}
        onLoad={handleLoad}
        onIdle={refreshView}
        options={satellite ? HYBRID_OPTIONS : ROADMAP_OPTIONS}
      >
        {catalogPins.map((pin) => (
          <MarkerF
            key={pin.id}
            position={pin.position}
            icon={catalogIcon}
            clickable={false}
            zIndex={10}
          />
        ))}
        {labeledPins.map((pin) => (
          <OverlayViewF
            key={`label-${pin.id}`}
            position={pin.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative h-0 w-0 pointer-events-none">
              <div className="absolute left-3 top-[-10px] whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm">
                {pin.name} · {pin.code}
              </div>
            </div>
          </OverlayViewF>
        ))}
        {visitPins.map((pin) => {
          const selected = pin.visitId === selectedVisitId;
          return (
            <MarkerF
              key={pin.visitId}
              position={pin.position}
              icon={selected ? visitIcons?.selected : pin.enabled ? visitIcons?.enabled : visitIcons?.disabled}
              zIndex={selected ? 80 : pin.enabled ? 40 : 20}
              onClick={() => onSelectVisit(pin.visitId)}
            />
          );
        })}
      </GoogleMap>
      <GuideMapPathsLayer map={map} layers={pathLayers} />
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

export const DatasetProjectVisitImportMap = memo(DatasetProjectVisitImportMapView);
