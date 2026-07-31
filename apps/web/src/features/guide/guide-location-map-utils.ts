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

export function getTodayInUlaanbaatarDateInputValue(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatGuideLocationMapDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) {
    return date;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

const ULAANBAATAR_PROJECT_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Ulaanbaatar',
  month: 'numeric',
  day: 'numeric',
});

export function formatUlaanbaatarProjectDate(iso: string): string {
  return ULAANBAATAR_PROJECT_DATE_FORMATTER.format(new Date(iso));
}

export function buildLocationProjectLabels(
  projectIds: string[],
  projects: Array<{
    id: string;
    name: string;
    startedAt: string;
    scheduledEndedAt: string;
    endedAt: string | null;
  }>,
): Array<{ projectId: string; label: string }> {
  return projects
    .filter((project) => projectIds.includes(project.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    .map((project) => {
      const start = formatUlaanbaatarProjectDate(project.startedAt);
      const end = formatUlaanbaatarProjectDate(project.endedAt ?? project.scheduledEndedAt);
      return {
        projectId: project.id,
        label: `${project.name} · ${start} ~ ${end}`,
      };
    });
}

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

export function simplifyGuideMapPath(path: GuideMapLatLng[], maxPoints = 500): GuideMapLatLng[] {
  if (path.length <= maxPoints) {
    return path;
  }

  const step = Math.ceil(path.length / maxPoints);
  const simplified: GuideMapLatLng[] = [];
  for (let index = 0; index < path.length; index += step) {
    simplified.push(path[index]!);
  }

  const lastPoint = path[path.length - 1];
  const tail = simplified[simplified.length - 1];
  if (lastPoint && (tail?.lat !== lastPoint.lat || tail?.lng !== lastPoint.lng)) {
    simplified.push(lastPoint);
  }

  return simplified;
}

export function buildGuideMapPathLayerKey(
  layers: Array<{
    guideId: string;
    path: GuideMapLatLng[];
    color: string;
    focused: boolean;
    dimmed: boolean;
  }>,
): string {
  return layers
    .map((layer) => {
      const path = simplifyGuideMapPath(layer.path)
        .map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`)
        .join(';');
      return `${layer.guideId}:${layer.color}:${layer.focused ? 1 : 0}:${layer.dimmed ? 1 : 0}:${path}`;
    })
    .join('|');
}

export function buildGuidePathPolylineOptions(layer: {
  color: string;
  focused: boolean;
  dimmed: boolean;
}): google.maps.PolylineOptions {
  const strokeColor = layer.dimmed ? '#94a3b8' : layer.color;
  const arrowColor = layer.dimmed ? '#94a3b8' : darkenGuidePathColor(layer.color, 0.22);
  const strokeOpacity = layer.focused ? 0.95 : layer.dimmed ? 0.18 : 0.72;
  const arrowOpacity = layer.focused ? 0.88 : layer.dimmed ? 0.18 : 0.82;
  const strokeWeight = layer.focused ? 5 : layer.dimmed ? 3 : 4;

  return {
    strokeColor,
    strokeOpacity,
    strokeWeight,
    zIndex: layer.focused ? 2 : layer.dimmed ? 0 : 1,
    icons: [
      {
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: layer.focused ? 2.8 : layer.dimmed ? 2 : 2.4,
          strokeColor: arrowColor,
          strokeOpacity: arrowOpacity,
          fillColor: arrowColor,
          fillOpacity: arrowOpacity,
        },
        offset: '24px',
        repeat: layer.focused ? '72px' : layer.dimmed ? '120px' : '96px',
      },
    ],
  };
}

function darkenGuidePathColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const channels = [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
  const factor = 1 - amount;

  return `#${channels
    .map((channel) => Math.max(0, Math.round(channel * factor)).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function buildGuideMarkerIcon(
  profileImageUrl: string | null,
  nameKo: string,
  accentColor: string,
  focused: boolean,
  dimmed = false,
): google.maps.Icon {
  const size = focused ? 48 : dimmed ? 34 : 42;
  const fill = dimmed ? '#94a3b8' : accentColor;
  const opacity = dimmed ? 0.45 : 1;

  if (profileImageUrl && !dimmed) {
    return {
      url: profileImageUrl,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    };
  }

  const initial = nameKo.trim().slice(0, 1) || '?';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
      <g opacity="${opacity}">
        <circle cx="24" cy="24" r="22" fill="${fill}" stroke="#ffffff" stroke-width="3"/>
        <text x="24" y="24" text-anchor="middle" dominant-baseline="central"
          fill="#ffffff" font-size="18" font-family="Pretendard, sans-serif" font-weight="700">${initial}</text>
      </g>
    </svg>
  `.trim();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

export function buildPlaceVisitMarkerIcon(selected: boolean): google.maps.Icon {
  const size = selected ? 38 : 34;
  const fill = selected ? '#c2410c' : '#ea580c';
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

export function formatVisitDuration(durationMs: number): string {
  const totalMinutes = Math.max(1, Math.round(durationMs / 60_000));
  if (totalMinutes < 60) {
    return `${totalMinutes}분`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}

const PLACE_VISIT_PIN_TYPE_LABELS: Record<string, string> = {
  meal: '식사',
  attraction: '관광',
  lodging: '숙소',
  transport: '이동',
  shopping: '쇼핑',
  other: '기타',
};

export function formatPlaceVisitPinTypeLabel(pinType: string | null): string | null {
  if (!pinType?.trim()) {
    return null;
  }

  const normalized = pinType.trim().toLowerCase();
  return PLACE_VISIT_PIN_TYPE_LABELS[normalized] ?? pinType.trim();
}

const ULAANBAATAR_DAY_MS = 24 * 60 * 60 * 1000;

export interface GuideProjectDayOption {
  date: string;
  dayLabel: string;
  fullLabel: string;
  pointCount: number;
}

export function toUlaanbaatarDateInputValue(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function addDaysToDateInputValue(date: string, days: number): string {
  const startMs = Date.parse(`${date}T00:00:00+08:00`);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startMs + days * ULAANBAATAR_DAY_MS));
}

export function getUlaanbaatarDayBoundsMs(date: string): { startMs: number; endMs: number } {
  const startMs = Date.parse(`${date}T00:00:00+08:00`);
  return { startMs, endMs: startMs + ULAANBAATAR_DAY_MS - 1 };
}

export function buildGuidePathDayOptions<
  T extends { recordedAt: string; projectId?: string },
>(path: T[], projectIds?: string[]): GuideProjectDayOption[] {
  const counts = new Map<string, number>();

  for (const point of path) {
    if (projectIds?.length && point.projectId && !projectIds.includes(point.projectId)) {
      continue;
    }
    const date = toUlaanbaatarDateInputValue(point.recordedAt);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, pointCount]) => ({
      date,
      dayLabel: String(Number(date.split('-')[2])),
      fullLabel: formatUlaanbaatarProjectDate(new Date(`${date}T12:00:00+08:00`).toISOString()),
      pointCount,
    }));
}

export function formatGuidePathTimeRangeLabel(timeRangeMinutes: [number, number]): string {
  return `${formatMinutesAsUlaanbaatarTime(timeRangeMinutes[0])} ~ ${formatMinutesAsUlaanbaatarTime(timeRangeMinutes[1])}`;
}

export function formatMinutesAsUlaanbaatarTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  if (clamped >= 24 * 60) {
    return '24:00';
  }
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function resolveGuidePathTimeRangeMs(
  dayDate: string | null,
  timeRangeMinutes: [number, number],
): { startMs: number; endMs: number } | null {
  if (!dayDate) {
    return null;
  }

  const { startMs: dayStartMs } = getUlaanbaatarDayBoundsMs(dayDate);
  const [startMinutes, endMinutes] = timeRangeMinutes;
  const startMs = dayStartMs + startMinutes * 60_000;
  const endMs =
    endMinutes >= 24 * 60
      ? dayStartMs + ULAANBAATAR_DAY_MS - 1
      : dayStartMs + endMinutes * 60_000;

  return { startMs, endMs: Math.max(startMs, endMs) };
}

export function filterGuidePathByTimeRange<
  T extends { recordedAt: string; latitude: number; longitude: number; accuracy: number },
>(
  path: T[],
  dayDate: string | null,
  timeRangeMinutes: [number, number],
): T[] {
  const range = resolveGuidePathTimeRangeMs(dayDate, timeRangeMinutes);
  if (!range) {
    return path;
  }

  return path.filter((point) => {
    const recordedAtMs = new Date(point.recordedAt).getTime();
    return recordedAtMs >= range.startMs && recordedAtMs <= range.endMs;
  });
}

export function filterPlaceVisitsByTimeRange<
  T extends { startedAt: string; endedAt: string },
>(visits: T[], dayDate: string | null, timeRangeMinutes: [number, number]): T[] {
  const range = resolveGuidePathTimeRangeMs(dayDate, timeRangeMinutes);
  if (!range) {
    return visits;
  }

  return visits.filter((visit) => {
    const startedAtMs = new Date(visit.startedAt).getTime();
    const endedAtMs = new Date(visit.endedAt).getTime();
    return startedAtMs <= range.endMs && endedAtMs >= range.startMs;
  });
}

export function applyGuidePathTimeFilter<T extends {
  latestLatitude: number;
  latestLongitude: number;
  latestAccuracy: number;
  latestRecordedAt: string;
  path: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    recordedAt: string;
    projectId: string;
  }>;
}>(
  location: T,
  dayDate: string | null,
  timeRangeMinutes: [number, number],
): T {
  const filteredPath = filterGuidePathByTimeRange(location.path, dayDate, timeRangeMinutes);
  const latestPoint = filteredPath[filteredPath.length - 1];

  if (!latestPoint) {
    return {
      ...location,
      path: filteredPath,
    };
  }

  return {
    ...location,
    path: filteredPath,
    latestLatitude: latestPoint.latitude,
    latestLongitude: latestPoint.longitude,
    latestAccuracy: latestPoint.accuracy,
    latestRecordedAt: latestPoint.recordedAt,
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
