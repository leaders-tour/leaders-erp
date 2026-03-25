import { ApolloError, gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const REGIONS_QUERY = gql`
  query RegionSetAdminRegions {
    regions {
      id
      name
    }
  }
`;

const REGION_SETS_ADMIN_QUERY = gql`
  query RegionSetsForAdmin($includeInactive: Boolean) {
    regionSets(includeInactive: $includeInactive) {
      id
      signature
      name
      isActive
      deletedAt
      items {
        id
        regionId
        sortOrder
        region {
          id
          name
        }
      }
    }
  }
`;

const CREATE_REGION_SET = gql`
  mutation CreateRegionSetFromAdmin($input: RegionSetCreateInput!) {
    createRegionSet(input: $input) {
      id
      signature
      name
      items {
        regionId
        region {
          id
          name
        }
      }
    }
  }
`;

interface RegionRow {
  id: string;
  name: string;
}

interface RegionSetItemRow {
  id: string;
  regionId: string;
  sortOrder: number;
  region: { id: string; name: string };
}

interface RegionSetListRow {
  id: string;
  signature: string;
  name: string;
  isActive: boolean;
  deletedAt: string | null;
  items: RegionSetItemRow[];
}

export function RegionSetAdminPage(): JSX.Element {
  const location = useLocation();
  /** 선택한 순서대로 지역 ID (먼저 고른 것이 앞) */
  const [selectedIdsInOrder, setSelectedIdsInOrder] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const {
    data: setsData,
    loading: setsLoading,
    refetch: refetchSets,
  } = useQuery<{ regionSets: RegionSetListRow[] }>(REGION_SETS_ADMIN_QUERY, {
    variables: { includeInactive: true },
  });

  const [createSet, { loading: creating }] = useMutation(CREATE_REGION_SET);

  const regions = regionData?.regions ?? [];
  const regionSets = setsData?.regionSets ?? [];

  const regionsSorted = useMemo(() => [...regions].sort((a, b) => a.name.localeCompare(b.name, 'ko')), [regions]);

  const regionById = useMemo(() => new Map(regions.map((r) => [r.id, r] as const)), [regions]);

  const selectedRegionsInPickOrder = useMemo(
    () => selectedIdsInOrder.map((id) => regionById.get(id)).filter((r): r is RegionRow => r != null),
    [regionById, selectedIdsInOrder],
  );

  const toggleRegion = (id: string): void => {
    setSelectedIdsInOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx >= 0) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
    setFeedback(null);
  };

  const handleCreate = async (): Promise<void> => {
    setFeedback(null);
    const ids = selectedRegionsInPickOrder.map((r) => r.id);
    if (ids.length === 0) {
      setFeedback({ type: 'err', message: '지역을 하나 이상 선택해 주세요.' });
      return;
    }

    try {
      const result = await createSet({
        variables: { input: { regionIds: ids } },
      });
      const created = result.data?.createRegionSet;
      await refetchSets();
      setSelectedIdsInOrder([]);
      setFeedback({
        type: 'ok',
        message: created
          ? `세트가 준비되었습니다. 이름: ${created.name} · ID: ${created.id}`
          : '요청이 완료되었습니다.',
      });
    } catch (e: unknown) {
      const gqlMsg = e instanceof ApolloError ? e.graphQLErrors[0]?.message : undefined;
      const msg =
        gqlMsg ??
        (e instanceof Error ? e.message : null) ??
        '생성에 실패했습니다.';
      setFeedback({ type: 'err', message: msg });
    }
  };

  const previewLabel =
    selectedRegionsInPickOrder.length === 0
      ? '—'
      : selectedRegionsInPickOrder.map((r) => r.name).join(' + ');

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">지역 세트</h1>
          <p className="mt-1 text-sm text-slate-600">
            복수 지역 조합 세트를 만듭니다. 같은 조합은 서버에서 하나로 통합되며, 이름은 지역명을 자동으로 이어 붙입니다.
          </p>
        </div>
      </header>

      {feedback ? (
        <Card
          className={`rounded-2xl border p-4 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {feedback.message}
        </Card>
      ) : null}

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">복합 세트 만들기</h2>
        <p className="mt-1 text-xs text-slate-600">
          두 개 이상 선택하면 새 조합이 생깁니다. 한 개만 선택하면 해당 지역의 기본(단일) 세트가 반환되며, 새 행은 만들어지지
          않습니다. 먼저 누른 지역이 이름·저장 순서의 앞쪽이 됩니다(같은 조합은 ID 정렬로 하나로 합쳐집니다).
        </p>

        <div className="mt-4 grid gap-3">
          <div className="text-xs font-medium text-slate-500">포함할 지역 선택</div>
          <div className="flex flex-wrap gap-2">
            {regionsSorted.map((region) => {
              const on = selectedIdsInOrder.includes(region.id);
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => toggleRegion(region.id)}
                  className={`rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                    on
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {region.name}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="text-xs text-slate-500">미리보기 이름(선택 순) · </span>
            {previewLabel}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={creating || selectedIdsInOrder.length === 0}
              onClick={() => void handleCreate()}
            >
              {creating ? '처리 중…' : '세트 생성/조회'}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setSelectedIdsInOrder([]);
                setFeedback(null);
              }}
            >
              선택 초기화
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">등록된 지역 세트</h2>
          <p className="mt-0.5 text-xs text-slate-500">비활성·삭제된 세트도 표시합니다.</p>
        </div>
        {setsLoading ? <p className="p-4 text-sm text-slate-500">불러오는 중…</p> : null}
        {!setsLoading ? (
          <div className="overflow-auto">
            <Table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-700">
                  <Th>이름</Th>
                  <Th>구성 지역</Th>
                  <Th>상태</Th>
                  <Th>signature</Th>
                </tr>
              </thead>
              <tbody>
                {regionSets.map((set) => {
                  const members = [...set.items]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((i) => i.region.name)
                    .join(' · ');
                  const status =
                    set.deletedAt != null ? '삭제됨' : set.isActive ? '활성' : '비활성';
                  return (
                    <tr key={set.id} className="border-t border-slate-200">
                      <Td className="font-medium">{set.name}</Td>
                      <Td className="text-slate-600">{members || '—'}</Td>
                      <Td>{status}</Td>
                      <Td className="font-mono text-xs text-slate-500">{set.signature}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
