import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LocationSubNav } from '../features/location/sub-nav';
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
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SegmentFormState>(EMPTY_FORM);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [editFromSearch, setEditFromSearch] = useState('');
  const [editToSearch, setEditToSearch] = useState('');
  const [editFromOpen, setEditFromOpen] = useState(false);
  const [editToOpen, setEditToOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);

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
  const selectedEditFromLocation = editForm.fromLocationId ? locationById.get(editForm.fromLocationId) : undefined;
  const selectedEditToLocation = editForm.toLocationId ? locationById.get(editForm.toLocationId) : undefined;

  const canSubmit =
    !!selectedFromLocation &&
    !!selectedToLocation &&
    selectedFromLocation.regionId === selectedToLocation.regionId &&
    form.fromLocationId !== form.toLocationId &&
    Number(form.averageDistanceKm) > 0 &&
    Number(form.averageTravelHours) > 0;

  const canUpdate =
    !!selectedEditFromLocation &&
    !!selectedEditToLocation &&
    selectedEditFromLocation.regionId === selectedEditToLocation.regionId &&
    editForm.fromLocationId !== editForm.toLocationId &&
    Number(editForm.averageDistanceKm) > 0 &&
    Number(editForm.averageTravelHours) > 0;

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={location.pathname} />
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
              <h3 className="text-sm font-semibold text-slate-800">출발지</h3>
              <Input
                value={fromSearch}
                onFocus={() => setFromOpen(true)}
                onBlur={() => setTimeout(() => setFromOpen(false), 120)}
                onChange={(event) => {
                  setFromSearch(event.target.value);
                  setForm((prev) => ({ ...prev, fromLocationId: '' }));
                  setFromOpen(true);
                }}
                placeholder="출발지 검색 또는 선택"
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
              <h3 className="text-sm font-semibold text-slate-800">도착지</h3>
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

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={form.isLongDistance}
              onChange={(event) => setForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
            />
            장거리 여행
            <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
          </label>

          {selectedFromLocation && selectedToLocation && selectedFromLocation.regionId !== selectedToLocation.regionId ? (
            <p className="text-sm text-red-600">출발지와 도착지는 동일한 지역이어야 합니다.</p>
          ) : null}

          <div>
            <Button type="submit" variant="primary" disabled={!canSubmit || submitting || locationsLoading || crud.loading}>
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
              <Th>지역</Th>
              <Th>출발지</Th>
              <Th>도착지</Th>
              <Th>평균거리(km)</Th>
              <Th>평균 이동 시간(시간)</Th>
              <Th>장거리</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.regionName}</Td>
                <Td>{locationById.get(row.fromLocationId)?.name ?? row.fromLocationId}</Td>
                <Td>{locationById.get(row.toLocationId)?.name ?? row.toLocationId}</Td>
                <Td>{row.averageDistanceKm}</Td>
                <Td>{row.averageTravelHours}</Td>
                <Td>{row.isLongDistance ? 'Y' : 'N'}</Td>
                <Td>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSegmentId(row.id);
                      setEditForm({
                        fromLocationId: row.fromLocationId,
                        toLocationId: row.toLocationId,
                        averageDistanceKm: String(row.averageDistanceKm),
                        averageTravelHours: String(row.averageTravelHours),
                        isLongDistance: row.isLongDistance,
                      });
                      setEditFromSearch(locationById.get(row.fromLocationId)?.name ?? '');
                      setEditToSearch(locationById.get(row.toLocationId)?.name ?? '');
                      setEditFromOpen(false);
                      setEditToOpen(false);
                    }}
                  >
                    수정
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {editingSegmentId ? (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">연결 수정</h2>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canUpdate || !selectedEditFromLocation || !selectedEditToLocation || !editingSegmentId) {
                return;
              }

              setUpdating(true);
              try {
                await crud.updateRow(editingSegmentId, {
                  regionId: selectedEditFromLocation.regionId,
                  fromLocationId: editForm.fromLocationId,
                  toLocationId: editForm.toLocationId,
                  averageDistanceKm: Number(editForm.averageDistanceKm),
                  averageTravelHours: Number(editForm.averageTravelHours),
                  isLongDistance: editForm.isLongDistance,
                });
                setEditingSegmentId(null);
                setEditForm(EMPTY_FORM);
                setEditFromSearch('');
                setEditToSearch('');
                setEditFromOpen(false);
                setEditToOpen(false);
              } finally {
                setUpdating(false);
              }
            }}
          >
            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
              <div className="relative grid gap-2">
                <h3 className="text-sm font-semibold text-slate-800">출발지</h3>
                <Input
                  value={editFromSearch}
                  onFocus={() => setEditFromOpen(true)}
                  onBlur={() => setTimeout(() => setEditFromOpen(false), 120)}
                  onChange={(event) => {
                    setEditFromSearch(event.target.value);
                    setEditForm((prev) => ({ ...prev, fromLocationId: '' }));
                    setEditFromOpen(true);
                  }}
                  placeholder="출발지 검색 또는 선택"
                />
                {editFromOpen ? (
                  <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    {filteredFromLocations.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                    ) : (
                      filteredFromLocations.map((location) => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => {
                            setEditForm((prev) => ({ ...prev, fromLocationId: location.id }));
                            setEditFromSearch(location.name);
                            setEditFromOpen(false);
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

              <div className="relative grid gap-2">
                <h3 className="text-sm font-semibold text-slate-800">도착지</h3>
                <Input
                  value={editToSearch}
                  onFocus={() => setEditToOpen(true)}
                  onBlur={() => setTimeout(() => setEditToOpen(false), 120)}
                  onChange={(event) => {
                    setEditToSearch(event.target.value);
                    setEditForm((prev) => ({ ...prev, toLocationId: '' }));
                    setEditToOpen(true);
                  }}
                  placeholder="도착지 검색 또는 선택"
                />
                {editToOpen ? (
                  <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    {filteredToLocations.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                    ) : (
                      filteredToLocations.map((location) => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => {
                            setEditForm((prev) => ({ ...prev, toLocationId: location.id }));
                            setEditToSearch(location.name);
                            setEditToOpen(false);
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
              <h3 className="text-sm font-semibold text-slate-800">평균 이동 시간(시간)</h3>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={editForm.averageTravelHours}
                onChange={(event) => setEditForm((prev) => ({ ...prev, averageTravelHours: event.target.value }))}
                placeholder="예: 3.5"
              />
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800">평균거리(km)</h3>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={editForm.averageDistanceKm}
                onChange={(event) => setEditForm((prev) => ({ ...prev, averageDistanceKm: event.target.value }))}
                placeholder="예: 120.5"
              />
            </div>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={editForm.isLongDistance}
                onChange={(event) => setEditForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
              />
              장거리 여행
              <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
            </label>

            {selectedEditFromLocation && selectedEditToLocation && selectedEditFromLocation.regionId !== selectedEditToLocation.regionId ? (
              <p className="text-sm text-red-600">A/B 도착지는 동일한 지역이어야 합니다.</p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={!canUpdate || updating || locationsLoading || crud.loading}>
                {updating ? '저장 중...' : '수정 저장'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingSegmentId(null);
                  setEditForm(EMPTY_FORM);
                  setEditFromSearch('');
                  setEditToSearch('');
                  setEditFromOpen(false);
                  setEditToOpen(false);
                }}
              >
                취소
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </section>
  );
}
