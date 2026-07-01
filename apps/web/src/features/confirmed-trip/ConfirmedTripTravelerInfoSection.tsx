import { Button, Card } from '@tour/ui';
import { useMemo, useRef, useState } from 'react';
import { ContractSubmissionDetailPanel } from '../contract/components/ContractSubmissionDetailPanel';
import type { ContractPaymentReceiptRow, ContractSubmissionRow } from '../contract/hooks';
import {
  useRemoveContractSubmissionPassportPhoto,
  useResyncContractSubmissionPassportPhotoFromSheet,
  useUploadContractSubmissionPassportPhoto,
} from '../contract/hooks';
import { RecruitmentStatusToggle } from './RecruitmentStatusToggle';
import {
  buildTravelerSheetColumns,
  type TravelerSheetColumn,
} from './contract-traveler-sheet';

function PassportPhotoThumbnail({
  urls,
  onClick,
}: {
  urls: string[];
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className="relative inline-flex shrink-0"
      onClick={onClick}
      aria-label="여권 사진 보기"
    >
      <img
        src={urls[0]}
        alt=""
        className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
      />
      {urls.length > 1 ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          +{urls.length - 1}
        </span>
      ) : null}
    </button>
  );
}

function PassportPhotoGallery({
  urls,
  showHeading = true,
  large = false,
}: {
  urls: string[];
  showHeading?: boolean;
  large?: boolean;
}): JSX.Element | null {
  if (urls.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {showHeading ? <p className="text-sm font-semibold text-slate-900">여권 사진</p> : null}
      <div className={`grid gap-4 ${large ? '' : 'sm:grid-cols-2'}`}>
        {urls.map((url, index) => (
          <PassportPhotoGalleryItem key={`${url}-${index}`} url={url} large={large} />
        ))}
      </div>
    </div>
  );
}

function PassportPhotoGalleryItem({
  url,
  large = false,
}: {
  url: string;
  large?: boolean;
}): JSX.Element {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-6 text-xs text-slate-500 ${
          large ? 'min-h-[50vh]' : 'min-h-32'
        }`}
      >
        이미지를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
        large ? 'flex min-h-[50vh] items-center justify-center p-3' : ''
      }`}
    >
      <img
        src={url}
        alt=""
        className={
          large
            ? 'max-h-[min(72vh,960px)] w-full object-contain'
            : 'max-h-80 w-full object-contain'
        }
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function PassportPhotoModal({
  submission,
  onClose,
  onUpdated,
}: {
  submission: ContractSubmissionRow;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { uploadPassportPhoto, loading: uploading } = useUploadContractSubmissionPassportPhoto();
  const { removePassportPhoto, loading: removing } = useRemoveContractSubmissionPassportPhoto();
  const { resyncPassportPhotoFromSheet, loading: resyncing } =
    useResyncContractSubmissionPassportPhotoFromSheet();

  const travelerName = submission.travelerName ?? submission.leaderName ?? '여행객';
  const urls = submission.passportPhotoUrls ?? [];
  const isManual = submission.passportPhotoSourceMode === 'MANUAL';
  const busy = uploading || removing || resyncing;

  const handleUpload = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setErrorMessage(null);
    try {
      await uploadPassportPhoto(submission.id, file);
      await onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '업로드에 실패했습니다.');
    }
  };

  const handleRemove = async (imageUrl?: string) => {
    if (!window.confirm('여권 사진을 삭제할까요?')) {
      return;
    }
    setErrorMessage(null);
    try {
      await removePassportPhoto(submission.id, imageUrl ?? null);
      await onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    }
  };

  const handleResync = async () => {
    if (
      !window.confirm(
        '시트에 등록된 여권 사진으로 다시 가져옵니다. 수동으로 올린 사진은 교체될 수 있습니다. 계속할까요?',
      )
    ) {
      return;
    }
    setErrorMessage(null);
    try {
      await resyncPassportPhotoFromSheet(submission.id);
      await onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '시트 동기화에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6">
      <Card className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">{travelerName}</h3>
              {isManual ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                  수동 관리
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">여권 사진</p>
          </div>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            닫기
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {urls.length > 0 ? (
            <>
              <PassportPhotoGallery urls={urls} showHeading={false} large />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => replaceInputRef.current?.click()}
                >
                  다른 사진으로 교체
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => handleRemove(urls[0])}
                >
                  삭제
                </Button>
                {urls.length > 1 ? (
                  <Button variant="outline" disabled={busy} onClick={() => handleRemove()}>
                    전체 삭제
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm text-slate-600">등록된 여권 사진이 없습니다.</p>
              <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP, HEIC 파일을 업로드할 수 있습니다.</p>
              <Button className="mt-4" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                여권 사진 업로드
              </Button>
            </div>
          )}

          {isManual ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Button variant="outline" disabled={busy} onClick={() => void handleResync()}>
                시트에서 다시 가져오기
              </Button>
              <p className="mt-2 text-xs text-slate-500">
                계약서 시트에 등록된 Drive URL 기준으로 다시 동기화합니다.
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            void handleUpload(file);
            event.target.value = '';
          }}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            void handleUpload(file);
            event.target.value = '';
          }}
        />
      </Card>
    </div>
  );
}

function createSheetColumns(
  onOpenPassport: (submission: ContractSubmissionRow) => void,
): Array<{
  key: string;
  label: string;
  render: (column: TravelerSheetColumn) => React.ReactNode;
}> {
  return [
  {
    key: 'tags',
    label: '태그',
    render: (column) => (
      <div className="flex flex-wrap gap-1">
        {column.roleTags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              tag === '대표자'
                ? 'bg-slate-900 text-white'
                : tag === '취소자'
                  ? 'bg-rose-100 text-rose-800'
                  : tag === '대체자'
                    ? 'bg-violet-100 text-violet-800'
                    : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    ),
  },
  {
    key: 'passport',
    label: '여권',
    render: (column) =>
      column.passportPhotoUrls.length > 0 ? (
        <PassportPhotoThumbnail
          urls={column.passportPhotoUrls}
          onClick={() => onOpenPassport(column.submission)}
        />
      ) : (
        <button
          type="button"
          className="whitespace-nowrap font-medium text-emerald-700 underline-offset-2 hover:underline"
          onClick={() => onOpenPassport(column.submission)}
        >
          여권 업로드
        </button>
      ),
  },
  {
    key: 'payments',
    label: '입금내역',
    render: (column) =>
      column.payments.length === 0 ? (
        <span className="text-slate-400">-</span>
      ) : (
        <div className="grid gap-1">
          {column.payments.map((payment, index) => (
            <div key={`${payment.amountKrw}-${index}`} className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-slate-900">
                {payment.amountKrw.toLocaleString('ko-KR')}원
              </span>
              {payment.tag ? (
                <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                  {payment.tag}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ),
  },
  {
    key: 'contract',
    label: '계약서',
    render: (column) => (
      <div className="grid gap-1 text-xs">
        <span className={column.contractCompleted ? 'text-emerald-700' : 'text-amber-700'}>
          {column.contractCompleted ? '작성 완료' : '작성 미완료'}
        </span>
        <span className={column.hasDissent ? 'text-rose-700' : 'text-slate-500'}>
          {column.hasDissent ? '미동의 있음' : '미동의 없음'}
        </span>
      </div>
    ),
  },
  {
    key: 'note',
    label: '특이사항',
    render: (column) => (
      <p className="max-w-[12rem] whitespace-pre-wrap break-words text-xs text-slate-700">
        {column.specialNote ?? '-'}
      </p>
    ),
  },
  {
    key: 'gender',
    label: '성별',
    render: (column) => <span>{column.gender ?? '-'}</span>,
  },
  {
    key: 'birth',
    label: '생년월일',
    render: (column) => <span className="whitespace-nowrap">{column.birthDisplay ?? '-'}</span>,
  },
  {
    key: 'phone',
    label: '연락처',
    render: (column) => <span className="break-all">{column.phone ?? '-'}</span>,
  },
  ];
}

function TravelerDetailModal({
  submission,
  onClose,
}: {
  submission: ContractSubmissionRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {submission.travelerName ?? submission.leaderName ?? '계약서 상세'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">계약서 작성 내용 전체</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
        <ContractSubmissionDetailPanel submission={submission} variant="modal" />
      </Card>
    </div>
  );
}

export function ConfirmedTripTravelerInfoSection({
  documentNumber,
  headcountTotal,
  isRecruitingOpen,
  recruitmentDisabled,
  recruitmentSaving,
  onRecruitmentToggle,
  submissions,
  receipts,
  submissionsLoading,
  receiptsLoading,
  onSubmissionsUpdated,
}: {
  documentNumber: string | null;
  headcountTotal: number | null;
  isRecruitingOpen: boolean;
  recruitmentDisabled: boolean;
  recruitmentSaving: boolean;
  onRecruitmentToggle: (nextOpen: boolean) => Promise<void>;
  submissions: ContractSubmissionRow[];
  receipts: ContractPaymentReceiptRow[];
  submissionsLoading: boolean;
  receiptsLoading: boolean;
  onSubmissionsUpdated?: () => Promise<void>;
}) {
  const [detailSubmission, setDetailSubmission] = useState<ContractSubmissionRow | null>(null);
  const [passportSubmissionId, setPassportSubmissionId] = useState<string | null>(null);

  const passportSubmission = useMemo(
    () => submissions.find((submission) => submission.id === passportSubmissionId) ?? null,
    [passportSubmissionId, submissions],
  );

  const sheetColumns = useMemo(
    () => createSheetColumns((submission) => setPassportSubmissionId(submission.id)),
    [],
  );

  const columns = useMemo(
    () => buildTravelerSheetColumns(submissions, receipts),
    [receipts, submissions],
  );

  const loading = submissionsLoading || receiptsLoading;

  const handleSubmissionsUpdated = async () => {
    if (onSubmissionsUpdated) {
      await onSubmissionsUpdated();
    }
  };

  return (
    <>
      <Card className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">여행객 정보</h2>
          <p className="mt-1 text-xs text-slate-500">계약서 시트를 기반으로 매칭한 결과 입니다.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-6 text-sm">
          <div>
            <span className="block text-xs text-slate-500">인원수</span>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {headcountTotal != null ? `${headcountTotal}명` : `${columns.length}명`}
            </p>
          </div>
          <div>
            <span className="block text-xs text-slate-500">모집 상태</span>
            <div className="mt-1">
              <RecruitmentStatusToggle
                open={isRecruitingOpen}
                disabled={recruitmentDisabled}
                saving={recruitmentSaving}
                onToggle={onRecruitmentToggle}
              />
            </div>
          </div>
        </div>

        {!documentNumber ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
            연결된 문서번호가 없습니다.
          </p>
        ) : null}

        {documentNumber && loading ? (
          <p className="text-sm text-slate-500">여행객 정보를 불러오는 중...</p>
        ) : null}

        {documentNumber && !loading && columns.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
            매칭된 여행객 정보가 없습니다.
          </p>
        ) : null}

        {documentNumber && !loading && columns.length > 0 ? (
          <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 min-w-[72px] border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-500">
                    성함
                  </th>
                  {sheetColumns.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-left font-semibold text-slate-500 last:border-r-0"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-500">
                    전체보기
                  </th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column) => (
                  <tr key={column.submission.id} className="border-b border-slate-100 last:border-b-0">
                    <th className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-900">
                      {column.name}
                    </th>
                    {sheetColumns.map((field) => (
                      <td
                        key={`${column.submission.id}-${field.key}`}
                        className="align-top border-r border-slate-100 px-3 py-2 last:border-r-0"
                      >
                        {field.render(column)}
                      </td>
                    ))}
                    <td className="align-top px-3 py-2">
                      <button
                        type="button"
                        className="whitespace-nowrap font-medium text-emerald-700 underline-offset-2 hover:underline"
                        onClick={() => setDetailSubmission(column.submission)}
                      >
                        전체보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {passportSubmission ? (
        <PassportPhotoModal
          submission={passportSubmission}
          onClose={() => setPassportSubmissionId(null)}
          onUpdated={handleSubmissionsUpdated}
        />
      ) : null}

      {detailSubmission ? (
        <TravelerDetailModal submission={detailSubmission} onClose={() => setDetailSubmission(null)} />
      ) : null}
    </>
  );
}
