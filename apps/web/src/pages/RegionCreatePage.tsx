import { Button, Card, Input } from '@tour/ui';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRegionCrud } from '../features/region/hooks';

export function RegionCreatePage(): JSX.Element {
  const crud = useRegionCrud();
  const location = useLocation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/regions/list"
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              location.pathname === '/regions/list'
                ? 'border border-slate-900 bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            지역 목록
          </Link>
          <Link
            to="/regions/create"
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              location.pathname === '/regions/create'
                ? 'border border-slate-900 bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            지역 생성
          </Link>
          <Link
            to="/regions/sets"
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              location.pathname === '/regions/sets'
                ? 'border border-slate-900 bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            지역 세트
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">지역 생성</h1>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) {
              return;
            }
            setSubmitting(true);
            try {
              await crud.createRow({ name: name.trim(), description: description.trim() });
              setName('');
              setDescription('');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">지역명</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
            <span className="text-xs text-slate-500">*(예시: 홉스골, 고비, 중부)</span>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">설명 (선택)</span>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
            <span className="text-xs text-slate-500">*직원만 보입니다.</span>
          </label>
          <div>
            <Button type="submit" variant="primary" disabled={submitting || !name.trim() || crud.loading}>
              {submitting ? '생성 중...' : '지역 생성'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
