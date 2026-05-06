import { Button, Card } from '@tour/ui';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEstimatePdfDownloadLabel, useEstimatePdfDownload } from '../features/estimate/hooks/use-estimate-pdf-download';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { fromVersion } from '../features/estimate/adapters';
import { useEstimateLocationGuides } from '../features/estimate/hooks/use-estimate-location-guides';
import { applyLocationGuides } from '../features/estimate/utils/apply-location-guides';
import { VersionSnapshotView } from '../features/plan/components';
import { buildExternalTransferDirectionText } from '../features/plan/external-transfer';
import { usePlanVersionDetail } from '../features/plan/hooks';
import { countMainPlanStopRows } from '../features/plan/plan-stop-row';
import { useConfirmTrip } from '../features/confirmed-trip/hooks';
import { formatPickupDropDisplay, formatTransportFlightLines, formatTransportPickupDropLines } from '../features/plan/pickup-drop';
import { buildEffectivePricing, resolveAdjustmentLinesForCustomerDocument, sliceEffectiveTotalsForUi } from '../features/pricing/manual-pricing';
import { resolveDisplayLeadAmount } from '../features/pricing/pricing-line-presenter';
import { toVariantLabel } from '../features/plan/variant-label';
import { buildPricingViewBuckets, getPricingLineLabel } from '../features/pricing/view-model';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

function formatKrw(value: number): string {
  return `${currencyFormatter.format(value)}원`;
}

function formatSecurityDepositScope(mode: 'NONE' | 'PER_PERSON' | 'PER_TEAM'): string {
  if (mode === 'PER_TEAM') {
    return '팀당';
  }
  if (mode === 'PER_PERSON') {
    return '인당';
  }
  return '-';
}

function formatSignedKrw(value: number): string {
  return value > 0 ? `+${formatKrw(value)}` : value < 0 ? `-${formatKrw(Math.abs(value))}` : formatKrw(0);
}

function formatVersionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR');
}

/** ConfirmedTripDetailPage 여행 정보 카드와 동일한 라벨·본문 톤 */
function DetailLabel({ children }: { children: ReactNode }): JSX.Element {
  return <span className="text-slate-500">{children}</span>;
}

function DetailValue({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}): JSX.Element {
  return (
    <p
      className={`mt-0.5 whitespace-pre-wrap font-medium ${muted ? 'text-slate-500' : 'text-slate-900'}`}
    >
      {children}
    </p>
  );
}

function formatPricingLineUnitDisplay(
  line: {
    lineCode: string;
    sourceType: string;
    unitPriceKrw: number | null;
    amountKrw: number;
    quantity: number;
    displayBasis?: string | null;
    displayUnitAmountKrw?: number | null;
    displayDivisorPerson?: number | null;
  },
  headcountTotal: number,
): string {
  const divisorPerson = line.displayDivisorPerson ?? headcountTotal;
  if (line.displayBasis === 'TEAM_DIV_PERSON' && divisorPerson > 0) {
    const unitAmount = line.displayUnitAmountKrw ?? line.unitPriceKrw ?? line.amountKrw;
    return `${formatKrw(unitAmount)}/${divisorPerson}인`;
  }
  if (line.lineCode === 'MANUAL_ADJUSTMENT' && line.sourceType === 'RULE' && line.quantity > 1 && headcountTotal > 0) {
    return `${formatKrw(line.unitPriceKrw ?? line.amountKrw)}/${headcountTotal}인`;
  }
  return line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-';
}

function formatPricingLineQuantityDisplay(
  line: {
    lineCode: string;
    sourceType: string;
    quantity: number;
    displayBasis?: string | null;
    displayCount?: number | null;
    quantityDisplaySuffix?: '박';
  },
  headcountTotal: number,
): string {
  if (line.displayBasis === 'TEAM_DIV_PERSON') {
    const count = line.displayCount ?? line.quantity;
    return count === 1 ? '1회' : `${count}회`;
  }
  if (line.lineCode === 'MANUAL_ADJUSTMENT' && line.sourceType === 'RULE' && line.quantity > 1 && headcountTotal > 0) {
    return `${headcountTotal}인`;
  }
  if (line.quantityDisplaySuffix === '박') {
    return `${line.quantity}박`;
  }
  return String(line.quantity);
}

export function PlanVersionDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { planId, versionId } = useParams<{ planId: string; versionId: string }>();
  const { downloading, phase, downloadEstimatePdf } = useEstimatePdfDownload();
  const { version, loading } = usePlanVersionDetail(versionId);
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides();
  const { confirmTrip, loading: confirmingTrip } = useConfirmTrip();
  const [confirmingTripModal, setConfirmingTripModal] = useState(false);
  const [activePane, setActivePane] = useState<'detail' | 'preview'>('detail');
  const estimateDocumentData = useMemo(
    () => (version ? applyLocationGuides(fromVersion(version), guideRows) : null),
    [guideRows, version],
  );

  if (!planId || !versionId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!version) {
    return <section className="py-8 text-sm text-slate-600">버전을 찾을 수 없습니다.</section>;
  }

  const pricingCtx = {
    headcountTotal: version.meta?.headcountTotal ?? 0,
    totalDays: (() => {
      const counted = countMainPlanStopRows(version.planStops ?? []);
      if (counted > 0) {
        return counted;
      }
      return version.totalDays > 0 ? version.totalDays : 1;
    })(),
  };
  const effectivePricing = version.pricing
    ? buildEffectivePricing(
        version.pricing,
        pricingCtx,
        version.pricing.manualPricing ?? null,
        version.pricing.savedManualDepositAmountKrw ?? undefined,
      )
    : null;
  const effectiveTotalsForUi = effectivePricing ? sliceEffectiveTotalsForUi(effectivePricing) : null;
  const customerAdjustmentLines = effectivePricing
    ? resolveAdjustmentLinesForCustomerDocument(effectivePricing)
    : [];
  const originalPricingSnapshot = version.pricing?.originalPricing ?? null;
  const autoPricingBuckets = version.pricing
    ? buildPricingViewBuckets(
        version.pricing.lines,
        originalPricingSnapshot?.totalAmountKrw ?? version.pricing.totalAmountKrw,
      )
    : null;
  const hasManualPricing = version.pricing?.manualPricing?.enabled === true;
  const outputPricingTitle = hasManualPricing ? '수동 금액' : '고객이 확인할 것';
  const regionSetName = version.regionSet?.name ?? version.plan.regionSet.name;
  const transportGroups = version.meta?.transportGroups ?? [];
  const flightInText =
    transportGroups.length > 0
      ? formatTransportFlightLines(transportGroups, 'IN')
      : `IN ${version.meta?.flightInTime ?? '-'} / OUT ${version.meta?.flightOutTime ?? '-'}`;
  const flightOutText = transportGroups.length > 0 ? formatTransportFlightLines(transportGroups, 'OUT') : '-';
  const pickupText =
    transportGroups.length > 0
      ? formatTransportPickupDropLines(transportGroups, 'pickup')
      : formatPickupDropDisplay(
          version.meta?.pickupDate,
          version.meta?.pickupTime,
          version.meta?.pickupPlaceType,
          version.meta?.pickupPlaceCustomText,
        );
  const dropText =
    transportGroups.length > 0
      ? formatTransportPickupDropLines(transportGroups, 'drop')
      : formatPickupDropDisplay(
          version.meta?.dropDate,
          version.meta?.dropTime,
          version.meta?.dropPlaceType,
          version.meta?.dropPlaceCustomText,
        );
  const externalPickupText =
    buildExternalTransferDirectionText(version.meta?.externalTransfers, transportGroups, 'PICKUP') !== '-'
      ? buildExternalTransferDirectionText(version.meta?.externalTransfers, transportGroups, 'PICKUP')
      : formatPickupDropDisplay(
          version.meta?.externalPickupDate,
          version.meta?.externalPickupTime,
          version.meta?.externalPickupPlaceType,
          version.meta?.externalPickupPlaceCustomText,
        );
  const externalDropText =
    buildExternalTransferDirectionText(version.meta?.externalTransfers, transportGroups, 'DROP') !== '-'
      ? buildExternalTransferDirectionText(version.meta?.externalTransfers, transportGroups, 'DROP')
      : formatPickupDropDisplay(
          version.meta?.externalDropDate,
          version.meta?.externalDropTime,
          version.meta?.externalDropPlaceType,
          version.meta?.externalDropPlaceCustomText,
        );

  const previewPanel = (
    <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">견적서·일정표 미리보기</h2>
          <p className="mt-1 text-xs text-slate-600">PDF와 동일한 레이아웃으로 확인할 수 있습니다.</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
          {guidesLoading ? '여행지 안내 동기화 중' : '저장된 버전'}
        </div>
      </div>
      {estimateDocumentData ? (
        <div className="estimate-preview-frame">
          <EstimateDocument data={estimateDocumentData} viewMode="screen-preview" />
        </div>
      ) : (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          미리보기 데이터를 준비 중입니다...
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900 lg:h-screen lg:min-h-0">
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActivePane('detail')}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              activePane === 'detail' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            상세
          </button>
          <button
            type="button"
            onClick={() => setActivePane('preview')}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              activePane === 'preview' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            미리보기
          </button>
        </div>
      </div>

      <div className="lg:grid lg:h-full lg:min-h-0 lg:grid-cols-2">
        <div
          className={`${
            activePane === 'detail' ? 'block' : 'hidden'
          } border-b border-slate-200 bg-slate-50 lg:block lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-slate-200`}
        >
          <div className="space-y-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {version.plan.title} · v{version.versionNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            고객: {version.plan.user.name} · 지역 세트: {regionSetName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/plans/${planId}`)}>
            Plan 상세로
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void downloadEstimatePdf({
                data: estimateDocumentData ?? applyLocationGuides(fromVersion(version), guideRows),
              }).catch((error) => {
                window.alert(error instanceof Error ? error.message : '견적서 PDF 다운로드에 실패했습니다.');
              });
            }}
            disabled={downloading || guidesLoading || !estimateDocumentData}
          >
            {downloading ? getEstimatePdfDownloadLabel(phase) : '견적서 PDF'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const params = new URLSearchParams({
                userId: version.plan.userId,
                planId,
                parentVersionId: version.id,
              });
              navigate(`/itinerary-builder?${params.toString()}`);
            }}
          >
            이 버전 기반 새 버전 생성
          </Button>
          <Button
            variant="primary"
            disabled={confirmingTrip}
            onClick={() => setConfirmingTripModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            이 견적으로 확정
          </Button>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">버전 정보</h2>
        <div className="grid gap-3 text-sm text-slate-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
            <div>
              <DetailLabel>부모 버전</DetailLabel>
              <DetailValue muted={!version.parentVersionId}>
                {version.parentVersionId ? version.parentVersionId.slice(0, 8) : '-'}
              </DetailValue>
            </div>
            <div>
              <DetailLabel>타입</DetailLabel>
              <DetailValue>{toVariantLabel(version.variantType)}</DetailValue>
            </div>
            <div>
              <DetailLabel>일수</DetailLabel>
              <DetailValue>{version.totalDays}일</DetailValue>
            </div>
            <div>
              <DetailLabel>변경 메모</DetailLabel>
              <DetailValue muted={!version.changeNote?.trim()}>
                {version.changeNote?.trim() ? version.changeNote : '-'}
              </DetailValue>
            </div>
          </div>
        </div>
      </Card>

      {version.meta ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">여행 정보</h2>
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <DetailLabel>대표자</DetailLabel>
                  <DetailValue muted={!version.meta.leaderName?.trim()}>
                    {version.meta.leaderName?.trim() || '-'}
                  </DetailValue>
                </div>
                <div>
                  <DetailLabel>여행지</DetailLabel>
                  <DetailValue>{regionSetName}</DetailValue>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <DetailLabel>여행기간</DetailLabel>
                  <DetailValue>
                    {`${formatVersionDate(version.meta.travelStartDate)} ~ ${formatVersionDate(version.meta.travelEndDate)}`}
                  </DetailValue>
                </div>
                <div>
                  <DetailLabel>인원</DetailLabel>
                  <DetailValue>
                    총 {version.meta.headcountTotal}명 (남 {version.meta.headcountMale} / 여{' '}
                    {version.meta.headcountFemale})
                  </DetailValue>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <DetailLabel>차량</DetailLabel>
                  <DetailValue muted={!version.meta.vehicleType?.trim()}>
                    {version.meta.vehicleType?.trim() || '-'}
                  </DetailValue>
                </div>
                <div>
                  <DetailLabel>문서번호</DetailLabel>
                  <DetailValue muted={!version.meta.documentNumber?.trim()}>
                    {version.meta.documentNumber?.trim() || '-'}
                  </DetailValue>
                </div>
              </div>
              <div>
                <DetailLabel>참여 이벤트</DetailLabel>
                <DetailValue muted={version.meta.events.length === 0}>
                  {version.meta.events.length > 0
                    ? version.meta.events.map((item) => item.name).join(', ')
                    : '-'}
                </DetailValue>
              </div>
              <div>
                <DetailLabel>숙소 추가 (일차/개수)</DetailLabel>
                <DetailValue muted={version.meta.extraLodgings.length === 0}>
                  {version.meta.extraLodgings.length > 0
                    ? version.meta.extraLodgings
                        .map((item) => `${item.dayIndex}일차 · ${item.lodgingCount}개`)
                        .join(' · ')
                    : '-'}
                </DetailValue>
              </div>
              <div>
                <DetailLabel>특이사항</DetailLabel>
                <DetailValue muted={!version.meta.specialNote?.trim()}>
                  {version.meta.specialNote?.trim() ?? '-'}
                </DetailValue>
              </div>
              <div>
                <DetailLabel>대여물품</DetailLabel>
                <div className="mt-1 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                  {version.meta.rentalItemsText?.trim() ? version.meta.rentalItemsText : '-'}
                </div>
              </div>
              <div>
                <DetailLabel>비고</DetailLabel>
                <DetailValue muted={!version.meta.remark?.trim()}>
                  {version.meta.remark?.trim() ?? '-'}
                </DetailValue>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">항공 및 픽드랍</h2>
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <DetailLabel>항공권 IN</DetailLabel>
                  <DetailValue>{flightInText}</DetailValue>
                </div>
                <div>
                  <DetailLabel>항공권 OUT</DetailLabel>
                  <DetailValue>{flightOutText}</DetailValue>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <DetailLabel>픽업</DetailLabel>
                  <DetailValue>{pickupText}</DetailValue>
                </div>
                <div>
                  <DetailLabel>드랍</DetailLabel>
                  <DetailValue>{dropText}</DetailValue>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <DetailLabel>실투어 외 픽업</DetailLabel>
                  <DetailValue>{externalPickupText}</DetailValue>
                </div>
                <div>
                  <DetailLabel>실투어 외 드랍</DetailLabel>
                  <DetailValue>{externalDropText}</DetailValue>
                </div>
              </div>
              {!version.meta.externalPickupDate &&
              !version.meta.externalPickupTime &&
              !version.meta.externalPickupPlaceType &&
              !version.meta.externalPickupPlaceCustomText &&
              !version.meta.externalDropDate &&
              !version.meta.externalDropTime &&
              !version.meta.externalDropPlaceType &&
              !version.meta.externalDropPlaceCustomText &&
              version.meta.externalPickupDropNote ? (
                <div>
                  <DetailLabel>실투어 외 픽드랍</DetailLabel>
                  <DetailValue>{version.meta.externalPickupDropNote}</DetailValue>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {effectivePricing ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">금액 스냅샷</h2>
          {version.pricing?.manualPricing?.enabled ? (
            <p className="mb-3 text-xs text-slate-500">
              수동수정이 저장된 버전입니다. 자동 원본 대비 최종 금액이 반영되어 있습니다.
            </p>
          ) : null}
          {autoPricingBuckets ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">직원이 확인할 것 (상세)</h3>
                {hasManualPricing ? (
                  <p className="mt-1 text-[11px] text-slate-500">아래 값은 자동 계산 원본 기준입니다.</p>
                ) : null}

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium text-slate-900">기본금 {formatKrw(autoPricingBuckets.baseTotal)}</div>
                  {autoPricingBuckets.baseLines.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">기본금 항목이 없습니다.</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <th className="py-2 pl-2 pr-3">항목</th>
                            <th className="py-2 pr-3">가격</th>
                            <th className="py-2 pr-3">개수</th>
                            <th className="py-2 pr-2">금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoPricingBuckets.baseLines.map((line) => (
                            <tr key={line.id ?? `${line.lineCode}-${line.amountKrw}`} className="border-b border-slate-100">
                              <td className="py-2 pl-2 pr-3">{getPricingLineLabel(line)}</td>
                              <td className="py-2 pr-3">{formatPricingLineUnitDisplay(line, pricingCtx.headcountTotal)}</td>
                              <td className="py-2 pr-3">{formatPricingLineQuantityDisplay(line, pricingCtx.headcountTotal)}</td>
                              <td className="py-2 pr-2">{formatKrw(resolveDisplayLeadAmount(line, pricingCtx))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium text-slate-900">추가금 {formatKrw(autoPricingBuckets.addonTotal)}</div>
                  {autoPricingBuckets.addonLines.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">추가금 항목이 없습니다.</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600">
                            <th className="py-2 pr-3">항목</th>
                            <th className="py-2 pr-3">가격</th>
                            <th className="py-2 pr-3">개수</th>
                            <th className="py-2">금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoPricingBuckets.addonLines.map((line) => (
                            <tr key={line.id ?? `${line.lineCode}-${line.description ?? ''}`} className="border-b border-slate-100">
                              <td className="py-2 pr-3">
                                {getPricingLineLabel(line)}
                                {line.description &&
                                line.lineCode !== 'MANUAL_ADJUSTMENT' &&
                                line.lineCode !== 'LODGING_SELECTION' ? (
                                  <div className="text-[11px] text-slate-500">{line.description}</div>
                                ) : null}
                              </td>
                              <td className="py-2 pr-3">{formatPricingLineUnitDisplay(line, pricingCtx.headcountTotal)}</td>
                              <td className="py-2 pr-3">{formatPricingLineQuantityDisplay(line, pricingCtx.headcountTotal)}</td>
                              <td className="py-2">{formatKrw(resolveDisplayLeadAmount(line, pricingCtx))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium text-slate-900">
                    보증금 {formatKrw(originalPricingSnapshot?.securityDepositAmountKrw ?? effectivePricing.securityDepositAmountKrw)}
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th className="py-2 pr-3">항목</th>
                          <th className="py-2 pr-3">기준</th>
                          <th className="py-2">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3">
                            {effectivePricing.securityDepositEvent
                              ? `이벤트(${effectivePricing.securityDepositEvent.name})`
                              : '기본 물품'}
                          </td>
                          <td className="py-2 pr-3">
                            {effectivePricing.securityDepositMode === 'NONE'
                              ? '-'
                              : `${formatKrw(
                                  effectivePricing.securityDepositQuantity > 0
                                    ? Math.round(
                                        (originalPricingSnapshot?.securityDepositAmountKrw ??
                                          effectivePricing.securityDepositAmountKrw) / effectivePricing.securityDepositQuantity,
                                      )
                                    : originalPricingSnapshot?.securityDepositAmountKrw ?? effectivePricing.securityDepositAmountKrw,
                                )}(${formatSecurityDepositScope(effectivePricing.securityDepositMode)}) x ${effectivePricing.securityDepositQuantity}`}
                          </td>
                          <td className="py-2">
                            {formatKrw(originalPricingSnapshot?.securityDepositAmountKrw ?? effectivePricing.securityDepositAmountKrw)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium text-slate-900">예약금/잔금</div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th className="py-2 pr-3">항목</th>
                          <th className="py-2">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3">예약금</td>
                          <td className="py-2">{formatKrw(originalPricingSnapshot?.depositAmountKrw ?? effectivePricing.depositAmountKrw)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3">잔금</td>
                          <td className="py-2">{formatKrw(originalPricingSnapshot?.balanceAmountKrw ?? effectivePricing.balanceAmountKrw)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                <h3 className="text-sm font-semibold text-blue-900">{outputPricingTitle}</h3>
                {hasManualPricing ? (
                  <p className="mt-1 text-[11px] text-blue-800">저장된 수동 출력값 기준으로 분리 표시합니다.</p>
                ) : null}
                <div className="mt-2 grid gap-2 text-sm text-blue-900">
                  <div>기본금: {formatKrw(effectiveTotalsForUi?.baseAmountKrw ?? effectivePricing.baseAmountKrw)}</div>
                  <div>
                    추가금:{' '}
                    {formatKrw(
                      (effectiveTotalsForUi ?? effectivePricing).totalAmountKrw -
                        (effectiveTotalsForUi ?? effectivePricing).baseAmountKrw,
                    )}
                  </div>
                  {customerAdjustmentLines.length === 0 ? (
                    <p className="text-xs text-blue-700">추가금 항목이 없습니다.</p>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-blue-200 bg-white p-3">
                      {customerAdjustmentLines.map((line) => (
                        <div
                          key={`customer-addon-${line.id}`}
                          className="grid gap-2 border-b border-blue-100 pb-2 last:border-b-0 last:pb-0 lg:grid-cols-[minmax(0,1.5fr)_140px_minmax(0,1fr)]"
                        >
                          <div className="font-medium text-slate-900">{line.label}</div>
                          <div className="font-semibold text-slate-900">{formatSignedKrw(line.leadAmountKrw)}</div>
                          <div className="text-slate-600">{line.formula || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 overflow-hidden rounded-lg border border-blue-200 bg-white">
                    <div className="grid grid-cols-4 bg-slate-100 text-center text-[11px] font-medium text-slate-600">
                      <div className="border-r border-slate-200 px-2 py-2">총액(1인)</div>
                      <div className="border-r border-slate-200 px-2 py-2">예약금(1인)</div>
                      <div className="border-r border-slate-200 px-2 py-2">잔금(1인)</div>
                      <div className="px-2 py-2">보증금(팀당/인당)</div>
                    </div>
                    <div className="grid grid-cols-4 text-center text-sm text-slate-900">
                      <div className="border-r border-slate-200 px-2 py-4 font-semibold">
                        {formatKrw((effectiveTotalsForUi ?? effectivePricing).totalAmountKrw)}
                      </div>
                      <div className="border-r border-slate-200 px-2 py-4">
                        {formatKrw((effectiveTotalsForUi ?? effectivePricing).depositAmountKrw)}
                      </div>
                      <div className="border-r border-slate-200 px-2 py-4">
                        {formatKrw((effectiveTotalsForUi ?? effectivePricing).balanceAmountKrw)}
                      </div>
                      <div className="px-2 py-4">
                        {(effectiveTotalsForUi ?? effectivePricing).securityDepositMode === 'NONE'
                          ? formatKrw((effectiveTotalsForUi ?? effectivePricing).securityDepositAmountKrw)
                          : `${formatKrw((effectiveTotalsForUi ?? effectivePricing).securityDepositUnitPriceKrw)} (${formatSecurityDepositScope((effectiveTotalsForUi ?? effectivePricing).securityDepositMode)})`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <VersionSnapshotView version={version} />

          </div>
        </div>

        <aside
          className={`${
            activePane === 'preview' ? 'block' : 'hidden'
          } bg-slate-100/80 lg:block lg:h-full lg:overflow-y-auto`}
        >
          <div className="p-4 sm:p-6 lg:sticky lg:top-0 lg:p-6">{previewPanel}</div>
        </aside>
      </div>

      {confirmingTripModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">여행 확정</h3>
            <p className="mt-1 text-sm text-slate-600">
              v{version.versionNumber}을 확정 견적으로 지정하시겠습니까?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              확정하면 이 견적 기준으로 투어 리스트에 등록됩니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmingTripModal(false)}>
                취소
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={confirmingTrip}
                onClick={async () => {
                  try {
                    await confirmTrip({
                      planId,
                      planVersionId: version.id,
                    });
                    setConfirmingTripModal(false);
                    navigate('/confirmed-trips');
                  } catch (error) {
                    window.alert(
                      error instanceof Error ? error.message : '확정에 실패했습니다.',
                    );
                  }
                }}
              >
                확정
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
