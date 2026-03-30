import { useQuery } from '@apollo/client';
import { Button, Card } from '@tour/ui';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MultiDayBlockEditPanel,
  MULTI_DAY_BLOCK_EDIT_PANEL_QUERY,
} from '../features/multi-day-block/multi-day-block-edit-panel';
import { MultiDayBlockSubNav } from '../features/multi-day-block/sub-nav';

export function MultiDayBlockEditPage(): JSX.Element {
  const navigate = useNavigate();
  const { stayId } = useParams<{ stayId: string }>();
  const { data } = useQuery(MULTI_DAY_BLOCK_EDIT_PANEL_QUERY, {
    variables: { id: stayId ?? '' },
    skip: !stayId,
  });
  const block = data?.multiDayBlock;
  const headerTitle = block?.name?.trim() || block?.title || '연속 일정 블록 수정';

  if (!stayId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{headerTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">블록 일차별 데이터를 수정합니다.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/multi-day-blocks/${stayId}`)}>
          상세로
        </Button>
      </header>

      <MultiDayBlockSubNav pathname={`/multi-day-blocks/${stayId}/edit`} />

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <MultiDayBlockEditPanel blockId={stayId} />
      </Card>
    </section>
  );
}
