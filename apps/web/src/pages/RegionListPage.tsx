import { Button, Card, Table, Td, Th } from '@tour/ui';
import { Link, useLocation } from 'react-router-dom';
import { useRegionCrud } from '../features/region/hooks';

export function RegionListPage(): JSX.Element {
  const crud = useRegionCrud();
  const location = useLocation();

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
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">지역 목록</h1>
            <p className="mt-1 text-sm text-slate-600">등록된 지역 정보를 조회하고 삭제할 수 있습니다.</p>
          </div>
          <Link
            to="/regions/create"
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            지역 생성
          </Link>
        </div>
      </header>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>지역명</Th>
              <Th>설명</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.id}</Td>
                <Td>{row.name}</Td>
                <Td>{row.description ?? '-'}</Td>
                <Td>
                  <Button variant="destructive" onClick={() => void crud.deleteRow(row.id)} disabled={crud.loading}>
                    삭제
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
