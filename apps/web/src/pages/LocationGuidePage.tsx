import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import {
  findAnchorLineIndexForGuideLocationName,
  guideLocationNameContainsAnchorToken,
  guideLocationNameHasNoWaypointInForm,
  normalizeGuideLocationNameLines,
  splitLocationNameLineIntoSlashParts,
} from '@tour/validation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatLocationNameInline, includesLocationNameKeyword, normalizeLocationNameLines } from '../features/location/display';
import { LocationSubNav } from '../features/location/sub-nav';
import { useLocationGuideCrud, type GuideLocationOption, type LocationGuideRow } from '../features/location-guide/hooks';

interface FormState {
  title: string;
  description: string;
  locationIds: string[];
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  locationIds: [],
};

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

/** 일괄 반영 매칭 키 초깃값: 목적지명이 단일 줄이면 첫 `/` 왼쪽(또는 전체 줄) 문자열 제안 */
function deriveDefaultBulkAnchorToken(locationNameLines: string[]): string {
  const lines = normalizeGuideLocationNameLines(locationNameLines);
  if (lines.length === 1) {
    const parts = splitLocationNameLineIntoSlashParts(lines[0]!);
    if (parts.length >= 1) {
      return parts[0]!.trim();
    }
  }
  return '';
}

function translateBulkAnchorSkipReason(reason: string): string {
  const map: Record<string, string> = {
    LOCATION_NOT_FOUND: '목적지 없음',
    EMPTY_LOCATION_NAME: '목적지명이 비었음',
    ANCHOR_TOKEN_NOT_MATCHED_LOCATION_NAME: '기준 이름과 맞는 조각이 이름 줄에 없음',
    NO_GUIDE: '기존 소개 없음(생성 미선택)',
    IMAGE_SLOT_LIMIT_EXCEEDED: '이미지 슬롯 20 초과가 됨',
    APPLY_FAILED: '저장 단계 오류',
  };
  return map[reason] ?? reason;
}

/** 일괄 반영 UI: 소개 카드만 있어도 아니며, 현재 매칭 키 줄 슬롯에 이미지 URL이 있을 때만 true */
function isBulkTargetGuideImageFilledForAnchorLine(
  guidesById: Map<string, LocationGuideRow>,
  loc: GuideLocationOption,
  anchorToken: string,
): boolean {
  const lineIndex = findAnchorLineIndexForGuideLocationName(loc.name, anchorToken);
  if (lineIndex == null || loc.guide == null) {
    return false;
  }
  const guideRow = guidesById.get(loc.guide.id);
  const url = guideRow?.imageUrls[lineIndex];
  return typeof url === 'string' && url.trim().length > 0;
}

export function LocationGuidePage(): JSX.Element {
  const locationPath = useLocation();
  const crud = useLocationGuideCrud();

  const guidesById = useMemo(() => {
    const m = new Map<string, LocationGuideRow>();
    for (const row of crud.rows) {
      m.set(row.id, row);
    }
    return m;
  }, [crud.rows]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  /** 목적지명이 여러 줄일 때 줄마다 하나씩 선택 (인덱스 = 목적지명 순서) */
  const [perLineFiles, setPerLineFiles] = useState<(File | null)[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewTitle, setPreviewTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const perLineInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const closePreviewButtonRef = useRef<HTMLButtonElement | null>(null);
  const bulkAnchorImageInputRef = useRef<HTMLInputElement | null>(null);

  const [bulkAnchorPickSearch, setBulkAnchorPickSearch] = useState('');
  const [bulkAnchorPickOpen, setBulkAnchorPickOpen] = useState(false);
  const [bulkAnchorSelectedLocationId, setBulkAnchorSelectedLocationId] = useState<string>('');
  const [bulkMatchingSelectedIds, setBulkMatchingSelectedIds] = useState<string[]>([]);
  const [bulkAnchorImage, setBulkAnchorImage] = useState<File | null>(null);
  const [bulkCreateGuideIfMissing, setBulkCreateGuideIfMissing] = useState(false);
  const [bulkNewGuideTitle, setBulkNewGuideTitle] = useState('');
  const [bulkNewGuideDesc, setBulkNewGuideDesc] = useState('');
  const [bulkAnchorSubmitting, setBulkAnchorSubmitting] = useState(false);
  const [bulkAnchorLastPayload, setBulkAnchorLastPayload] = useState<{
    applied: Array<{ locationId: string; guideId: string; lineIndex: number }>;
    skipped: Array<{ locationId: string; reason: string }>;
  } | null>(null);

  const [guideListSearchQuery, setGuideListSearchQuery] = useState('');

  const editingRow = editingId ? crud.rows.find((row) => row.id === editingId) : undefined;

  const regionByLocationIdForGuideList = useMemo(
    () => new Map(crud.locations.map((l) => [l.id, l.regionName])),
    [crud.locations],
  );

  const filteredGuideRows = useMemo(
    () => applyGuideListSearch(crud.rows, guideListSearchQuery, regionByLocationIdForGuideList),
    [crud.rows, guideListSearchQuery, regionByLocationIdForGuideList],
  );

  const normalizedGuideListSearchQuery = normalizeGuideListSearchText(guideListSearchQuery);

  const anchorBaseEligibleLocations = useMemo(
    () => crud.locations.filter((item) => guideLocationNameHasNoWaypointInForm(item.name)),
    [crud.locations],
  );

  const filteredBulkAnchorPickOptions = useMemo(() => {
    const keyword = bulkAnchorPickSearch.trim().toLowerCase();
    if (!keyword) {
      return anchorBaseEligibleLocations;
    }
    return anchorBaseEligibleLocations.filter(
      (item) =>
        includesLocationNameKeyword(item.name, keyword) || item.regionName.toLowerCase().includes(keyword),
    );
  }, [anchorBaseEligibleLocations, bulkAnchorPickSearch]);

  /** 기준 선택 UI 이후 데이터가 바뀌었을 때 등, 비자격 이름이 선택된 경우 자동 해제 */
  useEffect(() => {
    if (!bulkAnchorSelectedLocationId) {
      return;
    }
    const selected = crud.locations.find((loc) => loc.id === bulkAnchorSelectedLocationId);
    if (selected != null && !guideLocationNameHasNoWaypointInForm(selected.name)) {
      setBulkAnchorSelectedLocationId('');
    }
  }, [bulkAnchorSelectedLocationId, crud.locations]);

  const anchorPickSelectedSummary = bulkAnchorSelectedLocationId
    ? crud.locations.find((loc) => loc.id === bulkAnchorSelectedLocationId)
    : undefined;

  const derivedBulkAnchorToken = useMemo(() => {
    if (!anchorPickSelectedSummary) {
      return '';
    }
    return deriveDefaultBulkAnchorToken(anchorPickSelectedSummary.name).trim();
  }, [anchorPickSelectedSummary]);

  const bulkMatchingLocations = useMemo(() => {
    if (derivedBulkAnchorToken.length === 0) {
      return [];
    }
    return crud.locations.filter((loc) => guideLocationNameContainsAnchorToken(loc.name, derivedBulkAnchorToken));
  }, [derivedBulkAnchorToken, crud.locations]);

  const bulkMatchingLocationsSorted = useMemo(
    () =>
      [...bulkMatchingLocations].sort((a, b) => {
        const ra = `${a.regionName} ${formatLocationNameInline(a.name)}`;
        const rb = `${b.regionName} ${formatLocationNameInline(b.name)}`;
        return ra.localeCompare(rb, 'ko');
      }),
    [bulkMatchingLocations],
  );

  const bulkMatchIdsSignature = useMemo(
    () => bulkMatchingLocations.map((l) => l.id).sort().join('|'),
    [bulkMatchingLocations],
  );

  useEffect(() => {
    setBulkMatchingSelectedIds(bulkMatchingLocations.map((l) => l.id));
  }, [bulkMatchingLocations, bulkMatchIdsSignature]);

  const toggleBulkMatchingId = (id: string): void => {
    setBulkMatchingSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canBulkApplyAnchorSubmit =
    anchorPickSelectedSummary != null &&
    derivedBulkAnchorToken.length > 0 &&
    bulkMatchingSelectedIds.length > 0 &&
    bulkAnchorImage instanceof File &&
    !bulkAnchorSubmitting;

  const editLocationLines = useMemo(
    () => (editingRow?.location?.name ? normalizeLocationNameLines(editingRow.location.name) : []),
    [editingRow?.location?.name],
  );

  const splitImageSlotCount = editingId && editLocationLines.length >= 2 ? editLocationLines.length : 0;

  const splitLineLabels = editingId ? editLocationLines : [];

  useEffect(() => {
    if (splitImageSlotCount < 2) {
      setPerLineFiles([]);
      perLineInputRefs.current = [];
      return;
    }
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPerLineFiles((prev) => {
      if (prev.length === splitImageSlotCount) {
        return prev;
      }
      return Array.from({ length: splitImageSlotCount }, () => null);
    });
    perLineInputRefs.current = Array.from({ length: splitImageSlotCount }, (_, i) => perLineInputRefs.current[i] ?? null);
  }, [splitImageSlotCount]);

  const perLineImagesComplete =
    splitImageSlotCount >= 2 && perLineFiles.length === splitImageSlotCount && perLineFiles.every((f): f is File => f instanceof File);

  const partialPerLineSelection =
    splitImageSlotCount >= 2 && perLineFiles.some((f) => f instanceof File) && !perLineImagesComplete;

  const canSubmit =
    editingId.trim().length > 0 &&
    form.title.trim().length > 0 &&
    !partialPerLineSelection;

  /** 업로드 뮤테이션에 넘길 파일 목록 — 줄별 모드에서는 순서 고정 배열 */
  const resolveImagesPayload = (): File[] | undefined => {
    if (splitImageSlotCount >= 2 && perLineImagesComplete) {
      return perLineFiles.filter((f): f is File => f instanceof File);
    }
    if (selectedFiles.length > 0) {
      return selectedFiles;
    }
    return undefined;
  };

  const closePreview = (): void => {
    setPreviewOpen(false);
    setPreviewImages([]);
    setPreviewIndex(0);
    setPreviewTitle('');
  };

  const resetLocationGuideEditModal = (): void => {
    setEditingId('');
    setForm(EMPTY_FORM);
    setSelectedFiles([]);
    setPerLineFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    perLineInputRefs.current.forEach((el) => {
      if (el) el.value = '';
    });
    perLineInputRefs.current = [];
  };

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

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={locationPath.pathname} />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">여행지 안내사항</h1>
        <p className="text-sm text-slate-600">
          견적서 3페이지에 들어가는 여행지 안내사항을 생성/수정 할 수 있습니다.
        </p>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">기준목적지로 이미지 일괄 반영</h2>
        <div className="grid gap-4 items-start lg:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">1) 기준 목적지 선택</span>
            <p className="text-[11px] leading-relaxed text-slate-500">단일 목적지만 검색됩니다 (경유지x)</p>
            {anchorPickSelectedSummary ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {formatLocationNameInline(anchorPickSelectedSummary.name)} ({anchorPickSelectedSummary.regionName})
                <button
                  type="button"
                  className="ml-2 text-xs text-blue-700 underline"
                  onClick={() => {
                    setBulkAnchorSelectedLocationId('');
                    setBulkAnchorPickSearch('');
                  }}
                >
                  해제
                </button>
              </div>
            ) : (
              <>
                <div className="relative min-w-0">
                  <Input
                    value={bulkAnchorPickSearch}
                    onFocus={() => setBulkAnchorPickOpen(true)}
                    onBlur={() => setTimeout(() => setBulkAnchorPickOpen(false), 120)}
                    onChange={(event) => {
                      setBulkAnchorPickSearch(event.target.value);
                      setBulkAnchorPickOpen(true);
                    }}
                    placeholder="기준 목적지 검색"
                    className="w-full"
                  />
                  {bulkAnchorPickOpen ? (
                    <div className="absolute left-0 right-0 top-[44px] z-20 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {filteredBulkAnchorPickOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">
                          {anchorBaseEligibleLocations.length === 0
                            ? '이 조건을 만족하는 목적지가 없습니다. (이름 줄 1개, 슬래시 경유 없음)'
                            : '검색 결과가 없습니다.'}
                        </div>
                      ) : (
                        filteredBulkAnchorPickOptions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setBulkAnchorSelectedLocationId(item.id);
                              setBulkAnchorPickSearch('');
                              setBulkAnchorPickOpen(false);
                            }}
                            className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            <span>{formatLocationNameInline(item.name)}</span>
                            <span className="text-[11px] text-slate-500">{item.regionName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">2) 대상 목록</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setBulkMatchingSelectedIds(bulkMatchingLocations.map((l) => l.id))}
                  disabled={bulkMatchingLocations.length === 0}
                >
                  전체 선택
                </Button>
                <Button type="button" variant="outline" className="text-xs" onClick={() => setBulkMatchingSelectedIds([])}>
                  전체 해제
                </Button>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              경유지, 단일 목적지가 모두 목록에 포함됩니다. 해당 줄 칸의 기존 이미지는 새 이미지로 덮어씁니다.
            </p>
            <div className="max-h-52 overflow-auto rounded-xl border border-slate-200">
              {!anchorPickSelectedSummary ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500">먼저 왼쪽에서 기준 목적지를 선택하세요.</div>
              ) : derivedBulkAnchorToken.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-amber-800">
                  기준 목적지명에서 매칭 키를 만들 수 없습니다.
                </div>
              ) : bulkMatchingLocationsSorted.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-amber-800">매칭되는 목적지가 없습니다.</div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600">
                    <tr>
                      <th className="w-10 border-b border-slate-200 px-2 py-1.5"></th>
                      <th className="border-b border-slate-200 px-2 py-1.5">목적지</th>
                      <th className="border-b border-slate-200 px-2 py-1.5">기준 이미지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkMatchingLocationsSorted.map((loc) => {
                      const isAnchorRow = bulkAnchorSelectedLocationId === loc.id && bulkAnchorSelectedLocationId.length > 0;
                      return (
                        <tr
                          key={loc.id}
                          className={`border-t border-slate-100 ${isAnchorRow ? 'bg-blue-50/80' : 'bg-white'}`}
                        >
                          <td className="px-2 py-1.5 align-top">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300"
                              checked={bulkMatchingSelectedIds.includes(loc.id)}
                              onChange={() => toggleBulkMatchingId(loc.id)}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top text-slate-800">
                            {formatLocationNameInline(loc.name)}
                            <div className="text-[10px] text-slate-500">{loc.regionName}</div>
                          </td>
                          <td className="px-2 py-1.5 align-top text-[11px] text-slate-600">
                            {isBulkTargetGuideImageFilledForAnchorLine(guidesById, loc, derivedBulkAnchorToken) ? (
                              '연결됨'
                            ) : (
                              <span className="text-amber-800">미연결</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span className="text-sm font-semibold text-slate-800">3) 이미지 업로드 및 실행</span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-slate-700">
              <input
                ref={bulkAnchorImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setBulkAnchorImage(file instanceof File ? file : null);
                }}
              />
            </label>
            {bulkAnchorImage instanceof File ? (
              <span className="text-xs text-slate-600">{bulkAnchorImage.name}</span>
            ) : null}
          </div>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              checked={bulkCreateGuideIfMissing}
              onChange={(event) => setBulkCreateGuideIfMissing(event.target.checked)}
            />
            <span className="text-slate-700">소개가 없으면 새로 만들기</span>
            <span className="text-[11px] text-slate-500">기본 제목 «목적지 안내», 나머지 줄 이미지는 빈 문자열 칸 유지</span>
          </label>
          {bulkCreateGuideIfMissing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>생성 시 제목(선택, 비우면 목적지 안내)</span>
                <Input
                  value={bulkNewGuideTitle}
                  onChange={(event) => setBulkNewGuideTitle(event.target.value)}
                  placeholder="목적지 안내"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>생성 시 설명(선택)</span>
                <Input value={bulkNewGuideDesc} onChange={(event) => setBulkNewGuideDesc(event.target.value)} placeholder="" />
              </label>
            </div>
          ) : null}
          <Button
            type="button"
            variant="primary"
            disabled={!canBulkApplyAnchorSubmit}
            onClick={async () => {
              if (!canBulkApplyAnchorSubmit || !(bulkAnchorImage instanceof File)) {
                return;
              }
              setBulkAnchorSubmitting(true);
              try {
                const payload = await crud.bulkApplyAnchorImage({
                  anchorToken: derivedBulkAnchorToken,
                  locationIds: bulkMatchingSelectedIds,
                  image: bulkAnchorImage,
                  createGuideIfMissing: bulkCreateGuideIfMissing,
                  titleForNewGuide: bulkNewGuideTitle.trim() || undefined,
                  descriptionForNewGuide: bulkNewGuideDesc.trim() || undefined,
                });
                setBulkAnchorLastPayload({ applied: payload.applied, skipped: payload.skipped });
                setBulkAnchorImage(null);
                if (bulkAnchorImageInputRef.current) {
                  bulkAnchorImageInputRef.current.value = '';
                }
              } finally {
                setBulkAnchorSubmitting(false);
              }
            }}
          >
            {bulkAnchorSubmitting ? '일괄 적용 중...' : '선택 목적지에 반영'}
          </Button>
        </div>
        {bulkAnchorLastPayload ? (
          <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
            <div>
              적용 성공 <span className="font-semibold">{bulkAnchorLastPayload.applied.length}</span>건 · 건너뜀{' '}
              <span className="font-semibold text-amber-800">{bulkAnchorLastPayload.skipped.length}</span>건
            </div>
            {bulkAnchorLastPayload.skipped.length > 0 ? (
              <ul className="max-h-32 list-disc overflow-auto pl-4 text-[11px] text-slate-600">
                {bulkAnchorLastPayload.skipped.map((row) => (
                  <li key={row.locationId}>
                    ID {row.locationId.slice(0, 8)}… — {translateBulkAnchorSkipReason(row.reason)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Card>

      {editingId ? (
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
          <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 id="location-guide-edit-title" className="text-lg font-semibold text-slate-900">
                소개 수정
              </h2>
              <Button type="button" variant="outline" onClick={() => resetLocationGuideEditModal()}>
                닫기
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canSubmit) {
                return;
              }

              setSubmitting(true);
              try {
                const imagesPayload = resolveImagesPayload();

                await crud.updateRow(editingId, {
                  title: form.title,
                  description: form.description,
                  images: imagesPayload,
                });
                resetLocationGuideEditModal();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label className="grid gap-1 text-sm">
              <span>제목</span>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="예: 바양작 A 경유 소개"
              />
            </label>
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
            <div className="grid gap-2 text-sm">
              <span className="text-slate-700">연결된 목적지</span>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                {formatLocationNameInline(editingRow?.location?.name) || '-'}
              </p>
              <span className="text-xs text-slate-500">연결 변경은 목적지 상세에서 해제/재연결로 처리합니다.</span>
            </div>
            {splitImageSlotCount >= 2 ? (
            <div className="grid gap-3">
              <div className="text-sm">
                <span className="font-semibold text-slate-800">
                  이미지 (줄별, 선택 시 전체 교체)
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  경유 구간처럼 목적지명이 여러 줄이면 줄마다 파일 칸을 띄웁니다. jpg/png/webp, 파일당 최대 25MB. 순서는 위 목적지명
                  줄과 같아야 합니다.
                </p>
              </div>
              {splitLineLabels.map((lineLabel, index) => (
                <div
                  key={`${lineLabel}-${index}`}
                  className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <span className="text-xs font-semibold text-slate-800">
                    {index + 1}. {lineLabel || `목적지명 ${index + 1}줄`}
                  </span>
                  <input
                    ref={(el) => {
                      perLineInputRefs.current[index] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setPerLineFiles((prev) => {
                        const base =
                          prev.length === splitImageSlotCount
                            ? [...prev]
                            : Array.from({ length: splitImageSlotCount }, () => null);
                        base[index] = file;
                        return base;
                      });
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                  />
                  {perLineFiles[index] instanceof File ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>선택: {(perLineFiles[index] as File).name}</span>
                      <button
                        type="button"
                        className="text-blue-700 underline"
                        onClick={() => {
                          setPerLineFiles((prev) => {
                            const next = [...prev];
                            next[index] = null;
                            return next;
                          });
                          const el = perLineInputRefs.current[index];
                          if (el) el.value = '';
                        }}
                      >
                        지우기
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {partialPerLineSelection ? (
                <p className="text-xs text-amber-700">각 줄에 파일을 모두 선택하거나, 모두 비워 두세요.</p>
              ) : null}
              {editingRow ? (
                <span className="text-xs text-slate-500">
                  현재 저장된 이미지: {editingRow.imageUrls.length}개 · 목적지명 {editLocationLines.length}줄
                </span>
              ) : null}
            </div>
          ) : (
            <label className="grid gap-1 text-sm">
              <span>이미지 파일 (선택 시 전체 교체)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  setSelectedFiles(files);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <span className="text-xs text-slate-500">
                허용 형식: jpg/png/webp, 파일당 최대 25MB, 최대 20장. 목적지명이 두 줄 이상이면 위와 같이 줄별 칸이 열립니다.
              </span>
              {editingRow ? (
                <span className="text-xs text-slate-500">
                  현재 저장된 이미지: {editingRow.imageUrls.length}개
                  {(() => {
                    const lineCount = editingRow.location?.name
                      ? normalizeLocationNameLines(editingRow.location.name).length
                      : 0;
                    if (lineCount <= 0) {
                      return null;
                    }
                    const ok = editingRow.imageUrls.length >= lineCount;
                    return ok ? (
                      <>
                        {' '}
                        · 목적지명 {lineCount}줄 — <span className="text-emerald-700">권장 개수 충족</span>
                      </>
                    ) : (
                      <>
                        {' '}
                        · 목적지명 {lineCount}줄 —{' '}
                        <span className="text-amber-700">
                          이미지를 {lineCount}장 이상 채우면 뒷줄 이름도 견적서에 반영됩니다
                        </span>
                      </>
                    );
                  })()}
                </span>
              ) : null}
              {selectedFiles.length > 0 ? (
                <span className="text-xs text-slate-600">선택된 새 이미지: {selectedFiles.length}개</span>
              ) : null}
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="default" disabled={!canSubmit || submitting}>
              {submitting ? '저장 중...' : '수정 저장'}
            </Button>
            <Button type="button" variant="outline" onClick={() => resetLocationGuideEditModal()}>
              취소
            </Button>
          </div>
        </form>
            </div>
          </Card>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">소개 목록</h2>
          <div className="flex flex-wrap items-center justify-start gap-2">
            <label className="w-full min-w-[16rem] md:w-[28rem]">
              <span className="sr-only">소개 목록 검색</span>
              <input
                type="search"
                value={guideListSearchQuery}
                onChange={(event) => setGuideListSearchQuery(event.target.value)}
                placeholder="제목, 설명, 목적지, 지역 검색"
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
        <Table>
          <thead>
            <tr>
              <Th>제목</Th>
              <Th>연결 목적지</Th>
              <Th>이미지·준비</Th>
              <Th>수정일</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {filteredGuideRows.map((row) => {
              const nameLines = normalizeLocationNameLines(row.location?.name);
              const expectedImages = nameLines.length > 0 ? nameLines.length : 1;
              const readyOk = row.imageUrls.length >= expectedImages;
              return (
              <tr key={row.id}>
                <Td>
                  <div className="font-medium text-slate-800">{row.title}</div>
                  <div className="mt-1 max-w-xl whitespace-pre-wrap text-xs text-slate-500">{row.description}</div>
                </Td>
                <Td>{formatLocationNameInline(row.location?.name) || '-'}</Td>
                <Td className="w-[140px]">
                  <div className="grid gap-1">
                  {row.imageUrls.length > 0 ? (
                    <button
                      type="button"
                      className="relative inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                      onClick={() => {
                        setPreviewImages(row.imageUrls);
                        setPreviewIndex(0);
                        setPreviewTitle(row.title);
                        setPreviewOpen(true);
                      }}
                      aria-label={`${row.title} 이미지 미리보기 열기`}
                    >
                      <img
                        src={row.imageUrls[0]}
                        alt={`${row.title} 썸네일`}
                        className="h-16 w-24 rounded-md border border-slate-200 object-cover"
                        loading="lazy"
                      />
                      {row.imageUrls.length > 1 ? (
                        <span className="absolute -right-2 -top-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                          +{row.imageUrls.length - 1}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[11px] text-slate-500">
                      이미지 없음
                    </div>
                  )}
                  <span
                    className={`text-[10px] font-medium ${readyOk ? 'text-emerald-700' : 'text-amber-800'}`}
                  >
                    {row.imageUrls.length}/{expectedImages}장
                    {nameLines.length > 1 ? ' · 경유명 줄 수 반영' : ''}
                  </span>
                  </div>
                </Td>
                <Td>{formatDate(row.updatedAt)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          title: row.title,
                          description: row.description,
                          locationIds: row.locationId ? [row.locationId] : [],
                        });
                        setSelectedFiles([]);
                        setPerLineFiles([]);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        perLineInputRefs.current.forEach((el) => {
                          if (el) el.value = '';
                        });
                        perLineInputRefs.current = [];
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!window.confirm('정말 삭제할까요?')) {
                          return;
                        }
                        await crud.deleteRow(row.id);
                        if (editingId === row.id) {
                          setEditingId('');
                          setForm(EMPTY_FORM);
                          setSelectedFiles([]);
                          setPerLineFiles([]);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                          perLineInputRefs.current.forEach((el) => {
                            if (el) el.value = '';
                          });
                          perLineInputRefs.current = [];
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
        )}
      </Card>

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
