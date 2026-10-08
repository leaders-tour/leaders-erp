import { Input, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAccommodations } from '../../features/accommodation/hooks';
import {
  useCatalogPlaces,
  useCatalogRoutes,
  useCreateCatalogPlace,
  useCreateCatalogRoute,
  type CatalogPlaceRow,
} from '../../features/dataset/hooks';
import {
  DatasetPageFooter,
  PLACE_TYPE_LABEL,
  VISIT_JUDGMENT_TYPE_LABEL,
  type CatalogPlaceType,
} from '../../features/dataset/labels';
import {
  blockedImportRows,
  buildPlaceCreateInput,
  findNearbyLodgingAccommodation,
  haversineMeters,
  pickNameFromGeocodeResults,
  planImportRoutes,
  suggestImportRow,
  toImportRow,
  type ProjectVisitImportRow,
} from '../../features/dataset/project-visit-import';
import { datasetTheme } from '../../features/dataset/theme';
import {
  DatasetButton,
  DatasetCard,
  DatasetField,
  DatasetFilterBar,
  DatasetPageHeader,
  DatasetPageShell,
  datasetControlClass,
} from '../../features/dataset/ui';
import { formatUlaanbaatarProjectDate } from '../../features/guide/guide-location-map-utils';
import { useGuidePlaceVisits, useLeaderstepsActiveProjects } from '../../features/guide/hooks';
import { DatasetProjectVisitImportMap } from './DatasetProjectVisitImportMap';

const PLACE_TYPES: CatalogPlaceType[] = ['LODGING', 'EXPERIENCE', 'MEETING', 'GATE', 'AREA'];

const VISIT_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Ulaanbaatar',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatVisitTime(iso: string): string {
  return VISIT_TIME_FORMATTER.format(new Date(iso));
}

function formatDistance(meters: number | null): string {
  if (meters == null) return '';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

function compactSelectClass() {
  return `${datasetControlClass} h-8 min-w-[8rem] px-2 text-xs`;
}

interface ApplySummary {
  placeCreated: number;
  placeReused: number;
  placeFailed: number;
  routeCreated: number;
  routeSkipped: number;
  routeFailed: number;
  errors: string[];
}

export function DatasetProjectVisitImportPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId') ?? '';
  const [projectQuery, setProjectQuery] = useState('');
  const [projectId, setProjectId] = useState(projectIdFromUrl);
  const [rows, setRows] = useState<ProjectVisitImportRow[]>([]);
  const [tableOpen, setTableOpen] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [mapFocusNonce, setMapFocusNonce] = useState(0);
  const [geocodedIds, setGeocodedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySummary, setApplySummary] = useState<ApplySummary | null>(null);

  const projectsQuery = useLeaderstepsActiveProjects(undefined, { all: true });
  const placesQuery = useCatalogPlaces();
  const routesQuery = useCatalogRoutes();
  const { accommodations } = useAccommodations({});
  const visitsQuery = useGuidePlaceVisits({ projectId: projectId || undefined });
  const [createPlace] = useCreateCatalogPlace();
  const [createRoute] = useCreateCatalogRoute();

  const places = placesQuery.data?.catalogPlaces ?? [];
  const routes = routesQuery.data?.catalogRoutes ?? [];
  const visits = visitsQuery.placeVisits;
  const projects = projectsQuery.projects;

  const filteredProjects = useMemo(() => {
    const keyword = projectQuery.trim().toLowerCase();
    const list = [...projects].sort((left, right) => left.name.localeCompare(right.name, 'ko'));
    if (!keyword) return list;
    return list.filter((project) => project.name.toLowerCase().includes(keyword));
  }, [projectQuery, projects]);

  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const visitKey = visits.map((visit) => visit.id).join('|');
  const catalogRef = useRef({ visits, places });
  catalogRef.current = { visits, places };

  const areaPlaces = useMemo(
    () => places.filter((place) => place.placeType === 'AREA'),
    [places],
  );

  useEffect(() => {
    const next = searchParams.get('projectId') ?? '';
    setProjectId((current) => (current === next ? current : next));
  }, [searchParams]);

  useEffect(() => {
    setRows([]);
    setSelectedVisitId(null);
    setMapFocusNonce(0);
    setGeocodedIds(new Set());
    setApplySummary(null);
    setApplyError(null);
  }, [projectId]);

  useEffect(() => {
    if (!projectId || visitsQuery.loading || placesQuery.loading) return;
    const { visits: currentVisits, places: currentPlaces } = catalogRef.current;
    const nextRows = [...currentVisits]
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .map((visit) => toImportRow(suggestImportRow(visit, currentPlaces)));
    setRows(nextRows);
    setSelectedVisitId((current) => current ?? nextRows[0]?.visitId ?? null);
    setGeocodedIds(new Set());
  }, [placesQuery.loading, projectId, visitKey, visitsQuery.loading]);

  useEffect(() => {
    if (typeof google === 'undefined') return;
    const targets = rows.filter((row) => !row.name.trim() && !geocodedIds.has(row.visitId));
    if (targets.length === 0) return;
    let cancelled = false;
    const geocoder = new google.maps.Geocoder();

    void (async () => {
      for (const row of targets) {
        if (cancelled) return;
        const picked = await new Promise<{ name: string | null; country: string | null }>((resolve) => {
          geocoder.geocode({ location: { lat: row.latitude, lng: row.longitude } }, (results, status) => {
            if (status !== 'OK' || !results?.length) {
              resolve({ name: null, country: null });
              return;
            }
            resolve(pickNameFromGeocodeResults(results));
          });
        });
        if (cancelled) return;
        setGeocodedIds((current) => {
          const next = new Set(current);
          next.add(row.visitId);
          return next;
        });
        if (!picked.name && !picked.country) continue;
        setRows((current) =>
          current.map((item) => {
            if (item.visitId !== row.visitId) return item;
            return {
              ...item,
              name: item.name.trim() ? item.name : picked.name ?? '',
              country: item.country || picked.country,
            };
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geocodedIds, rows]);

  const updateRow = (visitId: string, patch: Partial<ProjectVisitImportRow>) => {
    setRows((current) => current.map((row) => (row.visitId === visitId ? { ...row, ...patch } : row)));
  };

  const changePlaceType = (row: ProjectVisitImportRow, placeType: CatalogPlaceType) => {
    const lodging =
      placeType === 'LODGING' ? findNearbyLodgingAccommodation(row.latitude, row.longitude, places) : null;
    updateRow(row.visitId, {
      placeType,
      parentPlaceId: placeType === 'AREA' ? null : row.parentPlaceId,
      accommodationId: lodging?.place.accommodationId ?? null,
      accommodationDistanceM: lodging ? Math.round(lodging.distanceM) : null,
    });
  };

  const nearbyPlaceOptions = (row: ProjectVisitImportRow) =>
    places
      .filter(
        (place): place is CatalogPlaceRow & { latitude: number; longitude: number } =>
          place.placeType !== 'AREA' && place.latitude != null && place.longitude != null,
      )
      .map((place) => ({
        ...place,
        distanceM: Math.round(haversineMeters({ latitude: row.latitude, longitude: row.longitude }, place)),
      }))
      .sort((left, right) => left.distanceM - right.distanceM)
      .slice(0, 30);

  const parentOptions = (row: ProjectVisitImportRow) =>
    areaPlaces
      .filter(
        (place): place is CatalogPlaceRow & { latitude: number; longitude: number } =>
          place.latitude != null && place.longitude != null,
      )
      .map((place) => ({
        ...place,
        distanceM: Math.round(haversineMeters({ latitude: row.latitude, longitude: row.longitude }, place)),
      }))
      .sort((left, right) => left.distanceM - right.distanceM);

  const enabledCount = rows.filter((row) => row.enabled).length;
  const blocked = blockedImportRows(rows);
  const canApply = Boolean(projectId) && enabledCount > 0 && blocked.length === 0 && !applying;

  const selectProject = (nextId: string) => {
    setProjectId(nextId);
    const next = new URLSearchParams(searchParams);
    if (nextId) next.set('projectId', nextId);
    else next.delete('projectId');
    setSearchParams(next, { replace: true });
  };

  const handleApply = async () => {
    if (!canApply) {
      if (blocked.length > 0) {
        setApplyError(`이름 없는 행 ${blocked.length}개를 채우거나 끄세요.`);
      }
      return;
    }
    setApplying(true);
    setApplyError(null);
    setApplySummary(null);

    const summary: ApplySummary = {
      placeCreated: 0,
      placeReused: 0,
      placeFailed: 0,
      routeCreated: 0,
      routeSkipped: 0,
      routeFailed: 0,
      errors: [],
    };
    const resolved: Array<{ visitId: string; startedAt: string; name: string; placeId: string }> = [];

    for (const row of rows.filter((item) => item.enabled)) {
      if (row.reuseEnabled && row.reusePlaceId) {
        const reused = places.find((place) => place.id === row.reusePlaceId);
        resolved.push({
          visitId: row.visitId,
          startedAt: row.startedAt,
          name: reused?.name ?? row.reusePlaceName ?? row.name.trim(),
          placeId: row.reusePlaceId,
        });
        summary.placeReused += 1;
        continue;
      }
      try {
        const result = await createPlace({
          variables: { input: buildPlaceCreateInput(row) },
          refetchQueries: [],
        });
        const createdId = result.data?.createCatalogPlace?.id as string | undefined;
        if (!createdId) {
          throw new Error('장소 ID를 받지 못했습니다.');
        }
        resolved.push({
          visitId: row.visitId,
          startedAt: row.startedAt,
          name: row.name.trim(),
          placeId: createdId,
        });
        summary.placeCreated += 1;
      } catch (error) {
        summary.placeFailed += 1;
        summary.errors.push(
          `${row.name || row.visitId}: ${error instanceof Error ? error.message : '장소 등록 실패'}`,
        );
      }
    }

    const existingRoutes = routes.map((route) => ({
      fromPlaceId: route.fromPlace.id,
      toPlaceId: route.toPlace.id,
    }));
    const consecutive = resolved.length;
    const possibleRoutes = Math.max(0, consecutive - 1);
    const routeDrafts = planImportRoutes(resolved, existingRoutes);
    summary.routeSkipped = possibleRoutes - routeDrafts.length;

    for (const draft of routeDrafts) {
      try {
        await createRoute({
          variables: {
            input: {
              name: draft.name,
              fromPlaceId: draft.fromPlaceId,
              toPlaceId: draft.toPlaceId,
            },
          },
          refetchQueries: [],
        });
        summary.routeCreated += 1;
      } catch (error) {
        summary.routeFailed += 1;
        summary.errors.push(
          `${draft.name}: ${error instanceof Error ? error.message : '경로 등록 실패'}`,
        );
      }
    }

    await Promise.all([placesQuery.refetch(), routesQuery.refetch()]);
    setApplySummary(summary);
    setApplying(false);
  };

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로 / 프로젝트 일괄 등록"
          title="프로젝트 방문으로 장소·경로 등록"
          description="한 프로젝트의 방문 핀을 보고 넣을 것만 켠 뒤, 장소와 경로를 한 번에 등록합니다. 근처 기존 장소는 재사용하고 숙소·목적지는 새로 만들지 않습니다."
          actions={
            <>
              <Link className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`} to="/dataset/places">
                목록으로
              </Link>
              <DatasetButton type="button" variant="primary" disabled={!canApply} onClick={() => void handleApply()}>
                {applying ? '적용 중…' : `적용 · 장소 ${enabledCount}`}
              </DatasetButton>
            </>
          }
        />

        <DatasetFilterBar>
          <div className="grid gap-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <DatasetField label="프로젝트 검색">
              <Input
                className={datasetControlClass}
                value={projectQuery}
                onChange={(event) => setProjectQuery(event.target.value)}
                placeholder="정여진, 젊몽 12기…"
              />
            </DatasetField>
            <DatasetField label="프로젝트">
              <select
                className={datasetControlClass}
                value={projectId}
                onChange={(event) => selectProject(event.target.value)}
              >
                <option value="">프로젝트를 선택하세요</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} · {formatUlaanbaatarProjectDate(project.startedAt)} ~{' '}
                    {formatUlaanbaatarProjectDate(project.endedAt ?? project.scheduledEndedAt)}
                  </option>
                ))}
              </select>
            </DatasetField>
          </div>
          {projectsQuery.errorMessage ? (
            <p className="text-xs text-rose-600">{projectsQuery.errorMessage}</p>
          ) : (
            <p className="text-xs text-[#8B83B8]">
              {selectedProject
                ? `${selectedProject.name} · 방문 ${visitsQuery.loading ? '불러오는 중' : `${visits.length}개`} · 켤 핀 ${enabledCount}개`
                : '프로젝트를 고르면 그 여정의 방문이 지도와 테이블에 나타납니다.'}
            </p>
          )}
        </DatasetFilterBar>

        {applyError ? <p className="text-sm text-rose-600">{applyError}</p> : null}
        {applySummary ? (
          <DatasetCard>
            <div className="grid gap-1 px-4 py-3 text-sm text-slate-700">
              <p>
                장소 신규 {applySummary.placeCreated} · 재사용 {applySummary.placeReused} · 실패 {applySummary.placeFailed}
                {' / '}
                경로 신규 {applySummary.routeCreated} · 건너뜀 {applySummary.routeSkipped} · 실패 {applySummary.routeFailed}
              </p>
              {applySummary.errors.slice(0, 5).map((message) => (
                <p key={message} className="text-xs text-rose-600">
                  {message}
                </p>
              ))}
            </div>
          </DatasetCard>
        ) : null}

        <DatasetCard>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">지도</h2>
            <p className="text-xs text-[#8B83B8]">주황=포함 · 회색=제외 · 흰 점=기존 장소</p>
          </div>
          <div className="h-[360px] xl:h-[480px]">
            <DatasetProjectVisitImportMap
              rows={rows}
              catalogPlaces={places}
              selectedVisitId={selectedVisitId}
              focusNonce={mapFocusNonce}
              onSelectVisit={setSelectedVisitId}
            />
          </div>
        </DatasetCard>

        <DatasetCard>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">방문 목록</h2>
              <p className="mt-1 text-xs text-[#8B83B8]">
                {visitsQuery.loading
                  ? '방문을 불러오는 중…'
                  : visitsQuery.errorMessage
                    ? visitsQuery.errorMessage
                    : `방문 ${rows.length}개 · 포함 ${enabledCount}개 · 이름 필요 ${blocked.length}개`}
              </p>
            </div>
            <DatasetButton type="button" variant="outline" onClick={() => setTableOpen((value) => !value)}>
              {tableOpen ? '테이블 숨기기' : '테이블 보기'}
            </DatasetButton>
          </div>
          {tableOpen ? (
            <div className="overflow-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>포함</Th>
                    <Th>시각</Th>
                    <Th>이름</Th>
                    <Th>유형</Th>
                    <Th>상위</Th>
                    <Th>숙소</Th>
                    <Th>판정</Th>
                    <Th>재사용</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <Td colSpan={8}>
                        <p className="py-6 text-sm text-slate-500">
                          {!projectId
                            ? '프로젝트를 먼저 선택하세요.'
                            : visitsQuery.loading
                              ? '방문을 불러오는 중…'
                              : visitsQuery.errorMessage
                                ? visitsQuery.errorMessage
                                : '이 프로젝트에는 방문이 없습니다.'}
                        </p>
                      </Td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const selected = row.visitId === selectedVisitId;
                      return (
                        <tr
                          key={row.visitId}
                          className={`cursor-pointer ${selected ? 'bg-[#F8F6FF]' : 'hover:bg-slate-50'}`}
                          onClick={() => {
                            setSelectedVisitId(row.visitId);
                            setMapFocusNonce((value) => value + 1);
                          }}
                        >
                          <Td>
                            <input
                              type="checkbox"
                              className={datasetTheme.checkbox}
                              checked={row.enabled}
                              onChange={(event) => updateRow(row.visitId, { enabled: event.target.checked })}
                              aria-label={`${formatVisitTime(row.startedAt)} 포함`}
                            />
                          </Td>
                          <Td>
                            <span className="whitespace-nowrap text-xs text-slate-600">{formatVisitTime(row.startedAt)}</span>
                          </Td>
                          <Td>
                            <Input
                              className={`${datasetControlClass} h-8 min-w-[9rem] px-2 text-xs`}
                              value={row.name}
                              onChange={(event) => updateRow(row.visitId, { name: event.target.value })}
                            />
                          </Td>
                          <Td>
                            <select
                              className={compactSelectClass()}
                              value={row.placeType}
                              onChange={(event) => changePlaceType(row, event.target.value as CatalogPlaceType)}
                            >
                              {PLACE_TYPES.filter((type) => type !== 'AREA').map((type) => (
                                <option key={type} value={type}>
                                  {PLACE_TYPE_LABEL[type]}
                                </option>
                              ))}
                            </select>
                          </Td>
                          <Td>
                            <select
                              className={compactSelectClass()}
                              value={row.parentPlaceId ?? ''}
                              onChange={(event) => {
                                const parent = areaPlaces.find((place) => place.id === event.target.value) ?? null;
                                updateRow(row.visitId, {
                                  parentPlaceId: event.target.value || null,
                                  parentDistanceM: parent?.latitude != null && parent.longitude != null
                                    ? Math.round(
                                        haversineMeters(
                                          { latitude: row.latitude, longitude: row.longitude },
                                          { latitude: parent.latitude, longitude: parent.longitude },
                                        ),
                                      )
                                    : null,
                                  country: parent?.country || row.country,
                                  regionId: parent?.regionId ?? row.regionId,
                                });
                              }}
                            >
                              <option value="">없음</option>
                              {parentOptions(row).map((place) => (
                                <option key={place.id} value={place.id}>
                                  {place.name} · {formatDistance(place.distanceM)}
                                </option>
                              ))}
                            </select>
                          </Td>
                          <Td>
                            {row.placeType === 'LODGING' ? (
                              <select
                                className={compactSelectClass()}
                                value={row.accommodationId ?? ''}
                                onChange={(event) =>
                                  updateRow(row.visitId, { accommodationId: event.target.value || null })
                                }
                              >
                                <option value="">없음</option>
                                {accommodations.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </Td>
                          <Td>
                            <span className="whitespace-nowrap text-xs text-slate-500">
                              {VISIT_JUDGMENT_TYPE_LABEL[row.visitJudgmentType]} · {row.visitRadiusM}m
                              {row.visitMinStayMinutes != null ? ` · ${row.visitMinStayMinutes}분` : ''}
                            </span>
                          </Td>
                          <Td>
                            <select
                              className={compactSelectClass()}
                              value={row.reuseEnabled && row.reusePlaceId ? row.reusePlaceId : ''}
                              onChange={(event) => {
                                const nextId = event.target.value;
                                if (!nextId) {
                                  updateRow(row.visitId, {
                                    reuseEnabled: false,
                                    reusePlaceId: null,
                                    reusePlaceName: null,
                                    reuseDistanceM: null,
                                  });
                                  return;
                                }
                                const match = nearbyPlaceOptions(row).find((place) => place.id === nextId);
                                updateRow(row.visitId, {
                                  reuseEnabled: true,
                                  reusePlaceId: nextId,
                                  reusePlaceName: match?.name ?? null,
                                  reuseDistanceM: match?.distanceM ?? null,
                                  name: row.name.trim() || match?.name || row.name,
                                });
                              }}
                            >
                              <option value="">새로 등록</option>
                              {nearbyPlaceOptions(row).map((place) => (
                                <option key={place.id} value={place.id}>
                                  {place.name} · {formatDistance(place.distanceM)}
                                </option>
                              ))}
                            </select>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          ) : null}
        </DatasetCard>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <DatasetButton type="button" variant="primary" disabled={!canApply} onClick={() => void handleApply()}>
            {applying ? '적용 중…' : `적용 · 장소 ${enabledCount}`}
          </DatasetButton>
        </div>

        <DatasetPageFooter screenId="T01-09 · 프로젝트 방문 일괄 등록" />
      </section>
    </DatasetPageShell>
  );
}
