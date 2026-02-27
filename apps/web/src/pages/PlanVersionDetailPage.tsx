import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VersionSnapshotView } from '../features/plan/components';
import { usePlanVersionDetail, useSetCurrentPlanVersion } from '../features/plan/hooks';
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

export function PlanVersionDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { planId, versionId } = useParams<{ planId: string; versionId: string }>();
  const { version, loading } = usePlanVersionDetail(versionId);
  const { setCurrentPlanVersion, loading: settingCurrent } = useSetCurrentPlanVersion();
  const [confirming, setConfirming] = useState(false);

  if (!planId || !versionId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!version) {
    return <section className="py-8 text-sm text-slate-600">버전을 찾을 수 없습니다.</section>;
  }

  const isCurrent = version.plan.currentVersionId === version.id;
  const pricingBuckets = version.pricing
    ? buildPricingViewBuckets(version.pricing.lines, version.pricing.totalAmountKrw)
    : null;

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {version.plan.title} · v{version.versionNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            고객: {version.plan.user.name} · 지역: {version.plan.region.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/plans/${planId}`)}>
            Plan 상세로
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                `/documents/estimate?mode=version&versionId=${encodeURIComponent(version.id)}`,
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            견적서 PDF
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
            variant="outline"
            disabled={isCurrent || settingCurrent}
            onClick={() => setConfirming(true)}
          >
            {isCurrent ? '현재 버전' : '현재 버전으로 지정'}
          </Button>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 text-sm text-slate-700">
          <div>부모 버전: {version.parentVersionId ? version.parentVersionId.slice(0, 8) : '-'}</div>
          <div>타입: {version.variantType}</div>
          <div>일수: {version.totalDays}</div>
          <div>변경 메모: {version.changeNote ?? '-'}</div>
        </div>
      </Card>

      {version.meta ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">운영 정보</h2>
          <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div>대표자명: {version.meta.leaderName}</div>
            <div>문서번호: {version.meta.documentNumber}</div>
            <div>
              여행기간: {new Date(version.meta.travelStartDate).toLocaleDateString('ko-KR')} ~{' '}
              {new Date(version.meta.travelEndDate).toLocaleDateString('ko-KR')}
            </div>
            <div>
              인원: 총 {version.meta.headcountTotal} (남 {version.meta.headcountMale} / 여 {version.meta.headcountFemale})
            </div>
            <div>차량: {version.meta.vehicleType}</div>
            <div>
              항공권: IN {version.meta.flightInTime} / OUT {version.meta.flightOutTime}
            </div>
            <div>참여 이벤트: {version.meta.events.length > 0 ? version.meta.events.map((item) => item.name).join(', ') : '-'}</div>
            <div>픽/드랍: {version.meta.pickupDropNote ?? '-'}</div>
            <div>실투어 외 픽드랍: {version.meta.externalPickupDropNote ?? '-'}</div>
            <div className="md:col-span-2">
              숙소 추가(일차/개수):{' '}
              {version.meta.extraLodgings.length > 0
                ? version.meta.extraLodgings.map((item) => `${item.dayIndex}일차:${item.lodgingCount}개`).join(', ')
                : '-'}
            </div>
            <div className="md:col-span-2 whitespace-pre-wrap">기본 대여물품: {version.meta.rentalItemsText}</div>
            <div className="md:col-span-2 whitespace-pre-wrap">비고: {version.meta.remark ?? '-'}</div>
          </div>
        </Card>
      ) : null}

      {version.pricing ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">금액 스냅샷</h2>
          {pricingBuckets ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">직원이 확인할 것 (상세)</h3>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium text-slate-900">기본금 {formatKrw(pricingBuckets.baseTotal)}</div>
                  {pricingBuckets.baseLines.length === 0 ? (
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
                          {pricingBuckets.baseLines.map((line) => (
                            <tr key={line.id ?? `${line.lineCode}-${line.amountKrw}`} className="border-b border-slate-100">
                              <td className="py-2 pl-2 pr-3">{getPricingLineLabel(line)}</td>
                              <td className="py-2 pr-3">{line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-'}</td>
                              <td className="py-2 pr-3">{line.quantity}</td>
                              <td className="py-2 pr-2">{formatKrw(line.amountKrw)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium text-slate-900">추가금 {formatKrw(pricingBuckets.addonTotal)}</div>
                  {pricingBuckets.addonLines.length === 0 ? (
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
                          {pricingBuckets.addonLines.map((line) => (
                            <tr key={line.id ?? `${line.lineCode}-${line.description ?? ''}`} className="border-b border-slate-100">
                              <td className="py-2 pr-3">
                                {getPricingLineLabel(line)}
                                {line.description && line.lineCode !== 'MANUAL_ADJUSTMENT' ? (
                                  <div className="text-[11px] text-slate-500">{line.description}</div>
                                ) : null}
                              </td>
                              <td className="py-2 pr-3">{line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-'}</td>
                              <td className="py-2 pr-3">{line.quantity}</td>
                              <td className="py-2">{formatKrw(line.amountKrw)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-medium text-slate-900">보증금 {formatKrw(version.pricing.securityDepositAmountKrw)}</div>
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
                            {version.pricing.securityDepositEvent
                              ? `이벤트(${version.pricing.securityDepositEvent.name})`
                              : '기본 물품'}
                          </td>
                          <td className="py-2 pr-3">
                            {version.pricing.securityDepositMode === 'NONE'
                              ? '-'
                              : `${formatKrw(version.pricing.securityDepositUnitPriceKrw)}(${formatSecurityDepositScope(version.pricing.securityDepositMode)}) x ${version.pricing.securityDepositQuantity}`}
                          </td>
                          <td className="py-2">{formatKrw(version.pricing.securityDepositAmountKrw)}</td>
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
                          <td className="py-2">{formatKrw(version.pricing.depositAmountKrw)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3">잔금</td>
                          <td className="py-2">{formatKrw(version.pricing.balanceAmountKrw)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                <h3 className="text-sm font-semibold text-blue-900">고객이 확인할 것</h3>
                <div className="mt-2 grid gap-2 text-sm text-blue-900">
                  <div>기본금: {formatKrw(pricingBuckets.baseTotal)}</div>
                  <div>추가금: {formatKrw(pricingBuckets.addonTotal)}</div>
                  {pricingBuckets.addonLines.length === 0 ? (
                    <p className="text-xs text-blue-700">추가금 항목이 없습니다.</p>
                  ) : (
                    <div className="max-h-[180px] overflow-auto rounded-lg border border-blue-200 bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-blue-50 text-blue-900">
                          <tr>
                            <th className="px-2 py-2 text-left">항목</th>
                            <th className="px-2 py-2 text-left">금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingBuckets.addonLines.map((line) => (
                            <tr key={`customer-addon-${line.id ?? `${line.lineCode}-${line.amountKrw}`}`} className="border-t border-blue-100">
                              <td className="px-2 py-1.5">{getPricingLineLabel(line)}</td>
                              <td className="px-2 py-1.5">{formatKrw(line.amountKrw)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                      <div className="border-r border-slate-200 px-2 py-4 font-semibold">{formatKrw(pricingBuckets.grandTotal)}</div>
                      <div className="border-r border-slate-200 px-2 py-4">{formatKrw(version.pricing.depositAmountKrw)}</div>
                      <div className="border-r border-slate-200 px-2 py-4">{formatKrw(version.pricing.balanceAmountKrw)}</div>
                      <div className="px-2 py-4">
                        {version.pricing.securityDepositMode === 'NONE'
                          ? formatKrw(0)
                          : `${formatKrw(version.pricing.securityDepositUnitPriceKrw)} (${formatSecurityDepositScope(version.pricing.securityDepositMode)})`}
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

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">현재 버전 변경</h3>
            <p className="mt-1 text-sm text-slate-600">v{version.versionNumber}을 현재 버전으로 지정하시겠습니까?</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                취소
              </Button>
              <Button
                onClick={async () => {
                  await setCurrentPlanVersion(planId, version.id);
                  setConfirming(false);
                }}
              >
                지정
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
