import { useMemo } from 'react';
import type { CatalogPlaceRow } from '../../features/dataset/hooks';
import { STATUS_LABEL, VISIT_JUDGMENT_TYPE_LABEL, catalogPlaceTypeLabel } from '../../features/dataset/labels';
import { DatasetButton, DatasetCard, StubButton } from '../../features/dataset/ui';

interface DatasetPlaceSelectionSummaryProps {
  place: CatalogPlaceRow;
  places: CatalogPlaceRow[];
  onEdit: () => void;
  onOpenDetail: () => void;
  onStub: (message: string) => void;
}

function lodgingDisplayCode(place: CatalogPlaceRow): string {
  const digits = place.code.replace(/\D/g, '') || '000';
  return `HT-${digits.padStart(3, '0')}`;
}

export function DatasetPlaceSelectionSummary({
  place,
  places,
  onEdit,
  onOpenDetail,
  onStub,
}: DatasetPlaceSelectionSummaryProps): JSX.Element {
  const isLodging = place.placeType === 'LODGING';
  const hasCoords = place.latitude != null && place.longitude != null;
  const regionPath = [place.country, place.region?.name, place.parentPlace?.name].filter(Boolean).join(' / ');
  const lodgingCode = lodgingDisplayCode(place);
  const judgmentType = place.visitJudgmentType;
  const radiusM = place.visitRadiusM;
  const stayMinutes = place.visitMinStayMinutes;
  const judgmentSummary = [
    judgmentType ? VISIT_JUDGMENT_TYPE_LABEL[judgmentType] : '유형 미설정',
    radiusM != null ? `반경 ${radiusM}m` : '반경 미설정',
    judgmentType === 'PASS'
      ? '체류 미적용'
      : stayMinutes != null
        ? `체류 ${stayMinutes}분 이상`
        : '체류시간 미설정',
  ].join(' · ');

  const relatedGates = useMemo(
    () => places.filter((row) => row.placeType === 'GATE' && row.parentPlaceId === place.id),
    [place.id, places],
  );
  const primaryGate = relatedGates[0] ?? null;

  const copyGoogleLocation = async () => {
    if (!hasCoords) {
      onStub('좌표가 없어 위치를 복사할 수 없습니다.');
      return;
    }
    const text = `${place.latitude},${place.longitude}`;
    try {
      await navigator.clipboard.writeText(text);
      onStub(`Google 위치를 복사했습니다. ${text}`);
    } catch {
      onStub('위치 복사에 실패했습니다.');
    }
  };

  return (
    <DatasetCard>
      <div className="grid gap-4 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                {place.name} · {place.code}
              </h3>
              <span className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-xs font-medium text-[#5B4BD6] ring-1 ring-inset ring-[#D9D2F8]">
                {isLodging ? `숙소 ${lodgingCode}` : `${catalogPlaceTypeLabel(place.placeType, place.otherTypeLabel)} ${place.code}`}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {regionPath || '-'}
              {place.lodgingLevel ? ` · 숙소 등급 ${place.lodgingLevel.replace('LV.', 'LV')}` : ''}
              {` · ${STATUS_LABEL[place.status]}`}
            </p>
            <p className="text-sm text-slate-500">
              {isLodging
                ? `매입 요금 ${place.rateSummary ?? '요금 미등록'} · 기본 객실`
                : `상위 ${place.parentPlace?.name ?? '없음'} · 좌표 ${hasCoords ? '등록됨' : '미등록'}`}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <DatasetButton type="button" variant="outline" onClick={() => void copyGoogleLocation()}>
              Google 위치 복사
            </DatasetButton>
            <DatasetButton type="button" variant="outline" onClick={onEdit}>
              장소 편집
            </DatasetButton>
            <DatasetButton type="button" variant="soft" onClick={onOpenDetail}>
              {isLodging ? '숙소 상세 보기' : '상세 보기'}
            </DatasetButton>
            <StubButton label="방문 이력 보기" onStub={() => onStub('방문 이력은 다음 단계에서 연결합니다.')} />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#F3FBF6] px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">방문 판정</p>
            <p className="mt-1 text-sm text-slate-700">{judgmentSummary}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              GPS 도착 인정은 이 장소의 반경·체류 규칙으로 판정합니다. 판정 엔진은 아직 연결하지 않았습니다.
            </p>
          </div>
          {isLodging ? (
          <div className="rounded-2xl bg-[#F3FBF6] px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">같은 숙소 원본에 연결된 장소</p>
            <p className="mt-1 text-sm text-slate-700">
              대표 {place.code}
              {primaryGate ? ` · 출입구 ${primaryGate.code}` : ' · 출입구 미연결'}
              {' · 픽업 미연동'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              객실·요금은 숙소 원본을 참조합니다. 미팅·체험장은 별도 장소이며 숙소 원본을 연결하지 않습니다.
            </p>
          </div>
          ) : (
          <div className="rounded-2xl bg-[#F3FBF6] px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">상위 · 하위 장소</p>
            <p className="mt-1 text-sm text-slate-700">
              {place.parentPlace ? `상위 ${place.parentPlace.name}` : '상위 없음'}
              {primaryGate ? ` · 출입구 ${primaryGate.code}` : ''}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              숙소는 그 자체로 장소입니다. 이 유형에는 숙소 원본을 연결하지 않습니다.
            </p>
          </div>
          )}
        </div>
      </div>
    </DatasetCard>
  );
}
