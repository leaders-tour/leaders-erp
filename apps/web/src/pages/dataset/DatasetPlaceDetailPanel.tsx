import { Table, Td, Th } from '@tour/ui';
import { useMemo, useState, type ReactNode } from 'react';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import {
  DatasetPageFooter,
  DatasetStubNotice,
  PLACE_TYPE_LABEL,
  StatusBadge,
  TypePill,
} from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import { DatasetButton, DatasetCard, DatasetTabs, StubButton, datasetControlClass } from '../../features/dataset/ui';

type DetailTab = 'overview' | 'rooms' | 'rates' | 'usage' | 'reviews' | 'history';

interface DatasetPlaceDetailPanelProps {
  place: CatalogPlaceRow;
  places: CatalogPlaceRow[];
  onClose: () => void;
  onStub: (message: string) => void;
}

/** 목업 T01-02용 객실·요금 샘플 (저장 없음) */
const MOCK_ROOM_RATES = [
  {
    id: 'room-basic',
    name: '기본 게르',
    tag: '기본 객실',
    capacity: '4명 / 4명',
    price: '180,000 MNT',
    unit: '객실 · 1박',
    period: '2026.09.01~09.30',
  },
  {
    id: 'room-twin',
    name: '2인 게르',
    tag: null as string | null,
    capacity: '2명 / 2명',
    price: '140,000 MNT',
    unit: '객실 · 1박',
    period: '2026.09.01~09.30',
  },
];

const LODGING_TYPE_UI: Partial<Record<string, string>> = {
  '미니사막 A캠프': '여행자캠프',
  '미니사막 B캠프': '여행자캠프',
};

function lodgingDisplayCode(place: CatalogPlaceRow): string {
  const digits = place.code.replace(/\D/g, '') || '000';
  return `HT-${digits.padStart(3, '0')}`;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-[#9A93C2]">{label}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function SectionHeader({ title, actions }: { title: string; actions?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function PendingPanel({
  title,
  fields,
  onViewAll,
}: {
  title: string;
  fields: string[];
  onViewAll: () => void;
}): JSX.Element {
  return (
    <DatasetCard>
      <SectionHeader
        title={title}
        actions={
          <button type="button" className={`text-xs font-medium ${datasetTheme.link}`} onClick={onViewAll}>
            전체 보기
          </button>
        }
      />
      <div className="grid gap-3 px-4 py-5">
        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${datasetTheme.badgeSoft}`}>
          연동 예정
        </span>
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-[#9A93C2]">{field}</p>
              <p className="mt-1 text-sm text-slate-400">—</p>
            </div>
          ))}
        </div>
      </div>
    </DatasetCard>
  );
}

function StubTabBody({ label }: { label: string }): JSX.Element {
  return (
    <DatasetCard>
      <div className="grid gap-3 px-4 py-10 text-center">
        <span className={`mx-auto inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${datasetTheme.badgeSoft}`}>
          UI만 · 연동 예정
        </span>
        <p className="text-sm text-slate-500">{label} 화면 골격입니다. 다음 단계에서 데이터를 연결합니다.</p>
      </div>
    </DatasetCard>
  );
}

export function DatasetPlaceDetailPanel({
  place,
  places,
  onClose,
  onStub,
}: DatasetPlaceDetailPanelProps): JSX.Element {
  const [tab, setTab] = useState<DetailTab>('overview');
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const isLodging = place.placeType === 'LODGING';
  const hasCoords = place.latitude != null && place.longitude != null;

  const relatedGates = useMemo(
    () => places.filter((row) => row.placeType === 'GATE' && row.parentPlaceId === place.id),
    [place.id, places],
  );

  const primaryGate = relatedGates[0] ?? null;
  const regionPath = [place.country, place.region?.name, place.parentPlace?.name].filter(Boolean).join(' / ');
  const lodgingCode = lodgingDisplayCode(place);
  const lodgingTypeLabel = LODGING_TYPE_UI[place.name] ?? (isLodging ? '숙소' : PLACE_TYPE_LABEL[place.placeType]);

  const titleKind = isLodging ? '숙소 상세' : `${PLACE_TYPE_LABEL[place.placeType]} 상세`;
  const metaLine = isLodging
    ? `숙소 ${lodgingCode} · 대표 장소 ${place.code}${regionPath ? ` · ${regionPath}` : ''}`
    : `${PLACE_TYPE_LABEL[place.placeType]} ${place.code}${regionPath ? ` · ${regionPath}` : ''}`;

  const notifyStub = (message: string) => {
    setStubMessage(message);
    onStub(message);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#2A2155]/35 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-6 sm:px-6">
        <div
          className={`relative my-auto w-full max-w-5xl shadow-2xl ${datasetTheme.card}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dataset-place-detail-title"
        >
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1.5">
                <p className="text-xs font-medium text-[#8B83B8]">장소 · 지역 · 경로 / {titleKind}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="dataset-place-detail-title" className="text-xl font-semibold tracking-tight text-slate-900">
                    {place.name}
                  </h2>
                  {place.lodgingLevel ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${datasetTheme.badgeSoft}`}>
                      {place.lodgingLevel.replace('LV.', 'LV')}
                    </span>
                  ) : (
                    <TypePill label={PLACE_TYPE_LABEL[place.placeType]} tone="violet" />
                  )}
                  <StatusBadge status={place.status} />
                </div>
                <p className="text-xs text-[#9A93C2]">{metaLine}</p>
              </div>
              <div className="flex items-center gap-2">
                {isLodging ? (
                  <StubButton label="숙소 전체 보기" onStub={() => notifyStub('숙소 전체 보기는 다음 단계에서 연결합니다.')} />
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  aria-label="닫기"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-4">
              <DatasetTabs
                size="sm"
                items={[
                  { id: 'overview', label: '개요' },
                  { id: 'rooms', label: '객실' },
                  { id: 'rates', label: '요금' },
                  { id: 'usage', label: '이용기록' },
                  { id: 'reviews', label: '리뷰' },
                  { id: 'history', label: '변경이력' },
                ]}
                activeId={tab}
                onChange={(id) => setTab(id as DetailTab)}
              />
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 sm:px-6">
            {stubMessage ? <DatasetStubNotice message={stubMessage} /> : null}

            {tab === 'overview' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <DatasetCard>
                    <SectionHeader
                      title="기본정보"
                      actions={
                        <StubButton
                          label="정보 수정"
                          variant="soft"
                          onStub={() => notifyStub('정보 수정은 다음 단계에서 구현합니다.')}
                        />
                      }
                    />
                    <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2">
                      <InfoRow label="국가">{place.country}</InfoRow>
                      <InfoRow label="권역">{place.region?.name ?? '-'}</InfoRow>
                      <InfoRow label="상위 목적지">{place.parentPlace?.name ?? '-'}</InfoRow>
                      <InfoRow label={isLodging ? '숙소 유형' : '장소 유형'}>{lodgingTypeLabel}</InfoRow>
                      {isLodging ? (
                        <InfoRow label="숙소 등급">
                          <span className="font-medium text-[#5B4BD6]">{place.lodgingLevel ?? '-'}</span>
                        </InfoRow>
                      ) : (
                        <InfoRow label="코드">{place.code}</InfoRow>
                      )}
                      <InfoRow label="이름">{place.name}</InfoRow>
                    </dl>
                  </DatasetCard>

                  <DatasetCard>
                    <SectionHeader
                      title="위치 · 출입 지점"
                      actions={
                        <>
                          <StubButton
                            label="위치 관리"
                            variant="soft"
                            onStub={() => notifyStub('위치 관리는 다음 단계에서 구현합니다.')}
                          />
                          {hasCoords ? (
                            <DatasetButton
                              type="button"
                              variant="outline"
                              onClick={() =>
                                window.open(`https://www.google.com/maps?q=${place.latitude},${place.longitude}`, '_blank')
                              }
                            >
                              지도 보기
                            </DatasetButton>
                          ) : (
                            <StubButton label="지도 보기" onStub={() => notifyStub('좌표가 없어 지도를 열 수 없습니다.')} />
                          )}
                        </>
                      }
                    />
                    <div className="grid gap-4 px-4 py-4">
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div>
                            <p className="text-xs text-[#9A93C2]">대표 위치</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-800">
                              {place.name} · {place.code}
                            </p>
                          </div>
                          {hasCoords ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/80">
                              좌표 등록됨
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
                              좌표 미등록
                            </span>
                          )}
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs text-[#9A93C2]">차량 출입구</p>
                          <p className="mt-0.5 text-sm font-medium text-slate-800">
                            {primaryGate ? `${primaryGate.name} · ${primaryGate.code}` : '연결 없음'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-dashed border-[#D9D2F8] bg-[#F8F6FF] px-4 py-5">
                        <div className="relative mx-auto flex h-24 max-w-xs items-center justify-between">
                          <div className="absolute left-8 right-8 top-1/2 h-px bg-[#C4B5FD]" aria-hidden="true" />
                          <div className="relative z-10 grid place-items-center gap-1">
                            <span className="h-3.5 w-3.5 rounded-full bg-sky-500 ring-4 ring-sky-100" />
                            <span className="text-[10px] text-slate-500">출입구</span>
                          </div>
                          <div className="relative z-10 grid place-items-center gap-1">
                            <span className="h-4 w-4 rounded-sm bg-emerald-500 ring-4 ring-emerald-100" />
                            <span className="text-[10px] text-slate-500">대표</span>
                          </div>
                        </div>
                        <p className="mt-2 text-center text-[11px] text-[#9A93C2]">위치 개념도 · 실제 지도 아님</p>
                      </div>
                    </div>
                  </DatasetCard>
                </div>

                {isLodging ? (
                  <DatasetCard>
                    <SectionHeader
                      title="객실 · 요금 요약"
                      actions={
                        <>
                          <StubButton
                            label="객실 관리"
                            variant="soft"
                            onStub={() => notifyStub('객실 관리는 다음 단계에서 구현합니다.')}
                          />
                          <StubButton
                            label="요금 관리"
                            variant="soft"
                            onStub={() => notifyStub('요금 관리는 다음 단계에서 구현합니다.')}
                          />
                        </>
                      }
                    />
                    <div className="grid gap-3 px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        <label className="grid gap-1 text-xs font-medium text-slate-500">
                          기준일
                          <input className={datasetControlClass} defaultValue="2026.09.15" readOnly />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-500">
                          요금 구분
                          <select className={datasetControlClass} defaultValue="purchase" disabled>
                            <option value="purchase">매입 요금</option>
                          </select>
                        </label>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <Table>
                          <thead>
                            <tr className="bg-slate-50">
                              <Th>객실 유형</Th>
                              <Th>기준/최대 인원</Th>
                              <Th>요금</Th>
                              <Th>과금 단위</Th>
                              <Th>적용 기간</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {MOCK_ROOM_RATES.map((row) => (
                              <tr key={row.id} className="border-t border-slate-100">
                                <Td>
                                  <div className="font-medium text-slate-900">{row.name}</div>
                                  {row.tag ? <div className="text-xs text-[#9A93C2]">{row.tag}</div> : null}
                                </Td>
                                <Td>{row.capacity}</Td>
                                <Td className="font-medium text-slate-900">{row.price}</Td>
                                <Td>{row.unit}</Td>
                                <Td>{row.period}</Td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                      <p className="text-xs text-[#9A93C2]">
                        요약 표시용 UI · 실제 객실/요금 테이블 연동 전 · 목록 요금 요약: {place.rateSummary ?? '요금 미등록'}
                      </p>
                    </div>
                  </DatasetCard>
                ) : (
                  <DatasetCard>
                    <SectionHeader title="연결 · 요약" />
                    <dl className="grid gap-4 px-4 py-4 sm:grid-cols-3">
                      <InfoRow label="연결정보">{place.linkLabel ?? '연결 없음'}</InfoRow>
                      <InfoRow label="요금 요약">{place.rateSummary ?? '-'}</InfoRow>
                      <InfoRow label="좌표">
                        {hasCoords ? `${place.latitude}, ${place.longitude}` : '미등록'}
                      </InfoRow>
                    </dl>
                  </DatasetCard>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <PendingPanel
                    title="이용기록"
                    fields={['이용일', '여행팀', '사용 객실', '적용 요금']}
                    onViewAll={() => notifyStub('이용기록 전체 보기는 다음 단계에서 연결합니다.')}
                  />
                  <PendingPanel
                    title="리뷰 · 만족도"
                    fields={['평점', '응답 수', '최근 리뷰', '연결 이용기록']}
                    onViewAll={() => notifyStub('리뷰 전체 보기는 다음 단계에서 연결합니다.')}
                  />
                </div>
              </>
            ) : null}

            {tab === 'rooms' ? <StubTabBody label="객실" /> : null}
            {tab === 'rates' ? <StubTabBody label="요금" /> : null}
            {tab === 'usage' ? <StubTabBody label="이용기록" /> : null}
            {tab === 'reviews' ? <StubTabBody label="리뷰" /> : null}
            {tab === 'history' ? <StubTabBody label="변경이력" /> : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <DatasetPageFooter screenId="T01-02 · 숙소 상세" />
              <DatasetButton type="button" variant="primary" onClick={onClose}>
                목록으로 돌아가기
              </DatasetButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
