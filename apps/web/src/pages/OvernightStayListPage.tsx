import { gql, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { Link, useNavigate } from 'react-router-dom';
import { formatLocationNameInline } from '../features/location/display';
import { LocationSubNav } from '../features/location/sub-nav';

const OVERNIGHT_STAYS_QUERY = gql`
  query OvernightStayListPage {
    overnightStays {
      id
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

interface OvernightStayRow {
  id: string;
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

export function OvernightStayListPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ overnightStays: OvernightStayRow[] }>(OVERNIGHT_STAYS_QUERY);
  const rows = data?.overnightStays ?? [];

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">연박 목록</h1>
          <p className="mt-1 text-sm text-slate-600">목적지 연박 정의를 조회하고 상세 화면으로 이동합니다.</p>
        </div>
        <Button onClick={() => navigate('/locations/stays/new')}>연박 생성</Button>
      </header>

      <LocationSubNav pathname="/locations/stays" />

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
                  <Th>1일차</Th>
                  <Th>2일차</Th>
                  <Th>수정</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const day1 = row.days.find((day) => day.dayOrder === 1);
                  const day2 = row.days.find((day) => day.dayOrder === 2);
                  return (
                    <tr key={row.id} className="border-t border-slate-200 align-top">
                      <Td>{row.title}</Td>
                      <Td>{formatLocationNameInline(row.location.name)}</Td>
                      <Td>{row.isActive ? '활성' : '비활성'}</Td>
                      <Td>{day1 ? `${day1.averageDistanceKm}km / ${day1.averageTravelHours}h` : '-'}</Td>
                      <Td>{day2 ? `${day2.averageDistanceKm}km / ${day2.averageTravelHours}h` : '-'}</Td>
                      <Td>
                        <Link to={`/locations/stays/${row.id}`} className="text-blue-700 hover:underline">
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
