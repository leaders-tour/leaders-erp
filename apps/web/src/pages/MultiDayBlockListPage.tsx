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
        timeCellText
        scheduleCellText
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
    timeCellText: string;
    scheduleCellText: string;
  }>;
}

function buildScheduleLines(timeCellText: string, scheduleCellText: string): Array<{ time: string; activity: string }> {
  const timeLines = timeCellText.split('\n');
  const scheduleLines = scheduleCellText.split('\n');
  const lineCount = Math.max(timeLines.length, scheduleLines.length);
  const lines: Array<{ time: string; activity: string }> = [];

  for (let index = 0; index < lineCount; index += 1) {
    const time = timeLines[index]?.trim() ?? '';
    const activity = scheduleLines[index]?.trim() ?? '';

    if (!time && !activity) {
      continue;
    }

    lines.push({
      time: time || '-',
      activity: activity || '-',
    });
  }

  return lines;
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
            <Table className="min-w-[1320px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>제목</Th>
                  <Th>목적지</Th>
                  <Th>상태</Th>
                  <Th>블록 일수</Th>
                  <Th>요약</Th>
                  <Th>시간 / 일정</Th>
                  <Th>수정</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const orderedDays = row.days.slice().sort((left, right) => left.dayOrder - right.dayOrder);
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className="border-t border-slate-200 align-top cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      onClick={() => navigate(`/multi-day-blocks/${row.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/multi-day-blocks/${row.id}`);
                        }
                      }}
                    >
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
                        {orderedDays.length > 0 ? (
                          <div className="grid gap-3 text-sm">
                            {orderedDays.map((day) => {
                              const scheduleLines = buildScheduleLines(day.timeCellText, day.scheduleCellText);
                              return (
                                <div key={day.id} className="grid gap-1">
                                  <div className="font-medium text-slate-800">{day.dayOrder}일차</div>
                                  {scheduleLines.length > 0 ? (
                                    scheduleLines.map((line, index) => (
                                      <div key={`${day.id}-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                                        <span className="font-medium text-slate-700">{line.time}</span>
                                        <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-slate-400">-</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400">-</div>
                        )}
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Link
                            to={`/multi-day-blocks/${row.id}`}
                            className="text-blue-700 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            상세
                          </Link>
                          <Link
                            to={`/multi-day-blocks/${row.id}/edit`}
                            className="text-blue-700 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            수정
                          </Link>
                        </div>
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
