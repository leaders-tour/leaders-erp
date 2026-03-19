import { gql, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { Link, useNavigate } from 'react-router-dom';
import { formatLocationNameInline } from '../features/location/display';
import { MultiDayBlockSubNav } from '../features/multi-day-block/sub-nav';

const MULTI_DAY_BLOCKS_QUERY = gql`
  query MultiDayBlockListPage {
    multiDayBlocks {
      id
      name
      title
      locationId
      location {
        id
        name
      }
      isActive
      sortOrder
      days {
        id
        dayOrder
        averageDistanceKm
        averageTravelHours
      }
      updatedAt
    }
  }
`;

interface MultiDayBlockRow {
  id: string;
  name: string;
  title: string;
  locationId: string;
  location: {
    id: string;
    name: string[];
  };
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
  days: Array<{
    id: string;
    dayOrder: number;
    averageDistanceKm: number;
    averageTravelHours: number;
  }>;
}

export function MultiDayBlockListPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ multiDayBlocks: MultiDayBlockRow[] }>(MULTI_DAY_BLOCKS_QUERY);
  const rows = data?.multiDayBlocks ?? [];

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">연속 일정 블록 목록</h1>
          <p className="mt-1 text-sm text-slate-600">블록 정의를 조회하고 상세 화면으로 이동합니다.</p>
        </div>
        <Button onClick={() => navigate('/multi-day-blocks/create')}>블록 생성</Button>
      </header>

      <MultiDayBlockSubNav pathname="/multi-day-blocks/list" />

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-8 text-sm text-slate-600">불러오는 중...</div>
        ) : (
          <div className="overflow-auto">
            <Table className="min-w-[860px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>제목</Th>
                  <Th>목적지</Th>
                  <Th>상태</Th>
                  <Th>블록 일수</Th>
                  <Th>요약</Th>
                  <Th>수정</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const orderedDays = row.days.slice().sort((left, right) => left.dayOrder - right.dayOrder);
                  return (
                    <tr key={row.id} className="border-t border-slate-200 align-top">
                      <Td>{row.name}</Td>
                      <Td>{formatLocationNameInline(row.location.name)}</Td>
                      <Td>{row.isActive ? '활성' : '비활성'}</Td>
                      <Td>{orderedDays.length}일</Td>
                      <Td className="whitespace-pre-line">
                        {orderedDays.length > 0
                          ? orderedDays.map((day) => `${day.dayOrder}일차 ${day.averageDistanceKm}km / ${day.averageTravelHours}h`).join('\n')
                          : '-'}
                      </Td>
                      <Td>
                        <Link to={`/multi-day-blocks/${row.id}`} className="text-blue-700 hover:underline">
                          상세
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}
