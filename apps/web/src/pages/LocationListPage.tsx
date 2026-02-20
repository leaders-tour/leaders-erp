import { Button, Card, Table, Td, Th } from '@tour/ui';
import { Link, useLocation } from 'react-router-dom';
import { useLocationCrud } from '../features/location/hooks';
import { MealOption } from '../generated/graphql';

function toMealLabel(value: MealOption | null | undefined): string {
  if (!value) {
    return 'X';
  }
  const labels: Record<MealOption, string> = {
    [MealOption.CampMeal]: '캠프식',
    [MealOption.LocalRestaurant]: '현지식당',
    [MealOption.PorkParty]: '삼겹살파티',
    [MealOption.Horhog]: '허르헉',
    [MealOption.Shashlik]: '샤슬릭',
    [MealOption.ShabuShabu]: '샤브샤브',
  };
  return labels[value];
}

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
              <Th>목적지</Th>
              <Th>시간</Th>
              <Th>일정</Th>
              <Th>숙소</Th>
              <Th>식사</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.name}</Td>
                <Td>
                  <div className="grid gap-1 text-sm">
                    {row.timeBlocks.map((timeBlock) => {
                      const hasActivities = timeBlock.activities.length > 0;
                      return (
                        <div key={timeBlock.id} className="leading-5">
                          <div>{timeBlock.startTime}</div>
                          {hasActivities
                            ? timeBlock.activities.slice(1).map((activity) => (
                                <div key={activity.id} className="text-slate-500">
                                  -
                                </div>
                              ))
                            : null}
                        </div>
                      );
                    })}
                  </div>
                </Td>
                <Td>
                  <div className="grid gap-1 text-sm">
                    {row.timeBlocks.map((timeBlock) => {
                      if (timeBlock.activities.length === 0) {
                        return (
                          <div key={timeBlock.id} className="leading-5 text-slate-500">
                            (일정 없음)
                          </div>
                        );
                      }
                      return (
                        <div key={timeBlock.id} className="leading-5">
                          {timeBlock.activities.map((activity) => (
                            <div key={activity.id}>{activity.description}</div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </Td>
                <Td>
                  <div className="grid gap-1 text-sm">
                    <div>{row.lodgings[0]?.name ?? '-'}</div>
                    <div>{row.lodgings[0]?.hasElectricity ? '전기' : '전기 X'}</div>
                    <div>{row.lodgings[0]?.hasShower ? '샤워' : '샤워 X'}</div>
                    <div>{row.lodgings[0]?.hasInternet ? '인터넷' : '인터넷 X'}</div>
                  </div>
                </Td>
                <Td>
                  <div className="grid gap-1 text-sm">
                    <div>{toMealLabel(row.mealSets[0]?.breakfast)}</div>
                    <div>{toMealLabel(row.mealSets[0]?.lunch)}</div>
                    <div>{toMealLabel(row.mealSets[0]?.dinner)}</div>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
