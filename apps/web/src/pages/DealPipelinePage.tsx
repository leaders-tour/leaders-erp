import { Card } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useUsers, type UserRow } from '../features/plan/hooks';

const DEAL_STAGES = [
  '컨설팅',
  '계약단계',
  '계약확정',
  '몽골배정단계',
  '몽골배정완료',
  '대기중',
  '출발10일전',
  '출발3일전',
  '여행 완료시',
] as const;

type DealStage = (typeof DEAL_STAGES)[number];

interface PipelineCard extends UserRow {
  stage: DealStage;
}

function getStableStage(userId: string): DealStage {
  const hash = Array.from(userId).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);
  return DEAL_STAGES[hash % DEAL_STAGES.length] ?? DEAL_STAGES[0];
}

export function DealPipelinePage(): JSX.Element {
  const { users, loading } = useUsers();
  const [search, setSearch] = useState('');

  const cards = useMemo<PipelineCard[]>(() => {
    const keyword = search.trim().toLowerCase();

    return users
      .filter((user) => {
        if (!keyword) {
          return true;
        }

        const nameMatched = user.name.toLowerCase().includes(keyword);
        const emailMatched = user.email?.toLowerCase().includes(keyword) ?? false;
        return nameMatched || emailMatched;
      })
      .map((user) => ({
        ...user,
        stage: getStableStage(user.id),
      }));
  }, [search, users]);

  const stageMap = useMemo(() => {
    return DEAL_STAGES.reduce<Record<DealStage, PipelineCard[]>>((acc, stage) => {
      acc[stage] = cards.filter((card) => card.stage === stage);
      return acc;
    }, {} as Record<DealStage, PipelineCard[]>);
  }, [cards]);

  return (
    <section className="grid gap-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">딜 파이프라인</h1>
          <p className="mt-1 text-sm text-slate-600">고객의 진행 단계를 칸반 보드로 확인합니다.</p>
        </div>

        <label className="w-full md:w-[280px]">
          <span className="sr-only">고객 검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="고객명 또는 이메일 검색"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          />
        </label>
      </header>

      {loading ? <div className="text-sm text-slate-600">고객 데이터를 불러오는 중...</div> : null}

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-max grid-flow-col auto-cols-[260px] gap-4">
          {DEAL_STAGES.map((stage) => {
            const stageCards = stageMap[stage] ?? [];

            return (
              <section key={stage} className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
                <header className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <h2 className="text-sm font-semibold text-slate-900">{stage}</h2>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {stageCards.length}
                  </span>
                </header>

                <div className="grid gap-2">
                  {stageCards.length === 0 ? (
                    <Card className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-3 text-xs text-slate-500 shadow-none">
                      현재 단계에 고객이 없습니다.
                    </Card>
                  ) : null}

                  {stageCards.map((card) => (
                    <Card key={card.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="grid gap-1">
                        <p className="text-sm font-semibold text-slate-900">{card.name}</p>
                        <p className="text-xs text-slate-500">{card.email ?? '이메일 없음'}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
