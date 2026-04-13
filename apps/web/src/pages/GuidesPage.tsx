import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuides, useCreateGuide, type GuideRow } from '../features/guide/hooks';

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

const GUIDE_LEVEL_OPTIONS: { value: GuideRow['level']; label: string }[] = [
  { value: 'MAIN', label: '메인' },
  { value: 'JUNIOR', label: '주니어' },
  { value: 'ROOKIE', label: '신입' },
  { value: 'OTHER', label: '기타' },
];

const GUIDE_STATUS_OPTIONS: { value: GuideRow['status']; label: string }[] = [
  { value: 'ACTIVE_SEASON', label: '2026 시즌' },
  { value: 'INTERVIEW_DONE', label: '면접 완료' },
  { value: 'INACTIVE', label: '비활성' },
  { value: 'OTHER', label: '기타' },
];

function CreateGuideModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({
    nameKo: '',
    nameMn: '',
    level: 'ROOKIE' as GuideRow['level'],
    status: 'INTERVIEW_DONE' as GuideRow['status'],
    gender: '' as '' | 'MALE' | 'FEMALE',
    phone: '',
  });
  const { createGuide, loading } = useCreateGuide();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.nameKo.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    setError(null);
    try {
      const result = await createGuide({
        nameKo: form.nameKo.trim(),
        ...(form.nameMn.trim() ? { nameMn: form.nameMn.trim() } : {}),
        level: form.level,
        status: form.status,
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      } as any);
      setForm({ nameKo: '', nameMn: '', level: 'ROOKIE', status: 'INTERVIEW_DONE', gender: '', phone: '' });
      onClose();
      onCreated(result.id);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">가이드 등록</h3>
        <p className="mt-1 text-sm text-slate-500">새로운 가이드를 등록합니다. 상세 정보는 등록 후 수정할 수 있습니다.</p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">이름 (한국) *</span>
            <input
              type="text"
              value={form.nameKo}
              onChange={(e) => setForm((p) => ({ ...p, nameKo: e.target.value }))}
              placeholder="한국어 이름"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">몽골 이름</span>
            <input
              type="text"
              value={form.nameMn}
              onChange={(e) => setForm((p) => ({ ...p, nameMn: e.target.value }))}
              placeholder="몽골어 이름"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">레벨</span>
            <select
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as GuideRow['level'] }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {GUIDE_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">상태</span>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as GuideRow['status'] }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              {GUIDE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">성별</span>
            <select
              value={form.gender}
              onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as '' | 'MALE' | 'FEMALE' }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="">-</option>
              <option value="MALE">남</option>
              <option value="FEMALE">여</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">전화번호</span>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="전화번호"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '등록 중...' : '등록'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function GuidesPage(): JSX.Element {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE_SEASON');
  const [createOpen, setCreateOpen] = useState(false);
  const { guides, loading } = useGuides({ level: levelFilter, status: statusFilter });
  const navigate = useNavigate();

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">가이드 목록</h1>
          <p className="mt-1 text-sm text-slate-600">등록된 가이드 정보를 관리합니다.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ 가이드 등록</Button>
      </header>

      <CreateGuideModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/guides/${id}`)}
      />

      {/* 필터 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
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

        <div className="flex flex-wrap gap-1">
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
