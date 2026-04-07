import { Button, Card, Table, Td, Th } from '@tour/ui';
import { Fragment, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toRegionMutationErrorMessage, useRegionCrud } from '../features/region/hooks';

export function RegionListPage(): JSX.Element {
  const crud = useRegionCrud();
  const location = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowDeleteError, setRowDeleteError] = useState<{ rowId: string; message: string } | null>(null);

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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">지역 목록</h1>
            <p className="mt-1 text-sm text-slate-600">등록된 지역 정보를 조회하고, 연결이 없을 때만 삭제할 수 있습니다.</p>
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
              <Th>지역명</Th>
              <Th>설명</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => {
              const deleteErrorForRow = rowDeleteError?.rowId === row.id ? rowDeleteError.message : null;
              return (
                <Fragment key={row.id}>
                  <tr>
                    <Td>{row.name}</Td>
                    <Td>{row.description ?? '-'}</Td>
                    <Td>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={deletingId === row.id}
                        onClick={async () => {
                          if (!window.confirm(`'${row.name}' 지역을 삭제할까요?`)) {
                            return;
                          }
                          setDeletingId(row.id);
                          setRowDeleteError(null);
                          try {
                            await crud.deleteRow(row.id);
                          } catch (error) {
                            setRowDeleteError({
                              rowId: row.id,
                              message: toRegionMutationErrorMessage(error, '지역 삭제에 실패했습니다.'),
                            });
                          } finally {
                            setDeletingId((current) => (current === row.id ? null : current));
                          }
                        }}
                      >
                        {deletingId === row.id ? '삭제 중...' : '삭제'}
                      </Button>
                    </Td>
                  </tr>
                  {deleteErrorForRow ? (
                    <tr className="bg-rose-50/80">
                      <Td colSpan={3} className="border-b border-rose-100 py-2.5 text-sm whitespace-pre-line text-rose-700">
                        {deleteErrorForRow}
                      </Td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
