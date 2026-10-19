import { catalogRouteDisplayStats, catalogRoutePlannedStats } from '@tour/domain';
import { Input, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useCatalogRoute,
  useCatalogRouteObservations,
  useCatalogRoutes,
  useUpdateCatalogRoute,
  useUpdateCatalogRouteObservation,
  type CatalogRouteObservationRow,
} from '../../features/dataset/hooks';
import {
  DatasetPageFooter,
  ROUTE_ESTIMATE_MODE_LABEL,
  ROUTE_OBSERVATION_STATUS_LABEL,
  catalogRouteMeasureLabel,
  catalogRoutePlannedSummary,
  formatCatalogRouteKm,
  formatCatalogRouteMinutes,
  routeObservationHoldReasonLabel,
  type CatalogRouteEstimateMode,
  type CatalogUsageStatus,
} from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import {
  DatasetButton,
  DatasetCard,
  DatasetField,
  DatasetPageHeader,
  DatasetPageShell,
  datasetControlClass,
} from '../../features/dataset/ui';
import { DatasetRouteObservationsMap, type RouteObservationMapFocus } from './DatasetRouteObservationsMap';

const TIME_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Ulaanbaatar',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatElapsed(ms: number): string {
  return formatCatalogRouteMinutes(ms / 60_000);
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function hoursToInput(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  return String(value);
}

export function DatasetRouteDetailPage(): JSX.Element {
  const { routeId } = useParams<{ routeId: string }>();
  const routeQuery = useCatalogRoute(routeId);
  const routesQuery = useCatalogRoutes();
  const observationsQuery = useCatalogRouteObservations({ routeId: routeId ?? null });
  const [updateRoute, updateRouteState] = useUpdateCatalogRoute();
  const [updateObservation, updateObservationState] = useUpdateCatalogRouteObservation();

  const route = routeQuery.data?.catalogRoute ?? null;
  const observations = observationsQuery.data?.catalogRouteObservations ?? [];
  const routes = routesQuery.data?.catalogRoutes ?? [];

  const reverseRoute = useMemo(() => {
    if (!route) return null;
    return (
      routes.find((row) => row.fromPlaceId === route.toPlaceId && row.toPlaceId === route.fromPlaceId && row.id !== route.id) ??
      null
    );
  }, [route, routes]);

  const [name, setName] = useState('');
  const [status, setStatus] = useState<CatalogUsageStatus>('ACTIVE');
  const [estimateMode, setEstimateMode] = useState<CatalogRouteEstimateMode>('AUTO');
  const [bufferMinutes, setBufferMinutes] = useState('0');
  const [manualKm, setManualKm] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [focus, setFocus] = useState<RouteObservationMapFocus>('fit-route');
  const [focusNonce, setFocusNonce] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!route) return;
    setName(route.name);
    setStatus(route.status);
    setEstimateMode(route.estimateMode);
    setBufferMinutes(String(route.bufferMinutes ?? 0));
    setManualKm(route.averageDistanceKm != null ? String(route.averageDistanceKm) : '');
    setManualHours(hoursToInput(route.averageTravelHours));
  }, [
    route?.id,
    route?.name,
    route?.status,
    route?.estimateMode,
    route?.bufferMinutes,
    route?.averageDistanceKm,
    route?.averageTravelHours,
  ]);

  const selectedObservation =
    observations.find((row) => row.id === selectedObservationId) ?? observations[0] ?? null;

  const mapRows = useMemo(
    () =>
      observations.map((row) => ({
        id: row.id,
        status: row.status,
        path: row.path.map((point) => ({ lat: point.lat, lng: point.lng })),
      })),
    [observations],
  );

  const draftBuffer = Math.max(0, Math.round(Number(bufferMinutes) || 0));
  const planned = catalogRoutePlannedStats({
    estimateMode,
    bufferMinutes: draftBuffer,
    medianDistanceKm: route?.medianDistanceKm,
    medianElapsedMinutes: route?.medianElapsedMinutes,
    averageDistanceKm: parseOptionalNumber(manualKm),
    averageTravelHours: parseOptionalNumber(manualHours),
  });
  const observed = route ? catalogRouteDisplayStats(route) : null;
  const plannedSummary = catalogRoutePlannedSummary({
    estimateMode,
    bufferMinutes: draftBuffer,
    medianDistanceKm: route?.medianDistanceKm,
    medianElapsedMinutes: route?.medianElapsedMinutes,
    averageDistanceKm: parseOptionalNumber(manualKm),
    averageTravelHours: parseOptionalNumber(manualHours),
  });

  const handleSelectObservation = (id: string) => {
    setSelectedObservationId(id);
    setFocus('zoom-obs');
    setFocusNonce((value) => value + 1);
  };

  const handleSaveRoute = async () => {
    if (!route) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('경로명을 입력하세요.');
      return;
    }
    setErrorMessage(null);
    setSaveMessage(null);
    try {
      await updateRoute({
        variables: {
          id: route.id,
          input: {
            name: trimmed,
            status,
            estimateMode,
            bufferMinutes: draftBuffer,
            averageDistanceKm: parseOptionalNumber(manualKm),
            averageTravelHours: parseOptionalNumber(manualHours),
          },
        },
      });
      await routeQuery.refetch();
      setSaveMessage('경로 예상값 규칙을 저장했습니다. 기존 일정·발행본은 바꾸지 않았습니다.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  };

  const handleToggleInclude = async (
    row: CatalogRouteObservationRow,
    field: 'includeElapsed' | 'includeDistance',
    value: boolean,
  ) => {
    if (row.status !== 'AUTO') return;
    setErrorMessage(null);
    try {
      await updateObservation({
        variables: { id: row.id, input: { [field]: value } },
      });
      await Promise.all([observationsQuery.refetch(), routeQuery.refetch()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '집계 조정에 실패했습니다.');
    }
  };

  if (routeQuery.loading && !route) {
    return (
      <DatasetPageShell>
        <p className="text-sm text-slate-500">경로를 불러오는 중…</p>
      </DatasetPageShell>
    );
  }

  if (!route) {
    return (
      <DatasetPageShell>
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로 / 경로 상세"
          title="경로를 찾을 수 없습니다"
          description="목록에서 경로를 다시 선택하세요."
          actions={
            <Link className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`} to="/dataset/places?tab=routes">
              경로 목록
            </Link>
          }
        />
      </DatasetPageShell>
    );
  }

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로 / 경로 확인·보완"
          title={`${route.fromPlace.name} → ${route.toPlace.name}`}
          description="자동으로 쌓인 이동을 확인하고, 집계 포함과 새 일정의 예상값 규칙만 나눠 저장합니다. 원시 GPS와 기존 일정 적용값은 바꾸지 않습니다."
          actions={
            <>
              <Link
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`}
                to="/dataset/places?tab=routes"
              >
                경로 목록
              </Link>
              <Link
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`}
                to={`/dataset/places/route-observations?routeId=${route.id}`}
              >
                같은 구간 비교
              </Link>
            </>
          }
        />

        <p className="text-xs text-[#8B83B8]">
          {route.code}
          {route.region ? ` · ${route.region.name}` : ''}
          {' · '}표본 {route.usableCount}/{route.observationCount}
          {reverseRoute ? (
            <>
              {' · '}
              <Link className="underline" to={`/dataset/places/routes/${reverseRoute.id}`}>
                반대방향 {reverseRoute.fromPlace.name} → {reverseRoute.toPlace.name}
              </Link>
            </>
          ) : (
            ' · 우회 경로 분리는 아직 없습니다'
          )}
        </p>

        {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        {saveMessage ? <p className="text-sm text-slate-600">{saveMessage}</p> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
          <DatasetCard className="h-[420px] overflow-hidden p-0">
            <DatasetRouteObservationsMap
              observations={mapRows}
              selectedObservationId={selectedObservation?.id ?? null}
              focus={focus}
              focusNonce={focusNonce}
              onSelectObservation={handleSelectObservation}
            />
          </DatasetCard>

          <DatasetCard className="grid gap-4 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">새 일정 예상값</h2>
              <p className="mt-1 text-xs text-[#8B83B8]">경로 설정 저장은 여유시간·출처 규칙만 바꿉니다. 아래 기록의 집계 포함은 따로 저장됩니다.</p>
            </div>
            <DatasetField label="경로명">
              <Input className={datasetControlClass} value={name} onChange={(event) => setName(event.target.value)} />
            </DatasetField>
            <DatasetField label="사용 상태">
              <select
                className={datasetControlClass}
                value={status}
                onChange={(event) => setStatus(event.target.value as CatalogUsageStatus)}
              >
                <option value="ACTIVE">사용 중</option>
                <option value="INACTIVE">사용 안 함</option>
              </select>
            </DatasetField>
            <DatasetField label="값 선택 방식">
              <select
                className={datasetControlClass}
                value={estimateMode}
                onChange={(event) => setEstimateMode(event.target.value as CatalogRouteEstimateMode)}
              >
                <option value="AUTO">{ROUTE_ESTIMATE_MODE_LABEL.AUTO}</option>
                <option value="MANUAL">{ROUTE_ESTIMATE_MODE_LABEL.MANUAL}</option>
              </select>
            </DatasetField>
            <DatasetField label="여유시간(분)">
              <Input
                className={datasetControlClass}
                value={bufferMinutes}
                onChange={(event) => setBufferMinutes(event.target.value)}
                inputMode="numeric"
              />
            </DatasetField>
            {estimateMode === 'MANUAL' ? (
              <div className="grid grid-cols-2 gap-3">
                <DatasetField label="수동 거리(km)">
                  <Input className={datasetControlClass} value={manualKm} onChange={(event) => setManualKm(event.target.value)} />
                </DatasetField>
                <DatasetField label="수동 시간(시간)">
                  <Input className={datasetControlClass} value={manualHours} onChange={(event) => setManualHours(event.target.value)} />
                </DatasetField>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                실측 {formatCatalogRouteKm(observed?.distanceKm ?? null)} · {formatCatalogRouteMinutes(observed?.elapsedMinutes ?? null)}
                {observed?.elapsedSource ? ` (${catalogRouteMeasureLabel(observed.elapsedSource)})` : ''}
              </p>
            )}
            <div className={`rounded-xl px-3 py-2.5 text-sm ${datasetTheme.badgeSoft}`}>
              <p className="font-medium text-slate-900">계산 결과 {plannedSummary.primary}</p>
              <p className="mt-0.5 text-xs text-[#8B83B8]">{plannedSummary.detail}</p>
              {planned.baseElapsedMinutes != null && planned.bufferMinutes > 0 ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatCatalogRouteMinutes(planned.baseElapsedMinutes)} + {planned.bufferMinutes}분 ={' '}
                  {formatCatalogRouteMinutes(planned.elapsedMinutes)}
                </p>
              ) : null}
            </div>
            <DatasetButton
              type="button"
              variant="primary"
              disabled={updateRouteState.loading}
              onClick={() => void handleSaveRoute()}
            >
              {updateRouteState.loading ? '저장 중…' : '경로 설정 저장'}
            </DatasetButton>
            <p className="text-xs text-[#8B83B8]">정차 분류, 기록 재생, 반대방향·Google 추정은 이 화면에 아직 없습니다.</p>
          </DatasetCard>
        </div>

        {selectedObservation ? <SelectedObservationCard row={selectedObservation} /> : null}

        <DatasetCard>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">집계 대상 기록</h2>
            <p className="mt-1 text-xs text-[#8B83B8]">
              거리·경과 포함을 끄면 해당 항목만 중앙값에서 빠집니다. 원시 기록은 유지되고, 이후 재분석에서도 이 조정을 덮어쓰지 않습니다.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>시각</Th>
                  <Th>경과</Th>
                  <Th>거리</Th>
                  <Th>경과 포함</Th>
                  <Th>거리 포함</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody>
                {observations.map((row) => (
                  <ObservationRow
                    key={row.id}
                    row={row}
                    selected={row.id === selectedObservation?.id}
                    disabled={row.status !== 'AUTO' || updateObservationState.loading}
                    onSelect={() => handleSelectObservation(row.id)}
                    onToggleElapsed={(value) => void handleToggleInclude(row, 'includeElapsed', value)}
                    onToggleDistance={(value) => void handleToggleInclude(row, 'includeDistance', value)}
                  />
                ))}
                {observations.length === 0 && !observationsQuery.loading ? (
                  <tr>
                    <Td colSpan={6} className="text-sm text-slate-500">
                      이 경로에 붙은 이동이 없습니다. 방문 연결 후 경로 분석에서 모읍니다.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </DatasetCard>

        <DatasetPageFooter screenId="T01-06 · 경로 확인·보완 상세" />
      </section>
    </DatasetPageShell>
  );
}

function SelectedObservationCard({ row }: { row: CatalogRouteObservationRow }): JSX.Element {
  return (
    <DatasetCard className="grid gap-1 px-4 py-3 text-sm">
      <p className="text-xs font-medium text-[#8B83B8]">선택 기록</p>
      <p className="font-medium text-slate-900">
        {row.fromPlace.name} → {row.toPlace.name}
      </p>
      <p className="text-xs text-slate-600">
        {TIME_FORMAT.format(new Date(row.departedAt))} ~ {TIME_FORMAT.format(new Date(row.arrivedAt))} · 경과{' '}
        {formatElapsed(row.elapsedMs)} · 거리 {formatCatalogRouteKm(row.distanceKm)}
        {row.maxGapMinutes > 0 ? ` · 공백 ${row.maxGapMinutes}분` : ''}
      </p>
      <p className="text-xs text-slate-500">
        {ROUTE_OBSERVATION_STATUS_LABEL[row.status]}
        {row.status === 'HOLD' ? ` · ${routeObservationHoldReasonLabel(row.status, row.holdReason)}` : ''}
        {row.manualIncludeOverride ? ' · 집계 수동 조정' : ''}
      </p>
    </DatasetCard>
  );
}

function ObservationRow({
  row,
  selected,
  disabled,
  onSelect,
  onToggleElapsed,
  onToggleDistance,
}: {
  row: CatalogRouteObservationRow;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggleElapsed: (value: boolean) => void;
  onToggleDistance: (value: boolean) => void;
}): JSX.Element {
  return (
    <tr className={selected ? 'bg-[#F3F0FF]' : 'cursor-pointer hover:bg-slate-50'} onClick={onSelect}>
      <Td className="whitespace-nowrap text-xs">{TIME_FORMAT.format(new Date(row.departedAt))}</Td>
      <Td className="text-xs">{formatElapsed(row.elapsedMs)}</Td>
      <Td className="text-xs">{formatCatalogRouteKm(row.distanceKm)}</Td>
      <Td className="text-xs">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#6D5BD0]"
          checked={row.includeElapsed}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onToggleElapsed(event.target.checked)}
        />
      </Td>
      <Td className="text-xs">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#6D5BD0]"
          checked={row.includeDistance}
          disabled={disabled || row.distanceKm == null}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onToggleDistance(event.target.checked)}
        />
      </Td>
      <Td className="text-xs">
        {ROUTE_OBSERVATION_STATUS_LABEL[row.status]}
        {row.manualIncludeOverride ? ' · 조정' : ''}
      </Td>
    </tr>
  );
}
