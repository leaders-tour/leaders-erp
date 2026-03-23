import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, SectionHeader, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useRegionLodgingCrud } from '../features/lodging-selection/hooks';

const REGIONS_QUERY = gql`
  query RegionLodgingRegions {
    regions {
      id
      name
    }
  }
`;

type RegionRow = {
  id: string;
  name: string;
};

type RegionLodgingRow = {
  id: string;
  regionId: string;
  name: string;
  priceKrw?: number | null;
  pricePerPersonKrw?: number | null;
  pricePerTeamKrw?: number | null;
  isActive: boolean;
  sortOrder: number;
  region?: {
    id: string;
    name: string;
  } | null;
};

type RegionLodgingPriceMode = 'PER_PERSON' | 'PER_TEAM';

interface RegionLodgingFormState {
  regionId: string;
  name: string;
  priceMode: RegionLodgingPriceMode;
  priceValue: string;
  sortOrder: string;
}

function createEmptyForm(regionId = ''): RegionLodgingFormState {
  return {
    regionId,
    name: '',
    priceMode: 'PER_PERSON',
    priceValue: '',
    sortOrder: '0',
  };
}

function toFormState(row: RegionLodgingRow): RegionLodgingFormState {
  const priceMode: RegionLodgingPriceMode = row.pricePerPersonKrw != null ? 'PER_PERSON' : 'PER_TEAM';
  const priceValue =
    row.pricePerPersonKrw != null ? String(row.pricePerPersonKrw) : row.pricePerTeamKrw != null ? String(row.pricePerTeamKrw) : '';

  return {
    regionId: row.regionId,
    name: row.name,
    priceMode,
    priceValue,
    sortOrder: String(row.sortOrder),
  };
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function getPriceModeLabel(priceMode: RegionLodgingPriceMode): string {
  return priceMode === 'PER_PERSON' ? '인당 가격' : '팀당 가격';
}

function validateForm(form: RegionLodgingFormState): string | null {
  if (!form.regionId) {
    return '지역을 선택해 주세요.';
  }

  if (!form.name.trim()) {
    return '숙소명을 입력해 주세요.';
  }

  const priceValue = parseOptionalInt(form.priceValue);
  const sortOrder = parseOptionalInt(form.sortOrder);
  const priceModeLabel = getPriceModeLabel(form.priceMode);

  if (form.priceValue.trim() && priceValue == null) {
    return `${priceModeLabel}은 0 이상의 정수로 입력해 주세요.`;
  }

  if (sortOrder == null) {
    return '정렬순서는 0 이상의 정수로 입력해 주세요.';
  }

  if (priceValue == null) {
    return `${priceModeLabel}을 입력해 주세요.`;
  }

  return null;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) {
    return '-';
  }

  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatPriceType(row: Pick<RegionLodgingRow, 'priceKrw' | 'pricePerPersonKrw' | 'pricePerTeamKrw'>): string {
  if (row.pricePerPersonKrw != null) {
    return '인당';
  }
  if (row.pricePerTeamKrw != null) {
    return '팀당';
  }
  if (row.priceKrw != null) {
    return '기존 총액';
  }
  return '-';
}

function formatPriceValue(row: Pick<RegionLodgingRow, 'priceKrw' | 'pricePerPersonKrw' | 'pricePerTeamKrw'>): string {
  if (row.pricePerPersonKrw != null) {
    return formatNumber(row.pricePerPersonKrw);
  }
  if (row.pricePerTeamKrw != null) {
    return formatNumber(row.pricePerTeamKrw);
  }
  if (row.priceKrw != null) {
    return formatNumber(row.priceKrw);
  }
  return '-';
}

export function RegionLodgingPage(): JSX.Element {
  const crud = useRegionLodgingCrud();
  const { data: regionData, loading: regionsLoading } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const [form, setForm] = useState<RegionLodgingFormState>(createEmptyForm);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const regions = useMemo(() => regionData?.regions ?? [], [regionData]);
  const regionNameById = useMemo(() => new Map(regions.map((region) => [region.id, region.name])), [regions]);
  const isEditing = editingRowId !== null;

  const submitLabel = isEditing ? '수정 저장' : '신규 생성';
  const submitVariant = isEditing ? 'default' : 'primary';

  return (
    <section className="grid gap-6">
      <SectionHeader title="지역 숙소" description="생성/수정/삭제를 한 화면에서 처리합니다." />

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{isEditing ? '지역 숙소 수정' : '지역 숙소 생성'}</h2>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();

            const validationError = validateForm(form);
            if (validationError) {
              setErrorMessage(validationError);
              return;
            }

            const payload = {
              regionId: form.regionId,
              name: form.name.trim(),
              pricePerPersonKrw: form.priceMode === 'PER_PERSON' ? parseOptionalInt(form.priceValue) : null,
              pricePerTeamKrw: form.priceMode === 'PER_TEAM' ? parseOptionalInt(form.priceValue) : null,
              sortOrder: parseOptionalInt(form.sortOrder) ?? 0,
            };

            setSubmitting(true);
            setErrorMessage(null);

            try {
              if (editingRowId) {
                await crud.updateRow(editingRowId, payload);
                setEditingRowId(null);
                setForm(createEmptyForm());
              } else {
                await crud.createRow(payload);
                setForm(createEmptyForm(form.regionId));
              }
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : '지역 숙소 저장에 실패했습니다.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-1">
              <h3 className="text-sm font-semibold text-slate-800">지역</h3>
              <p className="text-xs text-slate-500">목적지 생성 페이지처럼 버튼으로 지역을 선택합니다.</p>
            </div>
            {regionsLoading ? (
              <div className="text-sm text-slate-500">지역 목록을 불러오는 중...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, regionId: region.id }))}
                    className={`rounded-xl border px-3 py-1.5 text-sm ${
                      form.regionId === region.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-700">숙소명</span>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-slate-700">정렬순서</span>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-1">
              <h3 className="text-sm font-semibold text-slate-800">가격 설정</h3>
              <p className="text-xs text-slate-500">먼저 가격 유형을 고른 뒤 금액을 입력합니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={form.priceMode === 'PER_PERSON' ? 'default' : 'outline'}
                onClick={() => setForm((prev) => ({ ...prev, priceMode: 'PER_PERSON' }))}
              >
                인당 가격
              </Button>
              <Button
                type="button"
                variant={form.priceMode === 'PER_TEAM' ? 'default' : 'outline'}
                onClick={() => setForm((prev) => ({ ...prev, priceMode: 'PER_TEAM' }))}
              >
                팀당 가격
              </Button>
            </div>
            <label className="grid gap-2 text-sm md:max-w-sm">
              <span className="text-slate-700">{getPriceModeLabel(form.priceMode)}</span>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.priceValue}
                onChange={(event) => setForm((prev) => ({ ...prev, priceValue: event.target.value }))}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant={submitVariant} disabled={submitting || regionsLoading || crud.loading}>
              {submitting ? '저장 중...' : submitLabel}
            </Button>
            {isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingRowId(null);
                  setForm(createEmptyForm());
                  setErrorMessage(null);
                }}
              >
                취소
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      {crud.loading ? (
        <Card className="rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm text-slate-600">데이터 로딩 중...</Card>
      ) : null}

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold tracking-tight">지역 숙소 목록</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>지역</Th>
              <Th>숙소명</Th>
              <Th>가격 구분</Th>
              <Th>가격</Th>
              <Th>정렬순서</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.length === 0 ? (
              <tr>
                <Td className="text-slate-500" colSpan={7}>
                  데이터가 없습니다.
                </Td>
              </tr>
            ) : (
              crud.rows.map((row) => (
                <tr key={row.id}>
                  <Td>{row.id}</Td>
                  <Td>{row.region?.name ?? regionNameById.get(row.regionId) ?? row.regionId}</Td>
                  <Td>{row.name}</Td>
                  <Td>{formatPriceType(row)}</Td>
                  <Td>{formatPriceValue(row)}</Td>
                  <Td>{row.sortOrder}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingRowId(row.id);
                          setForm(toFormState(row));
                          setErrorMessage(null);
                        }}
                      >
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          if (!window.confirm('이 지역 숙소를 삭제할까요?')) {
                            return;
                          }

                          try {
                            setErrorMessage(null);
                            await crud.deleteRow(row.id);
                            if (editingRowId === row.id) {
                              setEditingRowId(null);
                              setForm(createEmptyForm());
                            }
                          } catch (error) {
                            setErrorMessage(error instanceof Error ? error.message : '지역 숙소 삭제에 실패했습니다.');
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
