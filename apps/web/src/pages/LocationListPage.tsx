import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { Fragment, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatLocationNameMultiline, includesLocationNameKeyword, toFacilityLabel, toMealLabel } from '../features/location/display';
import { RegionNameChip } from '../features/region/region-name-chip';
import { useLocationCrud } from '../features/location/hooks';
import { mealsEarlyDiffersFromRegular, mealsFromVersionMealSets } from '../features/location/location-version-meals';
import { LocationSubNav } from '../features/location/sub-nav';

function buildFirstDayScheduleLines(row: ReturnType<typeof useLocationCrud>['rows'][number]): Array<{ time: string; activity: string }> {
  const blocks = [...(row.defaultVersion?.firstDayTimeBlocks ?? [])].sort((left, right) => left.orderIndex - right.orderIndex);

  return blocks.flatMap((block) => {
    const activities = [...block.activities]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((activity) => activity.description.trim())
      .filter((activity) => activity.length > 0);

    if (activities.length === 0) {
      return [{ time: block.startTime, activity: '-' }];
    }

    return activities.map((activity, index) => ({
      time: index === 0 ? block.startTime : '-',
      activity,
    }));
  });
}

export function LocationListPage(): JSX.Element {
  const crud = useLocationCrud();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowDeleteError, setRowDeleteError] = useState<{ rowId: string; message: string } | null>(null);

  const regions = useMemo(() => {
    return Array.from(new Set(crud.rows.map((row) => row.regionName))).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [crud.rows]);

  const filteredRows = useMemo(() => {
    const byRegion = selectedRegion === 'ALL' ? crud.rows : crud.rows.filter((row) => row.regionName === selectedRegion);
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return byRegion;
    }
    return byRegion.filter((row) => includesLocationNameKeyword(row.name, keyword));
  }, [crud.rows, searchKeyword, selectedRegion]);

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={location.pathname} />
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
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant={selectedRegion === 'ALL' ? 'default' : 'outline'} onClick={() => setSelectedRegion('ALL')}>
                전체
              </Button>
              {regions.map((regionName) => (
                <Button
                  key={regionName}
                  type="button"
                  variant={selectedRegion === regionName ? 'default' : 'outline'}
                  onClick={() => setSelectedRegion(regionName)}
                >
                  {regionName}
                </Button>
              ))}
            </div>
            <div className="w-full md:w-[280px]">
              <Input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="목적지 검색" />
            </div>
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>지역</Th>
              <Th>목적지</Th>
              <Th>조건</Th>
              <Th>첫날 일정</Th>
              <Th>숙소</Th>
              <Th>식사</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const firstDayScheduleLines = row.isFirstDayEligible ? buildFirstDayScheduleLines(row) : [];
              const deleteErrorForRow = rowDeleteError?.rowId === row.id ? rowDeleteError.message : null;

              return (
                <Fragment key={row.id}>
                  <tr
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    onClick={() => navigate(`/locations/${row.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/locations/${row.id}`);
                      }
                    }}
                  >
                  <Td>
                    <RegionNameChip name={row.regionName} />
                  </Td>
                  <Td>
                    <div className="whitespace-pre-line">{formatLocationNameMultiline(row.name)}</div>
                  </Td>
                  <Td>
                    <div className="grid gap-1 text-sm">
                      <div>첫날 가능: {row.isFirstDayEligible ? 'Y' : 'N'}</div>
                      <div>마지막날 가능: {row.isLastDayEligible ? 'Y' : 'N'}</div>
                    </div>
                  </Td>
                  <Td>
                    {firstDayScheduleLines.length > 0 ? (
                      <div className="grid gap-1 text-sm">
                        {firstDayScheduleLines.map((line, index) => (
                          <div key={`${row.id}-first-day-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                            <span className="font-medium text-slate-700">{line.time}</span>
                            <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">-</div>
                    )}
                  </Td>
                  <Td>
                    <div className="grid gap-1 text-sm">
                      <div>{row.lodgings[0]?.name ?? '-'}</div>
                      <div>전기({toFacilityLabel(row.lodgings[0]?.hasElectricity)})</div>
                      <div>샤워({toFacilityLabel(row.lodgings[0]?.hasShower)})</div>
                      <div>인터넷({toFacilityLabel(row.lodgings[0]?.hasInternet)})</div>
                    </div>
                  </Td>
                  <Td>
                    {(() => {
                      const { meals, mealsEarly } = mealsFromVersionMealSets(row.mealSets);
                      const earlyDiffers = row.isFirstDayEligible && mealsEarlyDiffersFromRegular(meals, mealsEarly);
                      return (
                        <div className="grid gap-1 text-sm">
                          {row.isFirstDayEligible ? (
                            <>
                              <div className="text-xs font-semibold text-slate-600">1일차 일반</div>
                              <div>아침 {toMealLabel(meals.breakfast)}</div>
                              <div>점심 {toMealLabel(meals.lunch)}</div>
                              <div>저녁 {toMealLabel(meals.dinner)}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-600">1일차 얼리</div>
                              {earlyDiffers ? (
                                <>
                                  <div>아침 {toMealLabel(mealsEarly.breakfast)}</div>
                                  <div>점심 {toMealLabel(mealsEarly.lunch)}</div>
                                  <div>저녁 {toMealLabel(mealsEarly.dinner)}</div>
                                </>
                              ) : (
                                <div className="text-slate-500">일반과 동일</div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>아침 {toMealLabel(meals.breakfast)}</div>
                              <div>점심 {toMealLabel(meals.lunch)}</div>
                              <div>저녁 {toMealLabel(meals.dinner)}</div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/locations/${row.id}`);
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        상세
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={deletingId === row.id}
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (!window.confirm(`'${formatLocationNameMultiline(row.name)}' 목적지를 삭제할까요?`)) {
                            return;
                          }

                          setDeletingId(row.id);
                          setRowDeleteError(null);
                          try {
                            await crud.deleteRow(row.id);
                          } catch (error) {
                            setRowDeleteError({
                              rowId: row.id,
                              message: error instanceof Error ? error.message : '목적지 삭제에 실패했습니다.',
                            });
                          } finally {
                            setDeletingId((current) => (current === row.id ? null : current));
                          }
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {deletingId === row.id ? '삭제 중...' : '삭제'}
                      </Button>
                    </div>
                  </Td>
                  </tr>
                  {deleteErrorForRow ? (
                    <tr className="bg-rose-50/80">
                      <Td colSpan={7} className="border-b border-rose-100 py-2.5 text-sm whitespace-pre-line text-rose-700">
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
