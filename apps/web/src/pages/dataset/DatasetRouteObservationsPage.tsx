import { catalogRouteDisplayStats, visitRegionFromCatalogName } from '@tour/domain';
import { Table, Td, Th } from '@tour/ui';
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  useAnalyzeCatalogRouteObservations,
  useCatalogRegions,
  useCatalogRouteObservations,
  useCatalogRoutes,
  type CatalogRouteObservationAnalyzeResult,
  type CatalogRouteObservationRow,
  type CatalogRouteRow,
} from '../../features/dataset/hooks';
import {
  DatasetPageFooter,
  ROUTE_OBSERVATION_STATUS_LABEL,
  catalogRouteMeasureSummary,
  formatCatalogRouteKm,
  formatCatalogRouteMinutes,
  routeObservationHoldReasonLabel,
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

export function DatasetRouteObservationsPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [regionId, setRegionId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(() => searchParams.get('routeId'));
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [focus, setFocus] = useState<RouteObservationMapFocus>('fit-all');
  const [focusNonce, setFocusNonce] = useState(0);
  const [analyzeResult, setAnalyzeResult] = useState<CatalogRouteObservationAnalyzeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const regionsQuery = useCatalogRegions();
  const routesQuery = useCatalogRoutes();
  const regions = regionsQuery.data?.catalogRegions ?? [];
  const routes = routesQuery.data?.catalogRoutes ?? [];
  const resolvedRegionId = regionId || regions.find((row) => row.name === '중부')?.id || regions[0]?.id || '';
  const selectedRegion = regions.find((row) => row.id === resolvedRegionId) ?? null;
  const selectedRegionName = selectedRegion?.name ?? '이 지역';
  const visitRegion = selectedRegion ? visitRegionFromCatalogName(selectedRegion.name) : null;

  const observationsQuery = useCatalogRouteObservations({
    regionId: resolvedRegionId || null,
  });
  const [analyzeObservations, analyzeState] = useAnalyzeCatalogRouteObservations();

  const observations = observationsQuery.data?.catalogRouteObservations ?? [];
  const regionRoutes = useMemo(
    () =>
      routes.filter(
        (route) =>
          route.region?.id === resolvedRegionId ||
          observations.some((row) => row.routeId === route.id),
      ),
    [observations, resolvedRegionId, routes],
  );
  const selectedRoute = regionRoutes.find((route) => route.id === selectedRouteId) ?? null;
  const visibleObservations = selectedRoute
    ? observations.filter((row) => row.routeId === selectedRoute.id)
    : observations;
  const selectedObservation =
    visibleObservations.find((row) => row.id === selectedObservationId) ?? visibleObservations[0] ?? null;

  const mapRows = useMemo(
    () =>
      visibleObservations.map((row) => ({
        id: row.id,
        status: row.status,
        path: row.path.map((point) => ({ lat: point.lat, lng: point.lng })),
      })),
    [visibleObservations],
  );

  const handleAnalyze = useCallback(async () => {
    if (!visitRegion) {
      setErrorMessage('이 지역은 GPS 방문 권역이 없어 분석할 수 없습니다.');
      return;
    }
    setErrorMessage(null);
    try {
      const result = await analyzeObservations({ variables: { input: { visitRegion } } });
      setAnalyzeResult(result.data?.analyzeCatalogRouteObservations ?? null);
      await Promise.all([observationsQuery.refetch(), routesQuery.refetch()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '분석에 실패했습니다.');
    }
  }, [analyzeObservations, observationsQuery, routesQuery, visitRegion]);

  const handleSelectRoute = (route: CatalogRouteRow) => {
    setSelectedRouteId(route.id);
    setSelectedObservationId(null);
    setFocus('fit-route');
    setFocusNonce((value) => value + 1);
  };

  const handleSelectObservation = (id: string) => {
    const row = observations.find((item) => item.id === id);
    if (row?.routeId) setSelectedRouteId(row.routeId);
    setSelectedObservationId(id);
    setFocus('zoom-obs');
    setFocusNonce((value) => value + 1);
  };

  const handleClearRoute = () => {
    setSelectedRouteId(null);
    setSelectedObservationId(null);
    setFocus('fit-all');
    setFocusNonce((value) => value + 1);
  };

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로 / 경로 분석"
          title="경로 분석"
          description="확정된 방문 사이 이동 1회를 모읍니다. 같은 출발→도착은 경로 하나에 붙고, 경로 목록의 거리·시간은 실측 중앙값을 우선합니다."
          actions={
            <>
              <Link
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`}
                to="/dataset/places"
              >
                장소 목록
              </Link>
              <Link
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`}
                to="/dataset/places/visit-links"
              >
                방문 연결
              </Link>
              <DatasetButton type="button" variant="primary" disabled={analyzeState.loading || !visitRegion} onClick={() => void handleAnalyze()}>
                {analyzeState.loading ? '분석 중…' : `${selectedRegionName} 경로 분석`}
              </DatasetButton>
            </>
          }
        />

        {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        {analyzeResult ? (
          <p className="text-sm text-slate-600">
            스캔 {analyzeResult.scanned} · 저장 {analyzeResult.upserted} · 경로 신규 {analyzeResult.routeCreated} · 보류{' '}
            {analyzeResult.held} · 보류 유지 {analyzeResult.protectedHold}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <DatasetField label="지역">
            <select
              className={`${datasetControlClass} h-10 min-w-[10rem]`}
              value={resolvedRegionId}
              onChange={(event) => {
                setRegionId(event.target.value);
                setSelectedRouteId(null);
                setSelectedObservationId(null);
                setFocus('fit-all');
                setFocusNonce(0);
              }}
            >
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </DatasetField>
          {selectedRoute ? (
            <DatasetButton type="button" variant="outline" onClick={handleClearRoute}>
              전체 경로 보기
            </DatasetButton>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {regionRoutes.map((route) => (
            <RouteStatCard
              key={route.id}
              route={route}
              selected={route.id === selectedRouteId}
              onSelect={() => handleSelectRoute(route)}
            />
          ))}
          {regionRoutes.length === 0 ? (
            <p className="text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              {observationsQuery.loading || analyzeState.loading
                ? '불러오는 중…'
                : visitRegion
                  ? `${selectedRegionName}에서 분석된 경로가 없습니다.`
                  : '이 지역은 GPS 방문 권역이 없습니다.'}
            </p>
          ) : null}
        </div>

        <DatasetCard className="h-[520px] overflow-hidden p-0">
          <DatasetRouteObservationsMap
            observations={mapRows}
            selectedObservationId={selectedObservation?.id ?? null}
            focus={focus}
            focusNonce={focusNonce}
            onSelectObservation={handleSelectObservation}
          />
        </DatasetCard>

        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>시각</Th>
                <Th>출발 → 도착</Th>
                <Th>경과</Th>
                <Th>거리</Th>
                <Th>상태</Th>
                <Th>보류 사유</Th>
              </tr>
            </thead>
            <tbody>
              {visibleObservations.map((row) => (
                <ObservationRow
                  key={row.id}
                  row={row}
                  selected={row.id === selectedObservation?.id}
                  onSelect={() => handleSelectObservation(row.id)}
                />
              ))}
              {visibleObservations.length === 0 && !observationsQuery.loading ? (
                <tr>
                  <Td colSpan={6} className="text-sm text-slate-500">
                    표시할 이동이 없습니다.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </div>

        <DatasetPageFooter screenId="T01-05 · 경로 분석" />
      </section>
    </DatasetPageShell>
  );
}

function RouteStatCard({
  route,
  selected,
  onSelect,
}: {
  route: CatalogRouteRow;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  const measure = catalogRouteMeasureSummary(route);
  const stats = catalogRouteDisplayStats(route);
  const showsFallback = stats.distanceSource !== 'observed' || stats.elapsedSource !== 'observed';
  return (
    <div
      className={`rounded-2xl border p-4 text-left transition ${
        selected ? 'border-[#6D5BD0] bg-[#F3F0FF]' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
      <p className="text-xs font-medium text-[#8B83B8]">{route.code}</p>
      <h2 className="mt-1 text-sm font-semibold text-slate-900">
        {route.fromPlace.name} → {route.toPlace.name}
      </h2>
      <p className="mt-2 text-xs text-slate-600">
        표본 {route.usableCount}/{route.observationCount} · 시간 {formatCatalogRouteMinutes(route.medianElapsedMinutes)}
        {route.minElapsedMinutes != null && route.maxElapsedMinutes != null
          ? ` (${formatCatalogRouteMinutes(route.minElapsedMinutes)}~${formatCatalogRouteMinutes(route.maxElapsedMinutes)})`
          : ''}
      </p>
      <p className="text-xs text-slate-600">거리 {formatCatalogRouteKm(route.medianDistanceKm)}</p>
      {showsFallback ? (
        <p className="mt-1 text-xs text-slate-500">
          목록 표시 {measure.primary} · {measure.source || '값 없음'}
        </p>
      ) : null}
      </button>
      <Link className="mt-2 inline-flex text-xs font-medium text-[#6D5BD0] underline" to={`/dataset/places/routes/${route.id}`}>
        확인·보완
      </Link>
    </div>
  );
}

function ObservationRow({
  row,
  selected,
  onSelect,
}: {
  row: CatalogRouteObservationRow;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  return (
    <tr className={selected ? 'bg-[#F3F0FF]' : 'cursor-pointer hover:bg-slate-50'} onClick={onSelect}>
      <Td className="whitespace-nowrap text-xs">{TIME_FORMAT.format(new Date(row.departedAt))}</Td>
      <Td className="text-xs">
        {row.fromPlace.name} → {row.toPlace.name}
      </Td>
      <Td className="text-xs">{row.includeElapsed ? formatElapsed(row.elapsedMs) : '—'}</Td>
      <Td className="text-xs">{row.includeDistance ? formatCatalogRouteKm(row.distanceKm) : '—'}</Td>
      <Td className="text-xs">{ROUTE_OBSERVATION_STATUS_LABEL[row.status]}</Td>
      <Td className="text-xs">{routeObservationHoldReasonLabel(row.status, row.holdReason)}</Td>
    </tr>
  );
}
