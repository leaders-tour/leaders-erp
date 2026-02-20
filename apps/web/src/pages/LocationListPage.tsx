import { Button, Card, Table, Td, Th } from '@tour/ui';
import { Link, useLocation } from 'react-router-dom';
import { useLocationCrud } from '../features/location/hooks';

export function LocationListPage(): JSX.Element {
  const crud = useLocationCrud();
  const location = useLocation();

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/locations/list"
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              location.pathname === '/locations/list'
                ? 'border border-slate-900 bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            목적지 목록
          </Link>
          <Link
            to="/locations/create"
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              location.pathname === '/locations/create'
                ? 'border border-slate-900 bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            목적지 생성
          </Link>
          <Link
            to="/locations/connections"
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              location.pathname === '/locations/connections'
                ? 'border border-slate-900 bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            목적지 간 연결
          </Link>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">목적지 목록</h1>
            <p className="mt-1 text-sm text-slate-600">등록된 목적지 정보를 조회하고 삭제할 수 있습니다.</p>
          </div>
          <Link
            to="/locations/create"
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            목적지 생성
          </Link>
        </div>
      </header>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>지역</Th>
              <Th>목적지명</Th>
              <Th>기본 숙소</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.id}</Td>
                <Td>{row.regionName}</Td>
                <Td>{row.name}</Td>
                <Td>{row.defaultLodgingType}</Td>
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
