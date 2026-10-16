import {
  VISIT_REGION_FILTER_LABEL,
  VISIT_REGION_FILTER_ORDER,
  visitMatchesSelectedRegions,
  type VisitRegionFilter,
} from '@tour/domain';
import { Input, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCatalogPlaces,
  useCatalogRegions,
  useCreateCatalogPlace,
  useUpdateCatalogPlace,
  type CatalogPlaceRow,
} from '../../features/dataset/hooks';
import {
  DatasetPageFooter,
  CATALOG_PLACE_TYPES,
  PLACE_TYPE_LABEL,
  VISIT_JUDGMENT_TYPE_LABEL,
  catalogPlaceTypeLabel,
  nearbyPlaceKind,
  type CatalogPlaceType,
} from '../../features/dataset/labels';
import { looksLikeAdminName, nearbyGooglePlaceNames } from '../../features/dataset/google-place-name';
import { pickNameFromGeocodeResults } from '../../features/dataset/project-visit-import';
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
import {
  appendSampleNote,
  clusterVisitSamples,
  type SampleCluster,
  type SampleClusterKind,
} from '../../features/dataset/visit-sample-clusters';
import { formatUlaanbaatarProjectDate } from '../../features/guide/guide-location-map-utils';
import {
  useGuidePlaceVisitSamples,
  useGuideProjectVisitRegions,
  useLeaderstepsActiveProjects,
  type GuideProjectVisitRegionRow,
} from '../../features/guide/hooks';
import {
  DatasetPlaceSamplesMap,
  type SampleMapCluster,
  type SampleMapPlace,
} from './DatasetPlaceSamplesMap';

const PLACE_TYPES = CATALOG_PLACE_TYPES;
const MAX_PROJECTS = 200;
const REGION_CHIP_CLASS: Record<VisitRegionFilter, { idle: string; active: string }> = {
  GOBI: {
    idle: 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50',
    active: 'border-amber-500 bg-amber-500 text-white',
  },
  CENTRAL: {
    idle: 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50',
    active: 'border-emerald-500 bg-emerald-500 text-white',
  },
  KHUVSGUL: {
    idle: 'border-blue-200 bg-white text-blue-800 hover:bg-blue-50',
    active: 'border-blue-500 bg-blue-500 text-white',
  },
  TERELJ: {
    idle: 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50',
    active: 'border-teal-500 bg-teal-500 text-white',
  },
  ULAANBAATAR: {
    idle: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    active: 'border-slate-600 bg-slate-600 text-white',
  },
  OTHER: {
    idle: 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
    active: 'border-slate-400 bg-slate-100 text-slate-700',
  },
};
const EMPTY_PLACES: CatalogPlaceRow[] = [];
const NOTE_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' });
const DURATION_FORMATTER = new Intl.NumberFormat('ko-KR');

type ClusterTab = SampleClusterKind;
type MinProjects = 1 | 2 | 3;

interface SampleClusterRow extends SampleCluster {
  enabled: boolean;
  otherTypeLabel: string;
}

interface ApplySummary {
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

function confidenceLabel(confidence: SampleCluster['confidence']): string {
  if (confidence === 'enough') return '충분';
  if (confidence === 'medium') return '보통';
  return '표본 1개';
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}

function compactSelectClass() {
  return `${datasetControlClass} h-8 min-w-[8rem] px-2 text-xs`;
}

function projectHasRegion(summary: GuideProjectVisitRegionRow | undefined, region: VisitRegionFilter): boolean {
  return Boolean(summary?.regions.some((item) => item.region === region));
}

function formatProjectRegionTags(summary: GuideProjectVisitRegionRow | undefined): string {
  if (!summary || summary.totalVisits === 0) return '방문 없음';
  const tags = VISIT_REGION_FILTER_ORDER.flatMap((region) => {
    const count = summary.regions.find((item) => item.region === region)?.visitCount;
    return count ? [`${VISIT_REGION_FILTER_LABEL[region]} ${count}`] : [];
  });
  return tags.join(' · ') || '방문 없음';
}

export function DatasetPlaceSamplesPage(): JSX.Element {
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<VisitRegionFilter[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<ClusterTab>('new_place');
  const [minProjects, setMinProjects] = useState<MinProjects>(2);
  const [rows, setRows] = useState<SampleClusterRow[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [geocodedIds, setGeocodedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySummary, setApplySummary] = useState<ApplySummary | null>(null);

  const projectsQuery = useLeaderstepsActiveProjects(undefined, { all: true });
  const regionQuery = useGuideProjectVisitRegions();
  const placesQuery = useCatalogPlaces();
  const regionsQuery = useCatalogRegions();
  const samplesQuery = useGuidePlaceVisitSamples();
  const [createPlace] = useCreateCatalogPlace();
  const [updatePlace] = useUpdateCatalogPlace();

  const places = placesQuery.data?.catalogPlaces ?? EMPTY_PLACES;
  const catalogRegions = regionsQuery.data?.catalogRegions;
  const projects = projectsQuery.projects;
  const areaPlaces = useMemo(() => places.filter((place) => place.placeType === 'AREA'), [places]);
  const regionByProjectId = useMemo(() => {
    const next = new Map<string, GuideProjectVisitRegionRow>();
    for (const row of regionQuery.regions) next.set(row.projectId, row);
    return next;
  }, [regionQuery.regions]);
  const regionProjectCounts = useMemo(() => {
    const counts = Object.fromEntries(VISIT_REGION_FILTER_ORDER.map((region) => [region, 0])) as Record<
      VisitRegionFilter,
      number
    >;
    for (const row of regionQuery.regions) {
      for (const item of row.regions) {
        counts[item.region] += 1;
      }
    }
    return counts;
  }, [regionQuery.regions]);

  const filteredProjects = useMemo(() => {
    const keyword = projectQuery.trim().toLowerCase();
    return [...projects]
      .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
      .filter((project) => {
        const summary = regionByProjectId.get(project.id);
        if (selectedRegions.length > 0 && !selectedRegions.some((region) => projectHasRegion(summary, region))) {
          return false;
        }
        if (!keyword) return true;
        return project.name.toLowerCase().includes(keyword);
      });
  }, [projectQuery, projects, regionByProjectId, selectedRegions]);

  const sampleKey = samplesQuery.samples.map((sample) => sample.id).join('|');
  const regionFilterKey = [...selectedRegions].sort().join('|');
  const filteredSamples = useMemo(
    () =>
      samplesQuery.samples.filter((sample) =>
        visitMatchesSelectedRegions(sample.centerLatitude, sample.centerLongitude, selectedRegions),
      ),
    [samplesQuery.samples, selectedRegions],
  );
  const placesRef = useRef(places);
  placesRef.current = places;

  useEffect(() => {
    if (!samplesQuery.called || samplesQuery.loading) return;
    const next = clusterVisitSamples(
      filteredSamples,
      placesRef.current.map((place) => ({
        id: place.id,
        code: place.code,
        name: place.name,
        placeType: place.placeType,
        latitude: place.latitude,
        longitude: place.longitude,
        parentPlaceId: place.parentPlaceId,
        regionId: place.regionId,
        country: place.country,
        accommodationId: place.accommodationId,
        visitRadiusM: place.visitRadiusM,
        internalNote: place.internalNote,
      })),
      catalogRegions ?? [],
    ).map((cluster) => ({
      ...cluster,
      enabled: cluster.kind === 'new_place',
      otherTypeLabel: '',
    }));
    setRows(next);
    setSelectedClusterId(next[0]?.id ?? null);
    setGeocodedIds(new Set());
    setApplySummary(null);
    setApplyError(null);
  }, [
    catalogRegions,
    filteredSamples,
    placesQuery.data,
    regionFilterKey,
    sampleKey,
    samplesQuery.called,
    samplesQuery.loading,
  ]);

  useEffect(() => {
    if (typeof google === 'undefined') return;
    const targets = rows.filter((row) => {
      if (row.kind !== 'new_place') return false;
      if (geocodedIds.has(row.id)) return false;
      const name = row.name.trim();
      return !name || looksLikeAdminName(name);
    });
    if (targets.length === 0) return;
    let cancelled = false;
    const geocoder = typeof google.maps?.Geocoder === 'function' ? new google.maps.Geocoder() : null;

    void (async () => {
      for (const row of targets) {
        if (cancelled) return;
        const nearby = await nearbyGooglePlaceNames({
          lat: row.latitude,
          lng: row.longitude,
          kind: nearbyPlaceKind(row.placeType),
        });
        const placeName = nearby.ok ? nearby.places[0]?.name ?? null : null;
        let country: string | null = null;
        if (!row.country && geocoder) {
          country = await new Promise((resolve) => {
            geocoder.geocode({ location: { lat: row.latitude, lng: row.longitude } }, (results, status) => {
              if (status !== 'OK' || !results?.length) {
                resolve(null);
                return;
              }
              resolve(pickNameFromGeocodeResults(results).country);
            });
          });
        }
        if (cancelled) return;
        setGeocodedIds((current) => {
          const next = new Set(current);
          next.add(row.id);
          return next;
        });
        if (!placeName && !country) continue;
        setRows((current) =>
          current.map((item) => {
            if (item.id !== row.id) return item;
            const currentName = item.name.trim();
            const replaceName = !currentName || looksLikeAdminName(currentName);
            return {
              ...item,
              name: replaceName && placeName ? placeName : item.name,
              country: item.country || country,
            };
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geocodedIds, rows]);

  const visibleRows = useMemo(
    () => rows.filter((row) => row.kind === tab && row.projectCount >= minProjects),
    [minProjects, rows, tab],
  );
  const counts = {
    new_place: rows.filter((row) => row.kind === 'new_place' && row.projectCount >= minProjects).length,
    existing_fix: rows.filter((row) => row.kind === 'existing_fix' && row.projectCount >= minProjects).length,
    review: rows.filter((row) => row.kind === 'review' && row.projectCount >= minProjects).length,
  };
  const enabledRows = rows.filter((row) => {
    if (!row.enabled) return false;
    if (row.projectCount < minProjects) return false;
    if (row.kind === 'new_place') return Boolean(row.name.trim());
    if (row.kind === 'existing_fix') return Boolean(row.existingPlace);
    return false;
  });

  const mapClusters = useMemo<SampleMapCluster[]>(
    () =>
      visibleRows.map((row) => ({
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        visitRadiusM: row.visitRadiusM,
        name: row.name,
        kind: row.kind,
        visits: row.visits,
      })),
    [visibleRows],
  );
  const mapPlaces = useMemo<SampleMapPlace[]>(() => {
    const selected = rows.find((row) => row.id === selectedClusterId);
    const source = selected?.nearbyPlaces.length ? selected.nearbyPlaces : [];
    return source.map((place) => ({
      id: place.id,
      name: place.name,
      code: place.code,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  }, [rows, selectedClusterId]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else if (next.size < MAX_PROJECTS) next.add(projectId);
      return next;
    });
  };

  const selectVisibleProjects = () => {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      for (const project of filteredProjects) {
        if (next.size >= MAX_PROJECTS) break;
        next.add(project.id);
      }
      return next;
    });
  };

  const loadSamples = () => {
    const projectIds = [...selectedProjectIds];
    if (projectIds.length === 0 || projectIds.length > MAX_PROJECTS) return;
    void samplesQuery.loadSamples(projectIds);
  };

  const updateRow = (id: string, patch: Partial<SampleClusterRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleApply = async () => {
    if (enabledRows.length === 0 || applying) return;
    setApplying(true);
    setApplyError(null);
    const dateLabel = NOTE_DATE.format(new Date());
    const summary: ApplySummary = { created: 0, updated: 0, failed: 0, errors: [] };

    for (const row of enabledRows) {
      try {
        if (row.kind === 'new_place') {
          await createPlace({
            variables: {
              input: {
                name: row.name.trim(),
                placeType: row.placeType,
                otherTypeLabel: row.placeType === 'OTHER' ? row.otherTypeLabel.trim() || null : null,
                country: row.country?.trim() || '몽골',
                regionId: row.regionId || null,
                parentPlaceId: row.placeType === 'AREA' ? null : row.parentPlaceId || null,
                latitude: row.latitude,
                longitude: row.longitude,
                visitJudgmentType: row.visitJudgmentType,
                visitMinStayMinutes: row.visitJudgmentType === 'STAY' ? row.visitMinStayMinutes : null,
                visitRadiusM: row.visitRadiusM,
                internalNote: appendSampleNote(null, row.visitCount, row.projectCount, dateLabel),
              },
            },
          });
          summary.created += 1;
        } else if (row.kind === 'existing_fix' && row.existingPlace) {
          await updatePlace({
            variables: {
              id: row.existingPlace.id,
              input: {
                latitude: row.latitude,
                longitude: row.longitude,
                visitRadiusM: row.visitRadiusM,
                internalNote: appendSampleNote(
                  row.existingPlace.internalNote,
                  row.visitCount,
                  row.projectCount,
                  dateLabel,
                ),
              },
            },
          });
          summary.updated += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.errors.push(
          `${row.name || row.existingPlace?.name || row.id}: ${
            error instanceof Error ? error.message : '적용 실패'
          }`,
        );
      }
    }

    await placesQuery.refetch();
    setApplySummary(summary);
    setApplying(false);
  };

  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 장소 · 지역 · 경로 / 표본으로 장소 만들기"
          title="여러 프로젝트 표본으로 장소 만들기"
          description="여러 팀의 방문 핀을 같은 위치로 묶고, 대표 좌표·반경을 만든 뒤 새 장소를 등록하거나 이미 있는 장소를 보정합니다. 경로는 만들지 않습니다."
          actions={
            <>
              <Link
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium ${datasetTheme.outline}`}
                to="/dataset/places"
              >
                목록으로
              </Link>
              <DatasetButton type="button" variant="primary" disabled={enabledRows.length === 0 || applying} onClick={() => void handleApply()}>
                {applying ? '적용 중…' : `적용 · ${enabledRows.length}개`}
              </DatasetButton>
            </>
          }
        />

        {applyError ? <p className="text-sm text-rose-600">{applyError}</p> : null}
        {applySummary ? (
          <DatasetCard>
            <div className="grid gap-1 px-4 py-3 text-sm text-slate-700">
              <p>
                신규 {applySummary.created} · 보정 {applySummary.updated} · 실패 {applySummary.failed}
              </p>
              {applySummary.errors.slice(0, 5).map((message) => (
                <p key={message} className="text-xs text-rose-600">
                  {message}
                </p>
              ))}
            </div>
          </DatasetCard>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <DatasetCard className="h-fit">
            <div className="grid gap-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">프로젝트</h2>
                <span className="text-xs text-[#8B83B8]">
                  {selectedProjectIds.size}/{MAX_PROJECTS}
                </span>
              </div>
              <div className="grid gap-1.5">
                <p className="text-xs font-medium text-slate-500" title="GPS 기반으로 분류한 지역입니다">
                  지역
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VISIT_REGION_FILTER_ORDER.map((region) => {
                    const active = selectedRegions.includes(region);
                    return (
                      <button
                        key={region}
                        type="button"
                        title="GPS 기반으로 분류한 지역입니다"
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          REGION_CHIP_CLASS[region][active ? 'active' : 'idle']
                        }`}
                        onClick={() => {
                          setSelectedRegions((current) =>
                            current.includes(region)
                              ? current.filter((item) => item !== region)
                              : [...current, region],
                          );
                        }}
                      >
                        {VISIT_REGION_FILTER_LABEL[region]} {regionProjectCounts[region]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {regionQuery.loading ? (
                <p className="text-[11px] text-[#8B83B8]">GPS 지역을 세는 중…</p>
              ) : regionQuery.errorMessage ? (
                <p className="text-[11px] text-rose-600">{regionQuery.errorMessage}</p>
              ) : null}
              <DatasetField label="검색">
                <Input
                  className={datasetControlClass}
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.target.value)}
                  placeholder="정여진, 젊몽, 고비…"
                />
              </DatasetField>
              <div className="flex flex-wrap gap-2">
                <DatasetButton type="button" variant="outline" className="h-8 px-3 text-xs" onClick={selectVisibleProjects}>
                  보이는 항목 선택
                </DatasetButton>
                <DatasetButton
                  type="button"
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  onClick={() => setSelectedProjectIds(new Set())}
                >
                  선택 해제
                </DatasetButton>
              </div>
              <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-100">
                {projectsQuery.loading ? (
                  <p className="px-3 py-6 text-sm text-slate-500">프로젝트를 불러오는 중…</p>
                ) : projectsQuery.errorMessage ? (
                  <p className="px-3 py-6 text-sm text-rose-600">{projectsQuery.errorMessage}</p>
                ) : (
                  filteredProjects.map((project) => {
                    const checked = selectedProjectIds.has(project.id);
                    return (
                      <label
                        key={project.id}
                        className="flex cursor-pointer items-start gap-2 border-b border-slate-50 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className={`mt-0.5 ${datasetTheme.checkbox}`}
                          checked={checked}
                          onChange={() => toggleProject(project.id)}
                        />
                        <span className="grid gap-0.5">
                          <span className="font-medium text-slate-800">{project.name}</span>
                          <span className="text-[11px] text-[#8B83B8]">
                            {formatUlaanbaatarProjectDate(project.startedAt)} ~{' '}
                            {formatUlaanbaatarProjectDate(project.endedAt ?? project.scheduledEndedAt)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatProjectRegionTags(regionByProjectId.get(project.id))}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <DatasetButton
                type="button"
                variant="primary"
                disabled={selectedProjectIds.size === 0 || samplesQuery.loading}
                onClick={loadSamples}
              >
                {samplesQuery.loading ? '불러오는 중…' : '표본 불러오기'}
              </DatasetButton>
              {selectedProjectIds.size > MAX_PROJECTS ? (
                <p className="text-xs text-rose-600">프로젝트는 최대 {MAX_PROJECTS}개까지 선택할 수 있습니다.</p>
              ) : (
                <p className="text-xs text-[#8B83B8]">체크한 뒤에 불러와야 묶음이 계산됩니다.</p>
              )}
            </div>
          </DatasetCard>

          <div className="grid gap-5">
            <DatasetCard>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">지도</h2>
                <p className="text-xs text-[#8B83B8]">보라=신규 · 파랑=보정 · 주황=확인 필요 · 흰 점=기존 장소</p>
              </div>
              <div className="h-[320px] xl:h-[380px]">
                <DatasetPlaceSamplesMap
                  clusters={mapClusters}
                  places={mapPlaces}
                  selectedClusterId={selectedClusterId}
                  focusNonce={focusNonce}
                  onSelectCluster={(clusterId) => {
                    setSelectedClusterId(clusterId);
                    setFocusNonce((value) => value + 1);
                  }}
                />
              </div>
            </DatasetCard>

            <DatasetCard>
              <div className="grid gap-3 border-b border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">표본 묶음</h2>
                    <p className="mt-1 text-xs text-[#8B83B8]">
                      {samplesQuery.loading
                        ? '방문을 불러오는 중…'
                        : samplesQuery.errorMessage
                          ? samplesQuery.errorMessage
                          : samplesQuery.called
                            ? selectedRegions.length > 0
                              ? `방문 ${DURATION_FORMATTER.format(samplesQuery.samples.length)}회 중 지역 안 ${DURATION_FORMATTER.format(filteredSamples.length)}회 · 묶음 ${rows.length}개`
                              : `방문 ${DURATION_FORMATTER.format(samplesQuery.samples.length)}회 · 묶음 ${rows.length}개`
                            : '왼쪽에서 프로젝트를 고르고 표본을 불러오세요.'}
                    </p>
                  </div>
                  <DatasetField label="최소 프로젝트">
                    <select
                      className={compactSelectClass()}
                      value={minProjects}
                      onChange={(event) => setMinProjects(Number(event.target.value) as MinProjects)}
                    >
                      <option value={1}>1개 이상</option>
                      <option value={2}>2개 이상</option>
                      <option value={3}>3개 이상</option>
                    </select>
                  </DatasetField>
                </div>
                <DatasetTabs
                  size="sm"
                  items={[
                    { id: 'new_place', label: `새 장소 후보 ${counts.new_place}` },
                    { id: 'existing_fix', label: `기존 장소 보정 ${counts.existing_fix}` },
                    { id: 'review', label: `확인 필요 ${counts.review}` },
                  ]}
                  activeId={tab}
                  onChange={(id) => setTab(id as ClusterTab)}
                />
              </div>
              <div className="overflow-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>{tab === 'review' ? '상태' : '적용'}</Th>
                      <Th>이름</Th>
                      {tab !== 'existing_fix' ? <Th>유형</Th> : <Th>기존 장소</Th>}
                      <Th>상위</Th>
                      <Th>표본</Th>
                      <Th>반경·체류</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <Td colSpan={6}>
                          <p className="py-6 text-sm text-slate-500">
                            {!samplesQuery.called
                              ? '표본을 먼저 불러오세요.'
                              : samplesQuery.loading
                                ? '묶는 중…'
                                : '이 조건의 묶음이 없습니다.'}
                          </p>
                        </Td>
                      </tr>
                    ) : (
                      visibleRows.map((row) => {
                        const selected = row.id === selectedClusterId;
                        return (
                          <tr
                            key={row.id}
                            className={`cursor-pointer ${selected ? 'bg-[#F8F6FF]' : 'hover:bg-slate-50'}`}
                            onClick={() => {
                              setSelectedClusterId(row.id);
                              setFocusNonce((value) => value + 1);
                            }}
                          >
                            <Td>
                              {row.kind === 'review' ? (
                                <span className="whitespace-nowrap text-xs text-amber-700">
                                  {row.reviewReason === 'too_wide' ? '너무 넓음' : '여러 장소 겹침'}
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  className={datasetTheme.checkbox}
                                  checked={row.enabled}
                                  onChange={(event) => updateRow(row.id, { enabled: event.target.checked })}
                                  aria-label={`${row.name || '묶음'} 적용`}
                                />
                              )}
                            </Td>
                            <Td>
                              {row.kind === 'new_place' ? (
                                <Input
                                  className={`${datasetControlClass} h-8 min-w-[9rem] px-2 text-xs`}
                                  value={row.name}
                                  onChange={(event) => updateRow(row.id, { name: event.target.value })}
                                />
                              ) : (
                                <span className="text-xs text-slate-700">{row.name || row.existingPlace?.name || '이름 없음'}</span>
                              )}
                            </Td>
                            {row.kind === 'existing_fix' ? (
                              <Td>
                                <span className="text-xs text-slate-600">
                                  {row.existingPlace?.code} {row.existingPlace?.name}
                                  {row.existingOffsetM != null
                                    ? ` · 표본과 ${row.existingOffsetM}m`
                                    : ''}
                                  {row.existingRadiusM != null
                                    ? ` · 반경 ${row.existingRadiusM}m → ${row.visitRadiusM}m`
                                    : ''}
                                </span>
                              </Td>
                            ) : (
                              <Td>
                                {row.kind === 'new_place' ? (
                                  <div className="grid gap-1">
                                    <select
                                      className={compactSelectClass()}
                                      value={row.placeType}
                                      onChange={(event) => {
                                        const placeType = event.target.value as CatalogPlaceType;
                                        updateRow(row.id, {
                                          placeType,
                                          parentPlaceId: placeType === 'AREA' ? null : row.parentPlaceId,
                                          otherTypeLabel: placeType === 'OTHER' ? row.otherTypeLabel : '',
                                        });
                                      }}
                                    >
                                      {PLACE_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                          {PLACE_TYPE_LABEL[type]}
                                        </option>
                                      ))}
                                    </select>
                                    {row.placeType === 'OTHER' ? (
                                      <Input
                                        className={`${datasetControlClass} h-8 min-w-[7rem] px-2 text-xs`}
                                        value={row.otherTypeLabel}
                                        onChange={(event) => updateRow(row.id, { otherTypeLabel: event.target.value })}
                                        placeholder="유형 이름"
                                      />
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-600">
                                    {catalogPlaceTypeLabel(row.placeType, row.otherTypeLabel)}
                                    {row.nearbyPlaces.length > 1
                                      ? ` · ${row.nearbyPlaces.map((place) => place.name).join(', ')}`
                                      : ''}
                                  </span>
                                )}
                              </Td>
                            )}
                            <Td>
                              {row.kind === 'new_place' ? (
                                <select
                                  className={compactSelectClass()}
                                  value={row.parentPlaceId ?? ''}
                                  disabled={row.placeType === 'AREA'}
                                  onChange={(event) => {
                                    const parent = areaPlaces.find((place) => place.id === event.target.value) ?? null;
                                    updateRow(row.id, {
                                      parentPlaceId: event.target.value || null,
                                      country: parent?.country || row.country,
                                      regionId: parent?.regionId ?? row.regionId,
                                    });
                                  }}
                                >
                                  <option value="">없음</option>
                                  {areaPlaces.map((place) => (
                                    <option key={place.id} value={place.id}>
                                      {place.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  {areaPlaces.find((place) => place.id === row.parentPlaceId)?.name ?? '없음'}
                                </span>
                              )}
                            </Td>
                            <Td>
                              <span className="whitespace-nowrap text-xs text-slate-600">
                                방문 {row.visitCount} · 프로젝트 {row.projectCount} · {confidenceLabel(row.confidence)}
                              </span>
                            </Td>
                            <Td>
                              <span className="whitespace-nowrap text-xs text-slate-500">
                                {row.visitRadiusM}m · {VISIT_JUDGMENT_TYPE_LABEL[row.visitJudgmentType]} ·{' '}
                                {formatDuration(row.durationMedianMs)}
                                {row.visitMinStayMinutes != null ? ` · 최소 ${row.visitMinStayMinutes}분` : ''}
                              </span>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>
            </DatasetCard>
          </div>
        </div>

        <DatasetPageFooter screenId="T01-09 · 표본으로 장소 만들기" />
      </section>
    </DatasetPageShell>
  );
}
