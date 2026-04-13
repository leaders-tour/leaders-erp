import { Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuides, type GuideRow } from '../features/guide/hooks';

const LEVEL_LABEL: Record<string, string> = {
  MAIN: '메인',
  JUNIOR: '주니어',
  ROOKIE: '신입',
  OTHER: '기타',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE_SEASON: '2026 시즌',
  INTERVIEW_DONE: '면접 완료',
  INACTIVE: '비활성',
  OTHER: '기타',
};

function LevelBadge({ level }: { level: GuideRow['level'] }) {
  const colors: Record<string, string> = {
    MAIN: 'bg-indigo-100 text-indigo-700',
    JUNIOR: 'bg-sky-100 text-sky-700',
    ROOKIE: 'bg-emerald-100 text-emerald-700',
    OTHER: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[level] ?? colors.OTHER}`}>
      {LEVEL_LABEL[level] ?? level}
    </span>
  );
}

function StatusBadge({ status }: { status: GuideRow['status'] }) {
  const colors: Record<string, string> = {
    ACTIVE_SEASON: 'bg-emerald-100 text-emerald-700',
    INTERVIEW_DONE: 'bg-amber-100 text-amber-700',
    INACTIVE: 'bg-slate-100 text-slate-500',
    OTHER: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.OTHER}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

type LevelFilter = GuideRow['level'] | undefined;
type StatusFilter = GuideRow['status'] | undefined;

export function GuidesPage(): JSX.Element {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE_SEASON');
  const { guides, loading } = useGuides({ level: levelFilter, status: statusFilter });
  const navigate = useNavigate();

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">가이드 목록</h1>
        <p className="mt-1 text-sm text-slate-600">등록된 가이드 정보를 관리합니다.</p>
      </header>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          {([undefined, 'ACTIVE_SEASON', 'INTERVIEW_DONE', 'INACTIVE'] as (StatusFilter | undefined)[]).map(
            (s) => (
              <button
                key={String(s)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === s
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setStatusFilter(s as StatusFilter)}
              >
                {s == null ? '전체' : STATUS_LABEL[s]}
              </button>
            ),
          )}
        </div>

        <div className="flex gap-1">
          {([undefined, 'MAIN', 'JUNIOR', 'ROOKIE'] as (LevelFilter | undefined)[]).map((l) => (
            <button
              key={String(l)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                levelFilter === l
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setLevelFilter(l as LevelFilter)}
            >
              {l == null ? '전체 레벨' : LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : guides.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          등록된 가이드가 없습니다.
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="w-12 px-3 py-3" />
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">이름 (한국)</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">몽골 이름</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">레벨</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">상태</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">성별</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">출생년도</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">경력</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">입사</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">전화번호</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">흡연</th>
                </tr>
              </thead>
              <tbody>
                {guides.map((guide) => (
                  <tr
                    key={guide.id}
                    className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                    onClick={() => navigate(`/guides/${guide.id}`)}
                  >
                    <td className="px-3 py-2">
                      {guide.profileImageUrl ? (
                        <img
                          src={guide.profileImageUrl}
                          alt={guide.nameKo}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                          {guide.nameKo.slice(0, 1)}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {guide.nameKo}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {guide.nameMn ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <LevelBadge level={guide.level} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={guide.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {guide.gender === 'MALE' ? '남' : guide.gender === 'FEMALE' ? '여' : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {guide.birthYear ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {guide.experienceYears != null ? `${guide.experienceYears}년차` : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {guide.joinYear ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {guide.phone ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {guide.isSmoker ? '🚬' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
