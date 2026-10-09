import { CircleF, GoogleMap, OverlayView, OverlayViewF } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import type { CatalogPlaceType } from '../../features/dataset/labels';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';
import { DEFAULT_GOOGLE_MAP_TYPE_ID, useGoogleMapsLoader } from '../../lib/google-maps-loader';

const DEFAULT_CENTER = { lat: 47.8512, lng: 106.912 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAX_SINGLE_PLACE_ZOOM = 16;
const LABEL_MIN_ZOOM = 14;
const CARD_HEIGHT = 42;
const CARD_GAP = 10;
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

const PIN_COLOR: Record<CatalogPlaceType, string> = {
  LODGING: 'bg-emerald-600',
  EXPERIENCE: 'bg-sky-500',
  MEETING: 'bg-amber-500',
  GATE: 'bg-violet-500',
  AREA: 'bg-slate-500',
};

function haversineMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const earth = 6371000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

function regionCoverage(rows: CatalogPlaceRow[]): { center: { lat: number; lng: number }; radiusM: number } | null {
  const coords = rows.filter((row) => row.latitude != null && row.longitude != null);
  if (coords.length === 0) return null;
  const center = {
    lat: coords.reduce((sum, row) => sum + (row.latitude as number), 0) / coords.length,
    lng: coords.reduce((sum, row) => sum + (row.longitude as number), 0) / coords.length,
  };
  let radiusM = 6000;
  for (const row of coords) {
    radiusM = Math.max(radiusM, haversineMeters(center, { lat: row.latitude as number, lng: row.longitude as number }) * 1.35);
  }
  return { center, radiusM };
}

function fitMapToPlaces(map: google.maps.Map, rows: CatalogPlaceRow[]): void {
  const coords = rows.filter((row) => row.latitude != null && row.longitude != null);
  if (coords.length === 0 || typeof google === 'undefined') return;

  const bounds = new google.maps.LatLngBounds();
  for (const row of coords) {
    bounds.extend({ lat: row.latitude as number, lng: row.longitude as number });
  }
  map.fitBounds(bounds, coords.length === 1 ? 80 : 48);

  if (coords.length === 1) {
    google.maps.event.addListenerOnce(map, 'idle', () => {
      const zoom = map.getZoom();
      if (zoom != null && zoom > MAX_SINGLE_PLACE_ZOOM) {
        map.setZoom(MAX_SINGLE_PLACE_ZOOM);
      }
    });
  }
}

function estimateCardWidth(name: string, code: string): number {
  return Math.min(188, Math.max(96, Math.max(name.length, code.length) * 7.4 + 24));
}

function latLngToContainerPixel(map: google.maps.Map, lat: number, lng: number): { x: number; y: number } | null {
  const projection = map.getProjection();
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  if (!projection || !bounds || zoom == null) return null;
  const scale = 2 ** zoom;
  const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
  const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
  const point = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng));
  if (!topRight || !bottomLeft || !point) return null;
  return {
    x: (point.x - bottomLeft.x) * scale,
    y: (point.y - topRight.y) * scale,
  };
}

function rectsOverlap(
  left: { x: number; y: number; w: number; h: number },
  right: { x: number; y: number; w: number; h: number },
  pad = 8,
): boolean {
  return (
    left.x < right.x + right.w + pad &&
    left.x + left.w + pad > right.x &&
    left.y < right.y + right.h + pad &&
    left.y + left.h + pad > right.y
  );
}

function cardPlacements(width: number): Array<{ dx: number; dy: number }> {
  return [
    { dx: CARD_GAP + 6, dy: -CARD_HEIGHT / 2 },
    { dx: -CARD_GAP - 6 - width, dy: -CARD_HEIGHT / 2 },
    { dx: 8, dy: -CARD_GAP - 6 - CARD_HEIGHT },
    { dx: 8, dy: CARD_GAP + 6 },
  ];
}

function layoutPlaceCards(
  map: google.maps.Map,
  rows: CatalogPlaceRow[],
  selectedId: string | null,
): Record<string, { dx: number; dy: number }> {
  const items = rows
    .map((row) => {
      const pixel = latLngToContainerPixel(map, row.latitude as number, row.longitude as number);
      if (!pixel) return null;
      return { row, pixel, width: estimateCardWidth(row.name, row.code) };
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((left, right) => {
      if (left.row.id === selectedId) return -1;
      if (right.row.id === selectedId) return 1;
      return left.pixel.y - right.pixel.y || left.pixel.x - right.pixel.x;
    });

  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  const offsets: Record<string, { dx: number; dy: number }> = {};

  for (const item of items) {
    const options = cardPlacements(item.width);
    const fallback = options[0] ?? { dx: CARD_GAP + 6, dy: -CARD_HEIGHT / 2 };
    const chosen =
      options.find((option) => {
        const box = { x: item.pixel.x + option.dx, y: item.pixel.y + option.dy, w: item.width, h: CARD_HEIGHT };
        return !placed.some((other) => rectsOverlap(box, other));
      }) ?? fallback;
    placed.push({ x: item.pixel.x + chosen.dx, y: item.pixel.y + chosen.dy, w: item.width, h: CARD_HEIGHT });
    offsets[item.row.id] = chosen;
  }

  return offsets;
}

interface DatasetPlaceMapProps {
  places: CatalogPlaceRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  regionOverlay?: { name: string; code: string } | null;
  showPlaceMarkers?: boolean;
  fitToCollection?: boolean;
  fitNonce?: number;
}

export function DatasetPlaceMap({
  places,
  selectedId,
  onSelect,
  regionOverlay = null,
  showPlaceMarkers = true,
  fitToCollection = false,
  fitNonce = 0,
}: DatasetPlaceMapProps): JSX.Element {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<CatalogPlaceRow[]>([]);
  const selectedIdRef = useRef(selectedId);
  const [zoom, setZoom] = useState(10);
  const [cardOffsets, setCardOffsets] = useState<Record<string, { dx: number; dy: number }>>({});

  const markers = useMemo(
    () => places.filter((row) => row.latitude != null && row.longitude != null),
    [places],
  );
  markersRef.current = markers;
  selectedIdRef.current = selectedId;

  const refreshCardLayout = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextZoom = map.getZoom() ?? 10;
    setZoom(nextZoom);
    if (nextZoom < LABEL_MIN_ZOOM) {
      setCardOffsets({});
      return;
    }
    setCardOffsets(layoutPlaceCards(map, markersRef.current, selectedIdRef.current));
  }, []);

  const coverage = useMemo(() => (regionOverlay ? regionCoverage(markers) : null), [markers, regionOverlay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    fitMapToPlaces(map, markers);
  }, [fitNonce, fitToCollection, markers]);

  useEffect(() => {
    if (fitToCollection) return;
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const selected = markersRef.current.find((row) => row.id === selectedId);
    if (!selected) return;
    fitMapToPlaces(map, [selected]);
  }, [fitToCollection, selectedId]);

  useEffect(() => {
    refreshCardLayout();
  }, [markers, selectedId, refreshCardLayout]);

  const selectPlace = (row: CatalogPlaceRow) => {
    const map = mapRef.current;
    if (map && !fitToCollection) fitMapToPlaces(map, [row]);
    onSelect(row.id);
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#D9D2F8] bg-slate-50 px-4 text-center">
        <div>
          <p className="text-sm font-medium text-[#5B4BD6]">지도 미연동</p>
          <p className="mt-1 text-xs text-slate-500">VITE_GOOGLE_MAPS_API_KEY가 없어 플레이스홀더만 표시합니다.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <p className="grid h-full place-items-center text-sm text-rose-600">지도를 불러오지 못했습니다.</p>;
  }

  if (!isLoaded) {
    return <p className="grid h-full place-items-center text-sm text-slate-500">지도 로딩 중…</p>;
  }

  const showCards = zoom >= LABEL_MIN_ZOOM;

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={10}
      onLoad={(map) => {
        mapRef.current = map;
        if (!fitToCollection && selectedId) {
          fitMapToPlaces(map, markers.filter((row) => row.id === selectedId));
        } else {
          fitMapToPlaces(map, markers);
        }
      }}
      mapTypeId={DEFAULT_GOOGLE_MAP_TYPE_ID}
      onIdle={refreshCardLayout}
      options={{
        mapTypeId: DEFAULT_GOOGLE_MAP_TYPE_ID,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: MAP_STYLES,
      }}
    >
      {coverage ? (
        <CircleF
          center={coverage.center}
          radius={coverage.radiusM}
          options={{
            clickable: false,
            fillColor: '#E8D9A8',
            fillOpacity: 0.28,
            strokeColor: '#C9B57A',
            strokeOpacity: 0.7,
            strokeWeight: 1,
          }}
        />
      ) : null}
      {coverage && regionOverlay ? (
        <OverlayViewF position={coverage.center} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div className="relative h-0 w-0">
            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-[120%] whitespace-nowrap rounded-xl border border-amber-200 bg-[#FFF8E8] px-3 py-2 shadow-sm">
              <p className="text-xs font-semibold text-slate-800">
                {regionOverlay.name} · {regionOverlay.code}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">분류된 장소의 위치 표시 · 경계 미등록</p>
            </div>
          </div>
        </OverlayViewF>
      ) : null}
      {showPlaceMarkers
        ? markers.map((row) => {
            const selected = selectedId === row.id;
            const offset = cardOffsets[row.id] ?? { dx: CARD_GAP + 6, dy: -CARD_HEIGHT / 2 };
            return (
              <OverlayViewF
                key={row.id}
                position={{ lat: row.latitude as number, lng: row.longitude as number }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="relative h-0 w-0">
                  <button
                    type="button"
                    className={`absolute left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm ${PIN_COLOR[row.placeType]} ${
                      selected ? 'h-3.5 w-3.5 ring-2 ring-white ring-offset-2 ring-offset-emerald-700' : 'h-3 w-3'
                    }`}
                    onClick={() => selectPlace(row)}
                    aria-label={row.name}
                  />
                  {showCards ? (
                    <button
                      type="button"
                      className={`absolute z-20 whitespace-nowrap rounded-md border bg-white px-2 py-1 text-left shadow-sm ${
                        selected ? 'border-[#5B4BD6] ring-1 ring-[#5B4BD6]/20' : 'border-slate-200'
                      }`}
                      style={{ left: offset.dx, top: offset.dy }}
                      onClick={() => selectPlace(row)}
                    >
                      <span className="block text-[11px] font-medium leading-tight text-slate-800">{row.name}</span>
                      <span className="block text-[10px] leading-tight text-slate-400">{row.code}</span>
                    </button>
                  ) : null}
                </div>
              </OverlayViewF>
            );
          })
        : null}
    </GoogleMap>
  );
}
