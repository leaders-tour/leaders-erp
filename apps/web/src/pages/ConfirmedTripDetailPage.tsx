import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useConfirmedTrip,
  useUpdateConfirmedTrip,
  useCancelConfirmedTrip,
  getTripStartDate,
  getTripEndDate,
  getTripLeaderName,
  getTripHeadcount,
  getTripDestination,
} from '../features/confirmed-trip/hooks';
import { useGuides } from '../features/guide/hooks';
import { useDrivers } from '../features/driver/hooks';
import { LodgingSection } from '../features/confirmed-trip/LodgingSection';

interface AttachmentItem {
  filename: string;
  url: string;
  type: string;
}

function AttachmentsCard({ attachments }: { attachments: AttachmentItem[] }) {
  const [preview, setPreview] = useState<AttachmentItem | null>(null);

  const images = attachments.filter((a) => a.type === 'image');
  const pdfs = attachments.filter((a) => a.type === 'pdf');

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">첨부파일</h2>

      {/* 이미지 그리드 */}
      {images.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">이미지 ({images.length})</p>
          <div className="flex flex-wrap gap-3">
            {images.map((att) => (
              <button
                key={att.url}
                onClick={() => setPreview(preview?.url === att.url ? null : att)}
                className="relative overflow-hidden rounded-xl border border-slate-200 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                title={att.filename}
              >
                <img
                  src={att.url}
                  alt={att.filename}
                  className="h-28 w-28 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                {preview?.url === att.url && (
                  <div className="absolute inset-0 bg-blue-500/20 ring-2 ring-blue-500 rounded-xl" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF 목록 */}
      {pdfs.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">PDF ({pdfs.length})</p>
          <ul className="grid gap-1.5">
            {pdfs.map((att) => (
              <li key={att.url}>
                <button
                  onClick={() => setPreview(preview?.url === att.url ? null : att)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-sm text-left transition-colors
                    ${preview?.url === att.url
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-slate-100 hover:border-slate-300 text-slate-700'
                    }`}
                >
                  <span className="text-base shrink-0">📄</span>
                  <span className="flex-1 truncate font-medium">{att.filename}</span>
                  <span className="text-xs text-slate-400">{preview?.url === att.url ? '▲ 닫기' : '▼ 미리보기'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 인라인 미리보기 */}
      {preview && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
            <p className="truncate text-xs font-medium text-slate-600">{preview.filename}</p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                새 탭으로 열기 ↗
              </a>
              <button
                onClick={() => setPreview(null)}
                className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          </div>
          {preview.type === 'image' ? (
            <div className="flex justify-center p-4 bg-slate-100">
              <img
                src={preview.url}
                alt={preview.filename}
                className="max-h-[600px] max-w-full rounded-lg object-contain shadow"
              />
            </div>
          ) : (
            <iframe
              src={preview.url}
              title={preview.filename}
              className="h-[700px] w-full"
            />
          )}
        </div>
      )}
    </Card>
  );
}

const currencyFormatter = new Intl.NumberFormat('ko-KR');
function formatKrw(value: number): string {
  return `${currencyFormatter.format(value)}원`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR');
}

export function ConfirmedTripDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const { trip, loading } = useConfirmedTrip(tripId);
  const { updateConfirmedTrip, loading: updating } = useUpdateConfirmedTrip();
  const { cancelConfirmedTrip, loading: cancelling } = useCancelConfirmedTrip();

  const { guides } = useGuides({ status: 'ACTIVE_SEASON' });
  const { drivers } = useDrivers({ status: 'ACTIVE_SEASON' });

  const [editing, setEditing] = useState(false);
  const [guideName, setGuideName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [guideId, setGuideId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [guideManual, setGuideManual] = useState(false);
  const [driverManual, setDriverManual] = useState(false);
  const [assignedVehicle, setAssignedVehicle] = useState('');
  const [accommodationNote, setAccommodationNote] = useState('');
  const [operationNote, setOperationNote] = useState('');

  if (!tripId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!trip) {
    return <section className="py-8 text-sm text-slate-600">확정 건을 찾을 수 없습니다.</section>;
  }

  const meta = trip.planVersion?.meta ?? null;
  const pricing = trip.planVersion?.pricing ?? null;

  const startEditMode = () => {
    const hasGuideEntity = !!trip.guide;
    const hasDriverEntity = !!trip.driver;
    setGuideId(trip.guide?.id ?? null);
    setDriverId(trip.driver?.id ?? null);
    setGuideName(trip.guideName ?? '');
    setDriverName(trip.driverName ?? '');
    setGuideManual(!hasGuideEntity);
    setDriverManual(!hasDriverEntity);
    setAssignedVehicle(trip.assignedVehicle ?? '');
    setAccommodationNote(trip.accommodationNote ?? '');
    setOperationNote(trip.operationNote ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const resolvedGuideId = guideManual ? null : guideId;
      const resolvedDriverId = driverManual ? null : driverId;

      let resolvedGuideName = guideName.trim() || null;
      let resolvedDriverName = driverName.trim() || null;

      if (!guideManual && resolvedGuideId) {
        const g = guides.find((x) => x.id === resolvedGuideId);
        if (g) resolvedGuideName = g.nameKo;
      }
      if (!driverManual && resolvedDriverId) {
        const d = drivers.find((x) => x.id === resolvedDriverId);
        if (d) resolvedDriverName = d.nameMn;
      }

      await updateConfirmedTrip(tripId, {
        guideName: resolvedGuideName,
        driverName: resolvedDriverName,
        guideId: resolvedGuideId,
        driverId: resolvedDriverId,
        assignedVehicle: assignedVehicle.trim() || null,
        accommodationNote: accommodationNote.trim() || null,
        operationNote: operationNote.trim() || null,
      });
      setEditing(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('정말 이 확정 건을 취소하시겠습니까?')) return;
    try {
      await cancelConfirmedTrip(tripId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '취소에 실패했습니다.');
    }
  };

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {getTripLeaderName(trip)}
          </h1>
          {trip.plan && trip.planVersion ? (
            <p className="mt-1 text-sm text-slate-600">
              {trip.plan.title} · v{trip.planVersion.versionNumber} · {trip.plan.regionSet.name}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">노션 마이그레이션 데이터</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/confirmed-trips')}>
            목록으로
          </Button>
          {trip.planId && trip.planVersionId ? (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/plans/${trip.planId}/versions/${trip.planVersionId}`,
                )
              }
            >
              견적서 상세
            </Button>
          ) : null}
          {trip.status === 'ACTIVE' && !editing ? (
            <Button variant="primary" onClick={startEditMode}>
              운영 정보 편집
            </Button>
          ) : null}
          {trip.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              disabled={cancelling}
              onClick={handleCancel}
            >
              확정 취소
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">여행 정보</h2>
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">대표자</span>
                <p className="font-medium">{getTripLeaderName(trip)}</p>
              </div>
              <div>
                <span className="text-slate-500">여행지</span>
                <p className="font-medium">{getTripDestination(trip)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">여행기간</span>
                <p className="font-medium">
                  {(() => {
                    const s = getTripStartDate(trip);
                    const e = getTripEndDate(trip);
                    return s && e ? `${formatDate(s)} ~ ${formatDate(e)}` : '-';
                  })()}
                </p>
              </div>
              <div>
                <span className="text-slate-500">인원</span>
                <p className="font-medium">
                  {meta
                    ? `${meta.headcountTotal}명 (남 ${meta.headcountMale} / 여 ${meta.headcountFemale})`
                    : getTripHeadcount(trip) != null ? `${getTripHeadcount(trip)}명` : '-'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">차량</span>
                <p className="font-medium">{meta?.vehicleType ?? trip.assignedVehicle ?? '-'}</p>
              </div>
              {trip.planVersion ? (
                <div>
                  <span className="text-slate-500">일수</span>
                  <p className="font-medium">{trip.planVersion.totalDays}일</p>
                </div>
              ) : null}
            </div>
            {meta?.documentNumber ? (
              <div>
                <span className="text-slate-500">문서번호</span>
                <p className="font-medium">{meta.documentNumber}</p>
              </div>
            ) : null}
            {meta?.specialNote ? (
              <div>
                <span className="text-slate-500">특이사항</span>
                <p className="whitespace-pre-wrap font-medium">{meta.specialNote}</p>
              </div>
            ) : null}
            {meta?.includeRentalItems ? (
              <div>
                <span className="text-slate-500">대여물품</span>
                <p className="whitespace-pre-wrap font-medium">{meta.rentalItemsText}</p>
              </div>
            ) : null}
            {meta?.remark ? (
              <div>
                <span className="text-slate-500">비고</span>
                <p className="whitespace-pre-wrap font-medium">{meta.remark}</p>
              </div>
            ) : null}
            {/* 노션 마이그레이션 데이터 전용 대여 정보 */}
            {!meta && (trip.rentalGear || trip.rentalDrone || trip.rentalStarlink || trip.rentalPowerbank) ? (
              <div>
                <span className="text-slate-500">대여 항목</span>
                <p className="font-medium">
                  {[
                    trip.rentalGear && '물품',
                    trip.rentalDrone && '드론',
                    trip.rentalStarlink && '스타링크',
                    trip.rentalPowerbank && '파워뱅크',
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">금액 정보</h2>
          {pricing ? (
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">총액</span>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatKrw(pricing.totalAmountKrw)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">보증금</span>
                  <p className="font-medium">{formatKrw(pricing.securityDepositAmountKrw)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">예약금</span>
                  <p className="font-medium">{formatKrw(pricing.depositAmountKrw)}</p>
                </div>
                <div>
                  <span className="text-slate-500">잔금</span>
                  <p className="font-medium">{formatKrw(pricing.balanceAmountKrw)}</p>
                </div>
              </div>
            </div>
          ) : trip.totalAmountKrw != null ? (
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">총액</span>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatKrw(trip.totalAmountKrw)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">보증금</span>
                  <p className="font-medium">
                    {trip.securityDepositAmountKrw != null ? formatKrw(trip.securityDepositAmountKrw) : '-'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">예약금</span>
                  <p className="font-medium">
                    {trip.depositAmountKrw != null ? formatKrw(trip.depositAmountKrw) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">잔금</span>
                  <p className="font-medium">
                    {trip.balanceAmountKrw != null ? formatKrw(trip.balanceAmountKrw) : '-'}
                  </p>
                </div>
              </div>
              {trip.groupTotalAmountKrw != null ? (
                <div>
                  <span className="text-slate-500">팀별총액</span>
                  <p className="font-medium">{formatKrw(trip.groupTotalAmountKrw)}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">가격 정보 없음</p>
          )}
        </Card>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">운영 정보</h2>
          <div className="flex gap-2">
            {!editing && trip.status === 'ACTIVE' && (
              <Button
                variant="primary"
                onClick={() => navigate(`/confirmed-trips/${tripId}/assign`)}
              >
                배정하기
              </Button>
            )}
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={updating}>
                  취소
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={updating}>
                  {updating ? '저장 중...' : '저장'}
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {editing ? (
          <div className="grid gap-4 text-sm md:grid-cols-2">
            {/* 가이드 */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">가이드</span>
                <button
                  type="button"
                  onClick={() => {
                    setGuideManual((prev) => !prev);
                    setGuideId(null);
                    setGuideName('');
                  }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {guideManual ? '마스터에서 선택' : '직접 입력'}
                </button>
              </div>
              {guideManual ? (
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2"
                  value={guideName}
                  onChange={(e) => setGuideName(e.target.value)}
                  placeholder="가이드 이름 직접 입력"
                />
              ) : (
                <select
                  className="rounded-xl border border-slate-200 px-3 py-2 bg-white"
                  value={guideId ?? ''}
                  onChange={(e) => setGuideId(e.target.value || null)}
                >
                  <option value="">가이드 선택</option>
                  {guides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nameKo} ({g.level})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 기사 */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">기사</span>
                <button
                  type="button"
                  onClick={() => {
                    setDriverManual((prev) => !prev);
                    setDriverId(null);
                    setDriverName('');
                  }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {driverManual ? '마스터에서 선택' : '직접 입력'}
                </button>
              </div>
              {driverManual ? (
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="기사 이름 직접 입력"
                />
              ) : (
                <select
                  className="rounded-xl border border-slate-200 px-3 py-2 bg-white"
                  value={driverId ?? ''}
                  onChange={(e) => setDriverId(e.target.value || null)}
                >
                  <option value="">기사 선택</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameMn} ({d.vehicleType})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <label className="grid gap-1">
              <span className="text-slate-500">배차 차량</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2"
                value={assignedVehicle}
                onChange={(e) => setAssignedVehicle(e.target.value)}
                placeholder="실제 배차 차량"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-slate-500">숙소 확정 메모</span>
              <textarea
                className="rounded-xl border border-slate-200 px-3 py-2"
                rows={3}
                value={accommodationNote}
                onChange={(e) => setAccommodationNote(e.target.value)}
                placeholder="확정된 숙소 정보를 기록하세요"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-slate-500">운영 비고</span>
              <textarea
                className="rounded-xl border border-slate-200 px-3 py-2"
                rows={3}
                value={operationNote}
                onChange={(e) => setOperationNote(e.target.value)}
                placeholder="내부 운영 메모"
              />
            </label>
          </div>
        ) : (
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <span className="text-slate-500">가이드</span>
              {trip.guide ? (
                <p className="font-medium">
                  {trip.guide.nameKo}
                  <span className="ml-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    {trip.guide.level}
                  </span>
                </p>
              ) : (
                <p className="font-medium">{trip.guideName ?? '-'}</p>
              )}
            </div>
            <div>
              <span className="text-slate-500">기사</span>
              {trip.driver ? (
                <p className="font-medium">
                  {trip.driver.nameMn}
                  <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {trip.driver.vehicleType}
                  </span>
                </p>
              ) : (
                <p className="font-medium">{trip.driverName ?? '-'}</p>
              )}
            </div>
            <div>
              <span className="text-slate-500">배차 차량</span>
              <p className="font-medium">{trip.assignedVehicle ?? meta?.vehicleType ?? '-'}</p>
            </div>
            {trip.accommodationNote ? (
              <div className="md:col-span-2">
                <span className="text-slate-500">숙소 확정 메모</span>
                <p className="whitespace-pre-wrap font-medium">{trip.accommodationNote}</p>
              </div>
            ) : null}
            {trip.operationNote ? (
              <div className="md:col-span-2">
                <span className="text-slate-500">운영 비고</span>
                <p className="whitespace-pre-wrap font-medium">{trip.operationNote}</p>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">관리 정보</h2>
        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <span className="text-slate-500">고객</span>
            <p className="font-medium">{trip.user.name}</p>
          </div>
          <div>
            <span className="text-slate-500">담당자</span>
            <p className="font-medium">{trip.user.ownerEmployee?.name ?? '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">확정자</span>
            <p className="font-medium">{trip.confirmedByEmployee?.name ?? '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">확정일</span>
            <p className="font-medium">{formatDate(trip.confirmedAt)}</p>
          </div>
          <div>
            <span className="text-slate-500">상태</span>
            <p className="font-medium">{trip.status === 'ACTIVE' ? '확정' : '취소됨'}</p>
          </div>
        </div>
      </Card>

      <LodgingSection
        tripId={tripId}
        hasPlan={!!(trip.planId && trip.planVersionId)}
        totalDays={trip.planVersion?.totalDays ?? null}
        travelStartDate={trip.planVersion?.meta?.travelStartDate ?? trip.travelStart ?? null}
      />

      {trip.user.attachments.length > 0 ? (
        <AttachmentsCard attachments={trip.user.attachments} />
      ) : null}
    </section>
  );
}
