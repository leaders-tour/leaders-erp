import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Location } from '../generated/graphql';
import { useSegmentCrud } from '../features/segment/hooks';

const LOCATIONS_QUERY = gql`
  query SegmentLocations {
    locations {
      id
      regionId
      regionName
      name
    }
  }
`;

interface SegmentFormState {
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  isLongDistance: boolean;
}

const EMPTY_FORM: SegmentFormState = {
  fromLocationId: '',
  toLocationId: '',
  averageDistanceKm: '',
  averageTravelHours: '',
  isLongDistance: false,
};

export function SegmentPage(): JSX.Element {
  const crud = useSegmentCrud();
  const location = useLocation();
  const { data: locationData, loading: locationsLoading } = useQuery<{ locations: Location[] }>(LOCATIONS_QUERY);

  const [form, setForm] = useState<SegmentFormState>(EMPTY_FORM);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const locations = useMemo(() => locationData?.locations ?? [], [locationData]);

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);

  const filteredFromLocations = useMemo(() => {
    const keyword = fromSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((location) => location.name.toLowerCase().includes(keyword));
  }, [locations, fromSearch]);

  const filteredToLocations = useMemo(() => {
    const keyword = toSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((location) => location.name.toLowerCase().includes(keyword));
  }, [locations, toSearch]);

  const selectedFromLocation = form.fromLocationId ? locationById.get(form.fromLocationId) : undefined;
  const selectedToLocation = form.toLocationId ? locationById.get(form.toLocationId) : undefined;

  const canSubmit =
    !!selectedFromLocation &&
    !!selectedToLocation &&
    selectedFromLocation.regionId === selectedToLocation.regionId &&
    form.fromLocationId !== form.toLocationId &&
    Number(form.averageDistanceKm) > 0 &&
    Number(form.averageTravelHours) > 0;

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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">목적지 간 연결</h1>
        <p className="mt-1 text-sm text-slate-600">A/B 도착지를 검색 또는 드롭다운으로 선택해 연결 정보를 관리합니다.</p>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">연결 생성</h2>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSubmit || !selectedFromLocation || !selectedToLocation) {
              return;
            }

            setSubmitting(true);
            try {
              await crud.createRow({
                regionId: selectedFromLocation.regionId,
                fromLocationId: form.fromLocationId,
                toLocationId: form.toLocationId,
                averageDistanceKm: Number(form.averageDistanceKm),
                averageTravelHours: Number(form.averageTravelHours),
                isLongDistance: form.isLongDistance,
              });
              setForm(EMPTY_FORM);
              setFromSearch('');
              setToSearch('');
              setFromOpen(false);
              setToOpen(false);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
            <div className="grid gap-2 relative">
              <h3 className="text-sm font-semibold text-slate-800">A도착지</h3>
              <Input
                value={fromSearch}
                onFocus={() => setFromOpen(true)}
                onBlur={() => setTimeout(() => setFromOpen(false), 120)}
                onChange={(event) => {
                  setFromSearch(event.target.value);
                  setForm((prev) => ({ ...prev, fromLocationId: '' }));
                  setFromOpen(true);
                }}
                placeholder="도착지 검색 또는 선택"
              />
              {fromOpen ? (
                <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {filteredFromLocations.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                  ) : (
                    filteredFromLocations.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, fromLocationId: location.id }));
                          setFromSearch(location.name);
                          setFromOpen(false);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {location.name} ({location.regionName})
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 relative">
              <h3 className="text-sm font-semibold text-slate-800">B도착지</h3>
              <Input
                value={toSearch}
                onFocus={() => setToOpen(true)}
                onBlur={() => setTimeout(() => setToOpen(false), 120)}
                onChange={(event) => {
                  setToSearch(event.target.value);
                  setForm((prev) => ({ ...prev, toLocationId: '' }));
                  setToOpen(true);
                }}
                placeholder="도착지 검색 또는 선택"
              />
              {toOpen ? (
                <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {filteredToLocations.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                  ) : (
                    filteredToLocations.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, toLocationId: location.id }));
                          setToSearch(location.name);
                          setToOpen(false);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {location.name} ({location.regionName})
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">평균거리(km)</h3>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={form.averageDistanceKm}
              onChange={(event) => setForm((prev) => ({ ...prev, averageDistanceKm: event.target.value }))}
              placeholder="예: 120.5"
            />
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">평균 이동 시간(시간)</h3>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={form.averageTravelHours}
              onChange={(event) => setForm((prev) => ({ ...prev, averageTravelHours: event.target.value }))}
              placeholder="예: 3.5"
            />
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={form.isLongDistance}
              onChange={(event) => setForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
            />
            장거리 여행
          </label>

          {selectedFromLocation && selectedToLocation && selectedFromLocation.regionId !== selectedToLocation.regionId ? (
            <p className="text-sm text-red-600">A/B 도착지는 동일한 지역이어야 합니다.</p>
          ) : null}

          <div>
            <Button type="submit" disabled={!canSubmit || submitting || locationsLoading || crud.loading}>
              {submitting ? '생성 중...' : '이동경로 생성'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold tracking-tight">연결 목록</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>지역</Th>
              <Th>A도착지</Th>
              <Th>B도착지</Th>
              <Th>평균거리(km)</Th>
              <Th>평균 이동 시간(시간)</Th>
              <Th>장거리</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.id}</Td>
                <Td>{row.regionName}</Td>
                <Td>{locationById.get(row.fromLocationId)?.name ?? row.fromLocationId}</Td>
                <Td>{locationById.get(row.toLocationId)?.name ?? row.toLocationId}</Td>
                <Td>{row.averageDistanceKm}</Td>
                <Td>{row.averageTravelHours}</Td>
                <Td>{row.isLongDistance ? 'Y' : 'N'}</Td>
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
