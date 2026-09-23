import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useMemo, useRef } from 'react';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import { GOOGLE_MAPS_API_KEY } from '../../lib/google-maps-api-key';

const DEFAULT_CENTER = { lat: 47.8512, lng: 106.912 };
const CONTAINER_STYLE = { width: '100%', height: '100%' };

interface DatasetPlaceMapProps {
  places: CatalogPlaceRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DatasetPlaceMap({ places, selectedId, onSelect }: DatasetPlaceMapProps): JSX.Element {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'catalog-place-map',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });
  const mapRef = useRef<google.maps.Map | null>(null);

  const markers = useMemo(
    () => places.filter((row) => row.latitude != null && row.longitude != null),
    [places],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0 || typeof google === 'undefined') return;
    const bounds = new google.maps.LatLngBounds();
    for (const row of markers) {
      bounds.extend({ lat: row.latitude as number, lng: row.longitude as number });
    }
    map.fitBounds(bounds, 48);
  }, [markers]);

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

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={10}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {markers.map((row) => (
        <MarkerF
          key={row.id}
          position={{ lat: row.latitude as number, lng: row.longitude as number }}
          title={row.name}
          opacity={selectedId && selectedId !== row.id ? 0.55 : 1}
          onClick={() => onSelect(row.id)}
        />
      ))}
    </GoogleMap>
  );
}
