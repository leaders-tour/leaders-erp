import { Button, Card, Input, Table, Td, Th, searchComboboxTokens } from '@tour/ui';
import { guideLocationNameHasNoWaypointInForm } from '@tour/validation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  formatLocationNameInline,
  includesLocationNameKeyword,
  normalizeLocationNameLines,
} from '../features/location/display';
import { LocationSubNav } from '../features/location/sub-nav';
import { useLocationGuideCrud, type LocationGuideRow } from '../features/location-guide/hooks';

interface FormState {
  description: string;
}

const EMPTY_FORM: FormState = {
  description: '',
};

function autoGuideTitle(locationName: string[] | null | undefined): string {
  const inline = formatLocationNameInline(locationName ?? undefined);
  return inline.length > 0 ? inline : '목적지 안내';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR');
}

function normalizeGuideListSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('ko-KR');
}

function buildGuideListSearchHaystack(
  row: LocationGuideRow,
  formattedUpdatedAt: string,
  regionName: string | undefined,
): string {
  const rawName = row.location?.name;
  const nameLines = rawName ? normalizeLocationNameLines(rawName) : [];
  return [
    row.title,
    row.description,
    row.id,
    row.location?.id ?? '',
    row.locationId ?? '',
    formatLocationNameInline(rawName),
    ...nameLines,
    regionName,
    formattedUpdatedAt,
  ]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .join(' ');
}

function applyGuideListSearch(
  rows: LocationGuideRow[],
  query: string,
  regionByLocationId: Map<string, string>,
): LocationGuideRow[] {
  const tokens = normalizeGuideListSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return rows;
  }
  return rows.filter((row) => {
    const region = row.locationId ? regionByLocationId.get(row.locationId) : undefined;
    const haystack = normalizeGuideListSearchText(
      buildGuideListSearchHaystack(row, formatDate(row.updatedAt), region),
    );
    return tokens.every((token) => haystack.includes(token));
  });
}

/** 단일 목적지 정책에 맞는 가이드(편집 가능) */
function isEditableSingleDestinationGuide(row: LocationGuideRow): boolean {
  return row.location != null && guideLocationNameHasNoWaypointInForm(row.location.name);
}

/** 레거시: 경유/다줄 목적지명에 연결된 가이드 */
function isLegacyCompositeGuide(row: LocationGuideRow): boolean {
  return row.location != null && !guideLocationNameHasNoWaypointInForm(row.location.name);
}

export function LocationGuidePage(): JSX.Element {
  const locationPath = useLocation();
  const crud = useLocationGuideCrud();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewTitle, setPreviewTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const closePreviewButtonRef = useRef<HTMLButtonElement | null>(null);

  const [guideListSearchQuery, setGuideListSearchQuery] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPickSearch, setCreatePickSearch] = useState('');
  const [createPickOpen, setCreatePickOpen] = useState(false);
  const [createSelectedLocationId, setCreateSelectedLocationId] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createImage, setCreateImage] = useState<File | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const createImageInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingLocationsSearchQuery, setPendingLocationsSearchQuery] = useState('');

  const editingRow = editingId ? crud.rows.find((row) => row.id === editingId) : undefined;
  const editingEligible =
    editingRow != null &&
    editingId.length > 0 &&
    isEditableSingleDestinationGuide(editingRow);
  const legacyLocked = editingRow != null && isLegacyCompositeGuide(editingRow);
  const orphanedGuide =
    editingRow != null &&
    editingId.length > 0 &&
    !editingEligible &&
    !legacyLocked;

  const regionByLocationIdForGuideList = useMemo(
    () => new Map(crud.locations.map((l) => [l.id, l.regionName])),
    [crud.locations],
  );

  const filteredGuideRows = useMemo(
    () => applyGuideListSearch(crud.rows, guideListSearchQuery, regionByLocationIdForGuideList),
    [crud.rows, guideListSearchQuery, regionByLocationIdForGuideList],
  );

  const normalizedGuideListSearchQuery = normalizeGuideListSearchText(guideListSearchQuery);

  const singleDestinationLocations = useMemo(
    () => crud.locations.filter((item) => guideLocationNameHasNoWaypointInForm(item.name)),
    [crud.locations],
  );

  /** 가이드가 아직 없는 단일 목적지만 새로 만들 수 있음 */
  const creatableLocations = useMemo(
    () => singleDestinationLocations.filter((item) => item.guide == null),
    [singleDestinationLocations],
  );

  const sortedPendingLocations = useMemo(
    () =>
      [...creatableLocations].sort((a, b) => {
        const ra = `${a.regionName} ${formatLocationNameInline(a.name)}`;
        const rb = `${b.regionName} ${formatLocationNameInline(b.name)}`;
        return ra.localeCompare(rb, 'ko');
      }),
    [creatableLocations],
  );

  const filteredPendingLocations = useMemo(() => {
    const keyword = pendingLocationsSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return sortedPendingLocations;
    }
    return sortedPendingLocations.filter(
      (item) =>
        includesLocationNameKeyword(item.name, keyword) || item.regionName.toLowerCase().includes(keyword),
    );
  }, [pendingLocationsSearchQuery, sortedPendingLocations]);

  const normalizedPendingSearch = normalizeGuideListSearchText(pendingLocationsSearchQuery);

  const filteredCreatePickOptions = useMemo(() => {
    const keyword = createPickSearch.trim().toLowerCase();
    if (!keyword) {
      return creatableLocations;
    }
    return creatableLocations.filter(
      (item) =>
        includesLocationNameKeyword(item.name, keyword) || item.regionName.toLowerCase().includes(keyword),
    );
  }, [creatableLocations, createPickSearch]);

  const createPickSelectedSummary = createSelectedLocationId
    ? crud.locations.find((loc) => loc.id === createSelectedLocationId)
    : undefined;

  const canCreateSubmit =
    createPickSelectedSummary != null &&
    createImage instanceof File &&
    !createSubmitting &&
    guideLocationNameHasNoWaypointInForm(createPickSelectedSummary.name);

  const closePreview = (): void => {
    setPreviewOpen(false);
    setPreviewImages([]);
    setPreviewIndex(0);
    setPreviewTitle('');
  };

  const resetLocationGuideEditModal = (): void => {
    setEditingId('');
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetCreateForm = (): void => {
    setCreateModalOpen(false);
    setCreatePickSearch('');
    setCreatePickOpen(false);
    setCreateSelectedLocationId('');
    setCreateDescription('');
    setCreateImage(null);
    if (createImageInputRef.current) {
      createImageInputRef.current.value = '';
    }
  };

  function openCreateModal(presetLocationId?: string): void {
    setCreatePickSearch('');
    setCreatePickOpen(false);
    setCreateDescription('');
    setCreateImage(null);
    if (createImageInputRef.current) {
      createImageInputRef.current.value = '';
    }
    setCreateSelectedLocationId(presetLocationId ?? '');
    setCreateModalOpen(true);
  }

  useEffect(() => {
    if (!previewOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closePreview();
        return;
      }
      if (previewImages.length <= 1) {
        return;
      }
      if (event.key === 'ArrowRight') {
        setPreviewIndex((prev) => (prev + 1) % previewImages.length);
      }
      if (event.key === 'ArrowLeft') {
        setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => closePreviewButtonRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewImages.length, previewOpen]);

  function openGuidePreview(allUrls: string[], title: string, startIndex: number): void {
    const urls = allUrls.filter((url) => typeof url === 'string' && url.trim().length > 0);
    if (urls.length === 0) {
      return;
    }
    const safeIndex = Math.min(Math.max(0, startIndex), urls.length - 1);
    setPreviewImages(urls);
    setPreviewIndex(safeIndex);
    setPreviewTitle(title);
    setPreviewOpen(true);
  }

  return (
    <section className="grid w-full max-w-none gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={locationPath.pathname} />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">여행지 안내사항</h1>
        <p className="text-sm text-slate-600">
          견적서 3페이지에 들어가는 여행지 안내사항을 생성/수정 할 수 있습니다. 단일 목적지당 이미지 1장만 등록합니다. 경유
          일정은 각 목적지별 가이드를 따로 만들면 견적서에 자동으로 묶입니다.
        </p>
      </header>

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-guide-create-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              resetCreateForm();
            }
          }}
        >
          <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 id="location-guide-create-title" className="text-lg font-semibold text-slate-900">
                여행지 안내 · 등록
              </h2>
              <Button type="button" variant="outline" onClick={() => resetCreateForm()}>
                닫기
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <form
                className="grid items-start gap-4 lg:grid-cols-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!canCreateSubmit || !(createImage instanceof File) || !createPickSelectedSummary) {
                    return;
                  }
                  setCreateSubmitting(true);
                  try {
                    const title = autoGuideTitle(createPickSelectedSummary.name);
                    await crud.createRow({
                      title,
                      description: createDescription,
                      images: [createImage],
                      locationIds: [createPickSelectedSummary.id],
                    });
                    resetCreateForm();
                  } finally {
                    setCreateSubmitting(false);
                  }
                }}
              >
                <div className={`${searchComboboxTokens.section.stack} min-w-0`}>
                  <span className={searchComboboxTokens.section.stepTitle}>목적지</span>
                  <p className={searchComboboxTokens.section.stepSubtitle}>
                    저장 시 제목은 목적지명으로 자동 맞춥니다.
                  </p>
                  <p className={searchComboboxTokens.section.stepSubtitle}>
                    이름에 경유(슬래시·여러 줄)가 없고 안내가 없는 목적지만 선택할 수 있습니다.
                  </p>
                  {createPickSelectedSummary ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {formatLocationNameInline(createPickSelectedSummary.name)} ({createPickSelectedSummary.regionName})
                      <button
                        type="button"
                        className="ml-2 text-xs text-blue-700 underline"
                        onClick={() => {
                          setCreateSelectedLocationId('');
                          setCreatePickSearch('');
                        }}
                      >
                        해제
                      </button>
                    </div>
                  ) : (
                    <div className={searchComboboxTokens.field.relativeWrap}>
                      <Input
                        value={createPickSearch}
                        onFocus={() => setCreatePickOpen(true)}
                        onBlur={() => setTimeout(() => setCreatePickOpen(false), 120)}
                        onChange={(event) => {
                          setCreatePickSearch(event.target.value);
                          setCreatePickOpen(true);
                        }}
                        placeholder="목적지 검색"
                        className={searchComboboxTokens.field.triggerInput}
                      />
                      {createPickOpen ? (
                        <div className={searchComboboxTokens.panel}>
                          {filteredCreatePickOptions.length === 0 ? (
                            <div className={searchComboboxTokens.emptyHint}>
                              {creatableLocations.length === 0
                                ? '새로 등록 가능한 목적지가 없습니다. (단일 줄 이름·기존 안내 미연결 필요)'
                                : '검색 결과가 없습니다.'}
                            </div>
                          ) : (
                            filteredCreatePickOptions.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setCreateSelectedLocationId(item.id);
                                  setCreatePickSearch('');
                                  setCreatePickOpen(false);
                                }}
                                className={searchComboboxTokens.optionRow}
                              >
                                <span>{formatLocationNameInline(item.name)}</span>
                                <span className={searchComboboxTokens.optionSubtitle}>{item.regionName}</span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span>설명 (선택)</span>
                    <textarea
                      value={createDescription}
                      onChange={(event) => setCreateDescription(event.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="비워 두어도 됩니다."
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span>이미지 (1장)</span>
                    <input
                      ref={createImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setCreateImage(file instanceof File ? file : null);
                      }}
                    />
                    <span className="text-xs text-slate-500">
                      jpg / png / webp, 파일당 최대 25MB. 신규 등록 시 이미지 1장이 필요합니다.
                    </span>
                    {createImage instanceof File ? (
                      <span className="text-xs text-slate-600">선택: {createImage.name}</span>
                    ) : null}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="primary" disabled={!canCreateSubmit || createSubmitting}>
                      {createSubmitting ? '저장 중...' : '저장'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => resetCreateForm()}>
                      취소
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>
        </div>
      ) : null}

      {editingId && editingRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-guide-edit-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              resetLocationGuideEditModal();
            }
          }}
        >
          <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 id="location-guide-edit-title" className="text-lg font-semibold text-slate-900">
                {editingEligible
                  ? '여행지 안내 · 수정'
                  : orphanedGuide
                    ? '여행지 안내 (연결 없음)'
                    : '여행지 안내 (편집 제한)'}
              </h2>
              <Button type="button" variant="outline" onClick={() => resetLocationGuideEditModal()}>
                닫기
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {legacyLocked ? (
                <div className="grid gap-3 text-sm text-slate-700">
                  <p>
                    이 안내는 <strong className="text-amber-800">경유·다줄 목적지명</strong>에 연결된 레거시 항목입니다. 새 정책에서는
                    단일 목적지당 안내 1개만 수정할 수 있습니다.
                  </p>
                  <p>
                    필요하면 삭제한 뒤, 각 목적지에 대해 <strong>«만들어진 것»</strong> 표에서{' '}
                    <strong className="text-blue-800">생성</strong> 버튼으로 다시 등록해 주세요.
                  </p>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    연결 목적지:{' '}
                    <span className="font-medium">{formatLocationNameInline(editingRow.location?.name) || '-'}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => resetLocationGuideEditModal()}>
                      닫기
                    </Button>
                  </div>
                </div>
              ) : orphanedGuide ? (
                <div className="grid gap-3 text-sm text-slate-700">
                  <p>
                    목적지에 연결되어 있지 않은 안내입니다. <strong className="text-amber-800">목적지 상세 페이지</strong>에서 연결하거나,
                    필요 없으면 삭제해 주세요.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => resetLocationGuideEditModal()}>
                      닫기
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  className="grid items-start gap-4 lg:grid-cols-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!editingEligible || !editingRow) {
                      return;
                    }

                    setSubmitting(true);
                    try {
                      const title = autoGuideTitle(editingRow.location?.name);
                      const imgs = selectedFile instanceof File ? [selectedFile] : [];

                      await crud.updateRow(editingId, {
                        title,
                        description: form.description,
                        ...(imgs.length > 0 ? { images: imgs } : {}),
                      });
                      resetLocationGuideEditModal();
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <div className={`${searchComboboxTokens.section.stack} min-w-0`}>
                    <span className={searchComboboxTokens.section.stepTitle}>목적지</span>
                    <p className={searchComboboxTokens.section.stepSubtitle}>
                      저장 시 제목은 목적지명으로 자동 맞춥니다.
                    </p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                      {formatLocationNameInline(editingRow.location?.name) || '-'}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      목적지 연결 변경은 목적지 상세에서 처리합니다.
                    </span>
                  </div>
                  <div className="grid gap-3">
                    <label className="grid gap-1 text-sm">
                      <span>설명 (선택)</span>
                      <textarea
                        value={form.description}
                        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                        rows={5}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="비워 두어도 됩니다."
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>이미지 (1장)</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedFile(file instanceof File ? file : null);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <span className="text-xs text-slate-500">
                        jpg / png / webp, 파일당 최대 25MB. 변경하지 않으려면 선택하지 마세요. 현재 저장:{' '}
                        {editingRow.imageUrls.filter((url) => url.trim().length > 0).length}개
                        {editingRow.imageUrls.length > 1 ? (
                          <span className="text-amber-800">
                            {' '}
                            · 다장(레거시)인 경우 새 파일 한 장만 보내면 순서 첫 칸부터 덮어씁니다.
                          </span>
                        ) : null}
                      </span>
                      {selectedFile instanceof File ? (
                        <span className="text-xs text-slate-600">선택: {selectedFile.name}</span>
                      ) : null}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="primary" disabled={submitting}>
                        {submitting ? '저장 중...' : '저장'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => resetLocationGuideEditModal()}>
                        취소
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[1fr_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">만들어진 것</h2>
              <Button type="button" variant="primary" onClick={() => openCreateModal()}>
                생성
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2">
              <label className="w-full min-w-0 sm:max-w-md">
                <span className="sr-only">등록 안내 검색</span>
                <input
                  type="search"
                  value={guideListSearchQuery}
                  onChange={(event) => setGuideListSearchQuery(event.target.value)}
                  placeholder="목적지, 설명, 지역 검색"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </label>
              {normalizedGuideListSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setGuideListSearchQuery('')}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  검색 초기화
                </button>
              ) : null}
            </div>
          </div>
          {filteredGuideRows.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              {crud.rows.length === 0 ? '등록된 소개가 없습니다.' : '검색 결과가 없습니다.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>목적지·안내</Th>
                    <Th>이미지</Th>
                    <Th>수정일</Th>
                    <Th>액션</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuideRows.map((row) => {
                    const primaryName = formatLocationNameInline(row.location?.name) || row.title;
                    const previewLabel = autoGuideTitle(row.location?.name);
                    const legacy = isLegacyCompositeGuide(row);
                    const editable = isEditableSingleDestinationGuide(row);
                    const firstUrl = row.imageUrls.find((url) => url.trim().length > 0);
                    const hasImage = firstUrl != null;
                    return (
                      <tr key={row.id}>
                        <Td>
                          <div className="font-medium text-slate-800">{primaryName}</div>
                          {legacy ? (
                            <div className="mt-1 text-[11px] font-medium text-amber-800">레거시(경유·다줄 연결)</div>
                          ) : null}
                          {row.description.trim().length > 0 ? (
                            <div className="mt-1 max-w-xl whitespace-pre-wrap text-xs text-slate-500">
                              {row.description}
                            </div>
                          ) : null}
                        </Td>
                        <Td className="min-w-[8rem] max-w-[12rem]">
                          {hasImage ? (
                            <button
                              type="button"
                              className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                              onClick={() => openGuidePreview(row.imageUrls, previewLabel, 0)}
                              aria-label={`${previewLabel} 이미지 미리보기`}
                            >
                              <img
                                src={firstUrl}
                                alt={`${previewLabel} 썸네일`}
                                className="h-16 w-24 rounded-md border border-slate-200 object-cover"
                                loading="lazy"
                              />
                              {row.imageUrls.filter((url) => url.trim().length > 0).length > 1 ? (
                                <span className="sr-only">
                                  저장된 이미지 {row.imageUrls.filter((u) => u.trim().length > 0).length}장(레거시)
                                </span>
                              ) : null}
                            </button>
                          ) : (
                            <div className="flex h-16 w-24 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[11px] text-slate-500">
                              없음
                            </div>
                          )}
                        </Td>
                        <Td>{formatDate(row.updatedAt)}</Td>
                        <Td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingId(row.id);
                                setForm({
                                  description: row.description,
                                });
                                setSelectedFile(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                            >
                              {editable ? '수정' : '상세 보기'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                if (!window.confirm('정말 삭제할까요?')) {
                                  return;
                                }
                                await crud.deleteRow(row.id);
                                if (editingId === row.id) {
                                  resetLocationGuideEditModal();
                                }
                              }}
                            >
                              삭제
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">만들어야 하는 것</h2>
            <p className="mb-3 text-xs text-slate-500">
              단일 목적지 이름이고 아직 안내가 없습니다. 선택 시 <strong>생성</strong> 모달이 열리며 해당 목적지가 지정됩니다.
            </p>
            <label className="block w-full min-w-0 sm:max-w-md">
              <span className="sr-only">미등록 목적지 검색</span>
              <input
                type="search"
                value={pendingLocationsSearchQuery}
                onChange={(event) => setPendingLocationsSearchQuery(event.target.value)}
                placeholder="목적지명, 지역 검색"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </label>
            {normalizedPendingSearch ? (
              <button
                type="button"
                onClick={() => setPendingLocationsSearchQuery('')}
                className="mt-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                검색 초기화
              </button>
            ) : null}
          </div>
          {filteredPendingLocations.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              {creatableLocations.length === 0
                ? '추가로 만들 목적지가 없습니다.'
                : '검색 결과가 없습니다.'}
            </div>
          ) : (
            <div className="max-h-[min(70vh,52rem)] overflow-auto">
              <Table>
                <thead className="sticky top-0 z-[1] bg-white shadow-[0_1px_0_0_rgb(226_232_240)]">
                  <tr>
                    <Th>목적지</Th>
                    <Th>지역</Th>
                    <Th className="w-[7rem]">액션</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPendingLocations.map((loc) => (
                    <tr key={loc.id}>
                      <Td>
                        <div className="font-medium text-slate-800">{formatLocationNameInline(loc.name)}</div>
                      </Td>
                      <Td className="text-sm text-slate-600">{loc.regionName}</Td>
                      <Td>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                          onClick={() => openCreateModal(loc.id)}
                        >
                          선택
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {previewOpen && previewImages.length > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-image-preview-title"
        >
          <Card
            className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 id="guide-image-preview-title" className="text-base font-semibold text-slate-900">
                  {previewTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewIndex + 1} / {previewImages.length}
                </p>
              </div>
              <button
                ref={closePreviewButtonRef}
                type="button"
                onClick={closePreview}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                disabled={previewImages.length <= 1}
                onClick={() => setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length)}
              >
                {'<'}
              </Button>
              <img
                src={previewImages[previewIndex]}
                alt={`${previewTitle} 원본 이미지 ${previewIndex + 1}`}
                className="max-h-[75vh] w-full rounded-md border border-slate-200 object-contain"
              />
              <Button
                variant="outline"
                disabled={previewImages.length <= 1}
                onClick={() => setPreviewIndex((prev) => (prev + 1) % previewImages.length)}
              >
                {'>'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
