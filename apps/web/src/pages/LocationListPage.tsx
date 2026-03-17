import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatLocationNameMultiline, includesLocationNameKeyword, toFacilityLabel, toMealLabel } from '../features/location/display';
import { useLocationCrud } from '../features/location/hooks';
import { LocationSubNav } from '../features/location/sub-nav';

export function LocationListPage(): JSX.Element {
  const crud = useLocationCrud();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

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
              <Th>목적지</Th>
              <Th>조건</Th>
              <Th>숙소</Th>
              <Th>식사</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              return (
                <tr
                  key={row.id}
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
                    <div className="whitespace-pre-line">{formatLocationNameMultiline(row.name)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      기본 버전: {row.defaultVersion ? `${row.defaultVersion.label} (v${row.defaultVersion.versionNumber})` : '-'}
                    </div>
                    <div className="mt-2">
                      <Link
                        to={`/locations/${row.id}`}
                        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={(event) => event.stopPropagation()}
                      >
                        상세
                      </Link>
                    </div>
                  </Td>
                  <Td>
                    <div className="grid gap-1 text-sm">
                      <div>첫날 가능: {row.isFirstDayEligible ? 'Y' : 'N'}</div>
                      <div>마지막날 가능: {row.isLastDayEligible ? 'Y' : 'N'}</div>
                    </div>
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
                    <div className="grid gap-1 text-sm">
                      <div>아침 {toMealLabel(row.mealSets[0]?.breakfast)}</div>
                      <div>점심 {toMealLabel(row.mealSets[0]?.lunch)}</div>
                      <div>저녁 {toMealLabel(row.mealSets[0]?.dinner)}</div>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
