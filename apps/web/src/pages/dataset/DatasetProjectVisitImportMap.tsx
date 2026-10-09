import { GoogleMap, MarkerF, OverlayView, OverlayViewF, useGoogleMap } from '@react-google-maps/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import type { ProjectVisitImportRow } from '../../features/dataset/project-visit-import';
import {
  canDrawGuidePath,
  getGuidePathColor,
  normalizeGuideMapPath,
  simplifyGuideMapPath,
  type GuideMapLatLng,
} from '../../features/guide/guide-location-map-utils';
import type { GuideLiveLocationRow } from '../../features/guide/hooks';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';
import { useGoogleMapsLoader } from '../../lib/google-maps-loader';

const DEFAULT_CENTER = { lat: 47.8512, lng: 106.912 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };
const FOCUS_ZOOM = 16;

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

function createImportMapPathOverlay(path: GuideMapLatLng[], color: string): google.maps.OverlayView {
  class ImportMapPathOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;

    onAdd() {
      this.div = document.createElement('div');
      this.div.style.position = 'absolute';
      this.div.style.pointerEvents = 'none';
      this.getPanes()?.overlayLayer.appendChild(this.div);
    }

    draw() {
      const projection = this.getProjection();
      const map = this.getMap();
      const div = this.div;
      if (!(map instanceof google.maps.Map)) return;
      const bounds = map.getBounds();
      if (!projection || !div || !bounds) return;

      const southWest = projection.fromLatLngToDivPixel(bounds.getSouthWest());
      const northEast = projection.fromLatLngToDivPixel(bounds.getNorthEast());
      if (!southWest || !northEast) return;

      const left = Math.min(southWest.x, northEast.x);
      const top = Math.min(southWest.y, northEast.y);
      const width = Math.max(1, Math.abs(northEast.x - southWest.x));
      const height = Math.max(1, Math.abs(northEast.y - southWest.y));
      const d = path
        .map((point, index) => {
          const pixel = projection.fromLatLngToDivPixel(new google.maps.LatLng(point.lat, point.lng));
          if (!pixel) return '';
          return `${index === 0 ? 'M' : 'L'}${(pixel.x - left).toFixed(1)},${(pixel.y - top).toFixed(1)}`;
        })
        .join(' ');

      div.style.left = `${left}px`;
      div.style.top = `${top}px`;
      div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-opacity="0.92" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }
  }

  return new ImportMapPathOverlay();
}

function MapInstanceBinder({
  mapRef,
}: {
  mapRef: { current: google.maps.Map | null };
}): null {
  const map = useGoogleMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function ImportMapPathsLayer({
  layers,
}: {
  layers: Array<{ guideId: string; path: GuideMapLatLng[]; color: string }>;
}): null {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map) return;
    const overlays = layers
      .filter((layer) => canDrawGuidePath(layer.path))
      .map((layer) => {
        const overlay = createImportMapPathOverlay(layer.path, layer.color);
        overlay.setMap(map);
        return overlay;
      });
    return () => {
      for (const overlay of overlays) {
        overlay.setMap(null);
      }
    };
  }, [layers, map]);

  return null;
}

interface DatasetProjectVisitImportMapProps {
  rows: ProjectVisitImportRow[];
  catalogPlaces: CatalogPlaceRow[];
  locations?: GuideLiveLocationRow[];
  selectedVisitId: string | null;
  focusNonce?: number;
  onSelectVisit: (visitId: string) => void;
}

export function DatasetProjectVisitImportMap({
  rows,
  catalogPlaces,
  locations = [],
  selectedVisitId,
  focusNonce = 0,
  onSelectVisit,
}: DatasetProjectVisitImportMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [satellite, setSatellite] = useState(false);

  const pathLayers = useMemo(
    () =>
      locations.map((location, index) => ({
        guideId: location.guideId,
        path: simplifyGuideMapPath(normalizeGuideMapPath(location.path)),
        color: getGuidePathColor(index),
      })),
    [locations],
  );

  const relatedMarkers = useMemo(
    () => catalogPlaces.filter((row) => row.latitude != null && row.longitude != null),
    [catalogPlaces],
  );

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || typeof google === 'undefined') return;
    const bounds = new google.maps.LatLngBounds();
    let hasPoint = false;
    for (const row of rows) {
      bounds.extend({ lat: row.latitude, lng: row.longitude });
      hasPoint = true;
    }
    if (hasPoint) {
      mapInstance.fitBounds(bounds, 48);
      return;
    }
    if (relatedMarkers.length === 0) return;
    for (const row of relatedMarkers) {
      bounds.extend({ lat: row.latitude as number, lng: row.longitude as number });
    }
    mapInstance.fitBounds(bounds, 64);
  }, [relatedMarkers, rows]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVisitId || focusNonce === 0) return;
    const row = rowsRef.current.find((item) => item.visitId === selectedVisitId);
    if (!row) return;
    map.panTo({ lat: row.latitude, lng: row.longitude });
    map.setZoom(FOCUS_ZOOM);
  }, [focusNonce, selectedVisitId]);

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
        onLoad={(nextMap) => {
          mapRef.current = nextMap;
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
        <MapInstanceBinder mapRef={mapRef} />
        <ImportMapPathsLayer layers={pathLayers} />
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
