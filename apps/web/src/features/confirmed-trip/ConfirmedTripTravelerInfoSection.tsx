import { Button, Card } from '@tour/ui';
import { useMemo, useState } from 'react';
import { ContractSubmissionDetailPanel } from '../contract/components/ContractSubmissionDetailPanel';
import type { ContractPaymentReceiptRow, ContractSubmissionRow } from '../contract/hooks';
import { RecruitmentStatusToggle } from './RecruitmentStatusToggle';
import {
  buildTravelerSheetColumns,
  filterSubmissionsForTripTeam,
  type TravelerSheetColumn,
} from './contract-traveler-sheet';

const SHEET_COLUMNS: Array<{
  key: string;
  label: string;
  render: (column: TravelerSheetColumn) => React.ReactNode;
}> = [
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
  leaderName,
  headcountTotal,
  isRecruitingOpen,
  recruitmentDisabled,
  recruitmentSaving,
  onRecruitmentToggle,
  submissions,
  receipts,
  submissionsLoading,
  receiptsLoading,
}: {
  documentNumber: string | null;
  leaderName: string | null;
  headcountTotal: number | null;
  isRecruitingOpen: boolean;
  recruitmentDisabled: boolean;
  recruitmentSaving: boolean;
  onRecruitmentToggle: (nextOpen: boolean) => Promise<void>;
  submissions: ContractSubmissionRow[];
  receipts: ContractPaymentReceiptRow[];
  submissionsLoading: boolean;
  receiptsLoading: boolean;
}) {
  const [detailSubmission, setDetailSubmission] = useState<ContractSubmissionRow | null>(null);

  const teamSubmissions = useMemo(
    () => filterSubmissionsForTripTeam(submissions, leaderName),
    [leaderName, submissions],
  );

  const columns = useMemo(
    () => buildTravelerSheetColumns(teamSubmissions, receipts),
    [receipts, teamSubmissions],
  );

  const loading = submissionsLoading || receiptsLoading;

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
                  {SHEET_COLUMNS.map((column) => (
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
                    {SHEET_COLUMNS.map((field) => (
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

      {detailSubmission ? (
        <TravelerDetailModal submission={detailSubmission} onClose={() => setDetailSubmission(null)} />
      ) : null}
    </>
  );
}
