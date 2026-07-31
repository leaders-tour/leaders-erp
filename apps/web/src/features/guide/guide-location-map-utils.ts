const GUIDE_PATH_COLORS = [
  '#4f46e5',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#be185d',
  '#65a30d',
] as const;

export type GuideMapLatLng = { lat: number; lng: number };

export function getGuidePathColor(index: number): string {
  return GUIDE_PATH_COLORS[index % GUIDE_PATH_COLORS.length] ?? '#4f46e5';
}

export function normalizeGuideMapPath(
  path: Array<{ latitude: number; longitude: number }> | null | undefined,
): GuideMapLatLng[] {
  if (!path?.length) {
    return [];
  }

  return path
    .filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    )
    .map((point) => ({ lat: point.latitude, lng: point.longitude }));
}

export function canDrawGuidePath(path: GuideMapLatLng[]): boolean {
  return path.length >= 2;
}

export function buildGuideMarkerIcon(
  profileImageUrl: string | null,
  nameKo: string,
  accentColor: string,
  focused: boolean,
): google.maps.Icon {
  const size = focused ? 48 : 42;

  if (profileImageUrl) {
    return {
      url: profileImageUrl,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    };
  }

  const initial = nameKo.trim().slice(0, 1) || '?';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="${accentColor}" stroke="#ffffff" stroke-width="3"/>
      <text x="24" y="24" text-anchor="middle" dominant-baseline="central"
        fill="#ffffff" font-size="18" font-family="Pretendard, sans-serif" font-weight="700">${initial}</text>
    </svg>
  `.trim();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

export function collectMapBounds(locations: Array<{ path: Array<{ latitude: number; longitude: number }> }>) {
  const bounds = new google.maps.LatLngBounds();
  let hasPoint = false;

  for (const location of locations) {
    for (const point of location.path) {
      bounds.extend({ lat: point.latitude, lng: point.longitude });
      hasPoint = true;
    }
  }

  return hasPoint ? bounds : null;
}
