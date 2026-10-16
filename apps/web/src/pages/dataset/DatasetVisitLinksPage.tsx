import { haversineMeters, visitRegionFromCatalogName, type VisitRegion } from '@tour/domain';
import { Table, Td, Th } from '@tour/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAnalyzeCatalogVisitLinks,
  useCatalogPlaces,
  useCatalogRegions,
  useCatalogVisitLinks,
  useClearCatalogVisitLink,
  useConfirmCatalogVisitLink,
  type CatalogVisitLinkAnalyzeResult,
  type CatalogVisitLinkRow,
} from '../../features/dataset/hooks';
import {
  DatasetPageFooter,
  catalogPlaceHasRegion,
  visitLinkReviewReasonLabel,
  VISIT_LINK_STATUS_LABEL,
  type CatalogVisitLinkStatus,
} from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import {
  DatasetButton,
  DatasetCard,
  DatasetField,
  DatasetPageHeader,
  DatasetPageShell,
  DatasetTabs,
  datasetControlClass,
} from '../../features/dataset/ui';
import { findVisitNeighbors, sliceLocationPath, visitPathWindowMs } from '../../features/dataset/visit-link-context';
import { useGuideLiveLocations } from '../../features/guide/hooks';
import { DatasetVisitLinksMap } from './DatasetVisitLinksMap';

const VISIT_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ulaanbaatar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type QueueTab = 'needs_review' | 'linked';

const NEEDS_REVIEW: CatalogVisitLinkStatus[] = ['REVIEW', 'UNLINKED'];
const LINKED: CatalogVisitLinkStatus[] = ['AUTO', 'MANUAL'];
const TIME_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Ulaanbaatar',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}

export function DatasetVisitLinksPage(): JSX.Element {
  const [tab, setTab] = useState<QueueTab>('needs_review');
  const [regionId, setRegionId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [pickPlaceId, setPickPlaceId] = useState<string>('');
  const [analyzeResult, setAnalyzeResult] = useState<CatalogVisitLinkAnalyzeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const regionsQuery = useCatalogRegions();
  const placesQuery = useCatalogPlaces();
  const regions = regionsQuery.data?.catalogRegions ?? [];
  const places = placesQuery.data?.catalogPlaces ?? [];
  const resolvedRegionId = regionId || regions.find((row) => row.name === '중부')?.id || regions[0]?.id || '';
  const selectedRegion = regions.find((row) => row.id === resolvedRegionId) ?? null;
  const selectedRegionName = selectedRegion?.name ?? '이 지역';
  const visitRegion = selectedRegion ? visitRegionFromCatalogName(selectedRegion.name) : null;
  const statuses = tab === 'needs_review' ? NEEDS_REVIEW : LINKED;
  const regionLinksQuery = useCatalogVisitLinks({
    regionId: resolvedRegionId || null,
  });
  const linksQuery = useCatalogVisitLinks({
    statuses,
    regionId: resolvedRegionId || null,
  });
  const [analyzeLinks, analyzeState] = useAnalyzeCatalogVisitLinks();
  const [confirmLink, confirmState] = useConfirmCatalogVisitLink();
  const [clearLink, clearState] = useClearCatalogVisitLink();
  const analyzedRegions = useRef(new Set<VisitRegion>());

  const rows = linksQuery.data?.catalogVisitLinks ?? [];
  const regionRows = regionLinksQuery.data?.catalogVisitLinks ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const selectedRowId = selected?.id ?? null;
  const selectedDate = selected ? VISIT_DATE_FORMAT.format(new Date(selected.startedAt)) : null;
  const projectLinksQuery = useCatalogVisitLinks({
    projectId: selected?.projectId ?? null,
  });
  const locationsQuery = useGuideLiveLocations({
    projectId: selected?.projectId,
    date: selectedDate ?? undefined,
    skip: !selected?.projectId,
    pollInterval: 0,
  });
  const neighborSource = projectLinksQuery.data?.catalogVisitLinks ?? regionRows;
  const neighbors = useMemo(
    () => findVisitNeighbors(neighborSource, selected),
    [neighborSource, selected],
  );
  const contextPath = useMemo(() => {
    if (!selected) return [];
    const window = visitPathWindowMs({
      selectedStartedAt: selected.startedAt,
      selectedEndedAt: selected.endedAt,
      prevStartedAt: neighbors.prev?.startedAt,
      nextEndedAt: neighbors.next?.endedAt,
    });
    const sliced = locationsQuery.locations
      .map((location) => sliceLocationPath(location.path, window.fromMs, window.toMs))
      .sort((left, right) => right.length - left.length);
    return sliced[0] ?? [];
  }, [locationsQuery.locations, neighbors.next?.endedAt, neighbors.prev?.startedAt, selected]);

  const regionPlaces = useMemo(
    () =>
      places.filter(
        (place) =>
          place.placeType !== 'AREA' &&
          place.latitude != null &&
          place.longitude != null &&
          (!resolvedRegionId || catalogPlaceHasRegion(place, resolvedRegionId)),
      ),
    [places, resolvedRegionId],
  );

  const nearbyPicks = useMemo(() => {
    if (!selected) return [];
    return regionPlaces
      .map((place) => ({
        id: place.id,
        name: place.name,
        code: place.code,
        distanceM: Math.round(
          haversineMeters(
            { latitude: selected.latitude, longitude: selected.longitude },
            { latitude: place.latitude as number, longitude: place.longitude as number },
          ),
        ),
      }))
      .sort((left, right) => left.distanceM - right.distanceM)
      .slice(0, 12);
  }, [regionPlaces, selected]);

  const mapPlaces = useMemo(
    () =>
      regionPlaces.map((place) => ({
        id: place.id,
        latitude: place.latitude as number,
        longitude: place.longitude as number,
      })),
    [regionPlaces],
  );

  const busy = analyzeState.loading || confirmState.loading || clearState.loading;

  const handleAnalyze = useCallback(
    async (region = visitRegion) => {
      if (!region) {
        setErrorMessage('이 지역은 GPS 방문 권역이 없어 분석할 수 없습니다.');
        return;
      }
      setErrorMessage(null);
      try {
        const result = await analyzeLinks({ variables: { input: { visitRegion: region } } });
        setAnalyzeResult(result.data?.analyzeCatalogVisitLinks ?? null);
        await Promise.all([linksQuery.refetch(), regionLinksQuery.refetch()]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '분석에 실패했습니다.');
      }
    },
    [analyzeLinks, linksQuery, regionLinksQuery, visitRegion],
  );

  useEffect(() => {
    if (!visitRegion || regionLinksQuery.loading || !regionLinksQuery.data) return;
    if (analyzedRegions.current.has(visitRegion)) return;
    if (regionLinksQuery.data.catalogVisitLinks.length > 0) {
      analyzedRegions.current.add(visitRegion);
      return;
    }
    analyzedRegions.current.add(visitRegion);
    void handleAnalyze(visitRegion);
  }, [handleAnalyze, regionLinksQuery.data, regionLinksQuery.loading, visitRegion]);

  const handleConfirm = async (row: CatalogVisitLinkRow, placeId: string) => {
    if (!placeId) return;
    setErrorMessage(null);
    try {
      await confirmLink({ variables: { input: { id: row.id, placeId } } });
      setPickPlaceId('');
      await linksQuery.refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '확정에 실패했습니다.');
    }
  };

  const handleSelectVisit = (id: string) => {
    setSelectedId(id);
    setFocusNonce((value) => value + 1);
  };

  const handleClear = async (row: CatalogVisitLinkRow) => {
    setErrorMessage(null);
    try {
      await clearLink({ variables: { id: row.id } });
      await linksQuery.refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '연결 해제에 실패했습니다.');
    }
  };

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로 / 방문 연결"
          title="방문-장소 연결"
          description="GPS 방문을 등록된 장소에 붙입니다. 후보가 하나면 자동 연결하고, 없거나 겹치면 확인 필요에서 고릅니다. 사람이 확정한 연결은 다시 분석해도 유지됩니다."
          actions={
            <>
              <Link
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`}
                to="/dataset/places"
              >
                장소 목록
              </Link>
              <DatasetButton type="button" variant="primary" disabled={busy || !visitRegion} onClick={() => void handleAnalyze()}>
                {analyzeState.loading ? '분석 중…' : `${selectedRegionName} 방문 분석`}
              </DatasetButton>
            </>
          }
        />

        {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        {analyzeResult ? (
          <p className="text-sm text-slate-600">
            스캔 {analyzeResult.scanned} · 자동 {analyzeResult.auto} · 검토 {analyzeResult.review} · 미연결{' '}
            {analyzeResult.unlinked} · 수동 보호 {analyzeResult.protectedManual}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <DatasetTabs
            items={[
              { id: 'needs_review', label: '확인 필요' },
              { id: 'linked', label: '연결 완료' },
            ]}
            activeId={tab}
            onChange={(id) => {
              setTab(id as QueueTab);
              setSelectedId(null);
              setFocusNonce(0);
            }}
          />
          <DatasetField label="지역">
            <select
              className={`${datasetControlClass} h-10 min-w-[10rem]`}
              value={resolvedRegionId}
              onChange={(event) => {
                setRegionId(event.target.value);
                setSelectedId(null);
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
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <DatasetCard className="h-[520px] overflow-hidden p-0">
            <DatasetVisitLinksMap
              visits={rows}
              places={mapPlaces}
              selectedId={selectedRowId}
              focusNonce={focusNonce}
              previous={neighbors.prev}
              next={neighbors.next}
              contextPath={contextPath}
              onSelect={handleSelectVisit}
            />
          </DatasetCard>

          <DatasetCard className="grid gap-3">
            {selected ? (
              <>
                <div>
                  <p className="text-xs font-medium text-[#8B83B8]">{VISIT_LINK_STATUS_LABEL[selected.status]}</p>
                  <h2 className="text-lg font-semibold text-slate-900">{selected.description || '이름 없는 방문'}</h2>
                  <p className="text-xs text-slate-500">
                    {TIME_FORMAT.format(new Date(selected.startedAt))} · {formatDuration(selected.durationMs)}
                    {selected.place ? ` · ${selected.place.code} ${selected.place.name}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    확인 사유 · {visitLinkReviewReasonLabel(selected.status, selected.reviewReason)}
                  </p>
                  <p className="text-xs text-slate-500">
                    이전 {neighbors.prev ? `${TIME_FORMAT.format(new Date(neighbors.prev.startedAt))} ${neighbors.prev.description || neighbors.prev.place?.name || '방문'}` : '없음'}
                    {' → '}
                    다음 {neighbors.next ? `${TIME_FORMAT.format(new Date(neighbors.next.startedAt))} ${neighbors.next.description || neighbors.next.place?.name || '방문'}` : '없음'}
                  </p>
                </div>
                {selected.candidates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selected.candidates.map((candidate) => (
                      <DatasetButton
                        key={candidate.placeId}
                        type="button"
                        variant={selected.placeId === candidate.placeId ? 'primary' : 'outline'}
                        disabled={busy}
                        onClick={() => void handleConfirm(selected, candidate.placeId)}
                      >
                        {candidate.name} · {candidate.distanceM}m
                      </DatasetButton>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <p className="text-xs text-slate-500">반경 안 후보가 없습니다. {selectedRegionName} 장소에서 고르세요.</p>
                    <select
                      className={`${datasetControlClass} h-10`}
                      value={pickPlaceId}
                      onChange={(event) => setPickPlaceId(event.target.value)}
                    >
                      <option value="">장소 선택</option>
                      {nearbyPicks.map((place) => (
                        <option key={place.id} value={place.id}>
                          {place.name} · {place.distanceM}m
                        </option>
                      ))}
                    </select>
                    <DatasetButton
                      type="button"
                      variant="primary"
                      disabled={busy || !pickPlaceId}
                      onClick={() => void handleConfirm(selected, pickPlaceId)}
                    >
                      이 장소로 확정
                    </DatasetButton>
                  </div>
                )}
                {selected.status === 'AUTO' || selected.status === 'MANUAL' ? (
                  <DatasetButton type="button" variant="outline" disabled={busy} onClick={() => void handleClear(selected)}>
                    연결 해제
                  </DatasetButton>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {linksQuery.loading || analyzeState.loading
                  ? '불러오는 중…'
                  : visitRegion
                    ? `확인할 ${selectedRegionName} 방문이 없습니다.`
                    : '이 지역은 GPS 방문 권역이 없습니다.'}
              </p>
            )}
          </DatasetCard>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>시각</Th>
                <Th>방문</Th>
                <Th>상태</Th>
                <Th>확인이 필요한 사유</Th>
                <Th>장소</Th>
                <Th>거리</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.id === selectedRowId ? 'bg-[#F3F0FF]' : 'cursor-pointer hover:bg-slate-50'}
                  onClick={() => handleSelectVisit(row.id)}
                >
                  <Td className="whitespace-nowrap text-xs">{TIME_FORMAT.format(new Date(row.startedAt))}</Td>
                  <Td className="text-xs">{row.description || '이름 없음'}</Td>
                  <Td className="text-xs">{VISIT_LINK_STATUS_LABEL[row.status]}</Td>
                  <Td className="text-xs">{visitLinkReviewReasonLabel(row.status, row.reviewReason)}</Td>
                  <Td className="text-xs">{row.place ? `${row.place.code} ${row.place.name}` : '—'}</Td>
                  <Td className="text-xs">{row.distanceM != null ? `${row.distanceM}m` : '—'}</Td>
                </tr>
              ))}
              {rows.length === 0 && !linksQuery.loading ? (
                <tr>
                  <Td colSpan={6} className="text-sm text-slate-500">
                    표시할 방문이 없습니다.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </div>

        <DatasetPageFooter screenId="T01-07 · 방문-장소 연결" />
      </section>
    </DatasetPageShell>
  );
}
