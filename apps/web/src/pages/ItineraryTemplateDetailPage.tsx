import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface RegionRow {
  id: string;
  name: string;
}

interface PlanTemplateStopRow {
  id: string;
  dayIndex: number;
  locationId: string | null;
  locationVersionId: string | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

interface PlanTemplateRow {
  id: string;
  name: string;
  description: string | null;
  regionId: string;
  totalDays: number;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  planStops: PlanTemplateStopRow[];
}

const REGIONS_QUERY = gql`
  query ItineraryTemplateDetailRegions {
    regions {
      id
      name
    }
  }
`;

const PLAN_TEMPLATE_QUERY = gql`
  query ItineraryTemplateDetail($id: ID!) {
    planTemplate(id: $id) {
      id
      name
      description
      regionId
      totalDays
      sortOrder
      isActive
      updatedAt
      planStops {
        id
        dayIndex
        locationId
        locationVersionId
        dateCellText
        destinationCellText
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const UPDATE_PLAN_TEMPLATE_MUTATION = gql`
  mutation UpdateItineraryTemplateDetail($id: ID!, $input: PlanTemplateUpdateInput!) {
    updatePlanTemplate(id: $id, input: $input) {
      id
      name
      description
      regionId
      totalDays
      sortOrder
      isActive
      updatedAt
    }
  }
`;

const DELETE_PLAN_TEMPLATE_MUTATION = gql`
  mutation DeleteItineraryTemplateDetail($id: ID!) {
    deletePlanTemplate(id: $id)
  }
`;

export function ItineraryTemplateDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();

  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formRegionId, setFormRegionId] = useState<string>('');
  const [formTotalDays, setFormTotalDays] = useState<number>(6);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const {
    data: templateData,
    loading,
    error,
    refetch,
  } = useQuery<{ planTemplate: PlanTemplateRow | null }>(PLAN_TEMPLATE_QUERY, {
    variables: { id: templateId },
    skip: !templateId,
  });

  const [updateTemplate, { loading: updating }] = useMutation(UPDATE_PLAN_TEMPLATE_MUTATION);
  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_PLAN_TEMPLATE_MUTATION);

  const template = templateData?.planTemplate ?? null;
  const regions = regionData?.regions ?? [];
  const orderedStops = useMemo(() => template?.planStops.slice().sort((a, b) => a.dayIndex - b.dayIndex) ?? [], [template]);

  useEffect(() => {
    if (!template) {
      return;
    }
    setFormName(template.name);
    setFormDescription(template.description ?? '');
    setFormRegionId(template.regionId);
    setFormTotalDays(template.totalDays);
    setFormSortOrder(template.sortOrder);
    setFormIsActive(template.isActive);
    setSaveMessage('');
  }, [template]);

  if (!templateId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (error) {
    return (
      <section className="grid gap-4 py-8">
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-xl font-semibold text-rose-900">오류가 발생했습니다</h1>
          <p className="mt-2 text-sm text-rose-800">템플릿 데이터를 불러오지 못했습니다.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/itinerary-templates')}>목록으로 이동</Button>
          </div>
        </Card>
      </section>
    );
  }

  if (!template) {
    return (
      <section className="grid gap-4 py-8">
        <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-900">템플릿을 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-amber-800">삭제되었거나 잘못된 템플릿 ID입니다.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/itinerary-templates')}>목록으로 이동</Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{template.name}</h1>
          <p className="mt-1 text-sm text-slate-600">템플릿 메타정보를 수정하고 일정 빌더로 이동할 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/itinerary-templates')}>
            목록으로
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/itinerary-builder?templateId=${encodeURIComponent(template.id)}`)}
          >
            빌더로 이동
          </Button>
        </div>
      </header>

      {saveMessage ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{saveMessage}</Card>
      ) : null}

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">템플릿 메타 수정</h2>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">이름</span>
            <input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">설명</span>
            <textarea
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              rows={3}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">지역</span>
            <select
              value={formRegionId}
              onChange={(event) => setFormRegionId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">선택</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">일수</span>
            <select
              value={String(formTotalDays)}
              onChange={(event) => setFormTotalDays(Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {Array.from({ length: 9 }, (_, idx) => idx + 2).map((day) => (
                <option key={day} value={String(day)}>
                  {day}일
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">정렬 순서</span>
            <input
              type="number"
              min={0}
              value={formSortOrder}
              onChange={(event) => setFormSortOrder(Math.max(0, Number(event.target.value) || 0))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(event) => setFormIsActive(event.target.checked)}
            />
            활성
          </label>
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={updating || !formName.trim() || !formRegionId}
              onClick={async () => {
                await updateTemplate({
                  variables: {
                    id: template.id,
                    input: {
                      name: formName.trim(),
                      description: formDescription.trim(),
                      regionId: formRegionId,
                      totalDays: formTotalDays,
                      sortOrder: formSortOrder,
                      isActive: formIsActive,
                    },
                  },
                });
                await refetch();
                setSaveMessage('템플릿 메타정보를 저장했습니다.');
              }}
            >
              {updating ? '저장 중...' : '메타 저장'}
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm(`템플릿 \"${template.name}\"을(를) 삭제할까요?`)) {
                  return;
                }
                await deleteTemplate({ variables: { id: template.id } });
                navigate('/itinerary-templates');
              }}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">일차별 본문 요약 (읽기 전용)</h2>
        <p className="mt-1 text-xs text-slate-500">본문 수정은 일정 빌더에서 템플릿 적용 후 덮어쓰기 저장으로 처리합니다.</p>
        <div className="mt-3 overflow-auto">
          <Table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>일차</Th>
                <Th>목적지</Th>
                <Th>시간</Th>
                <Th>일정</Th>
                <Th>숙소</Th>
                <Th>식사</Th>
              </tr>
            </thead>
            <tbody>
              {orderedStops.map((stop) => (
                <tr key={stop.id} className="border-t border-slate-200 align-top">
                  <Td>{stop.dayIndex}일차</Td>
                  <Td className="whitespace-pre-wrap">{stop.destinationCellText}</Td>
                  <Td className="whitespace-pre-wrap">{stop.timeCellText}</Td>
                  <Td className="whitespace-pre-wrap">{stop.scheduleCellText}</Td>
                  <Td className="whitespace-pre-wrap">{stop.lodgingCellText}</Td>
                  <Td className="whitespace-pre-wrap">{stop.mealCellText}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </section>
  );
}
