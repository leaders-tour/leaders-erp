import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  query ItineraryTemplateRegions {
    regions {
      id
      name
    }
  }
`;

const PLAN_TEMPLATES_QUERY = gql`
  query ItineraryTemplates($regionId: ID, $totalDays: Int, $activeOnly: Boolean) {
    planTemplates(regionId: $regionId, totalDays: $totalDays, activeOnly: $activeOnly) {
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
  mutation UpdateItineraryTemplate($id: ID!, $input: PlanTemplateUpdateInput!) {
    updatePlanTemplate(id: $id, input: $input) {
      id
      name
      description
      regionId
      totalDays
      sortOrder
      isActive
    }
  }
`;

const DELETE_PLAN_TEMPLATE_MUTATION = gql`
  mutation DeleteItineraryTemplate($id: ID!) {
    deletePlanTemplate(id: $id)
  }
`;

export function ItineraryTemplatePage(): JSX.Element {
  const navigate = useNavigate();
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [dayFilter, setDayFilter] = useState<string>('6');
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formRegionId, setFormRegionId] = useState<string>('');
  const [formTotalDays, setFormTotalDays] = useState<number>(6);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);

  const totalDaysFilter = dayFilter === 'all' ? undefined : Number(dayFilter);
  const { data: templateData, loading, refetch } = useQuery<{ planTemplates: PlanTemplateRow[] }>(PLAN_TEMPLATES_QUERY, {
    variables: {
      regionId: regionFilter || undefined,
      totalDays: totalDaysFilter,
      activeOnly,
    },
  });

  const [updateTemplate, { loading: updating }] = useMutation(UPDATE_PLAN_TEMPLATE_MUTATION);
  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_PLAN_TEMPLATE_MUTATION);

  const regions = regionData?.regions ?? [];
  const templates = templateData?.planTemplates ?? [];
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateId('');
      return;
    }
    if (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? '');
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }
    setFormName(selectedTemplate.name);
    setFormDescription(selectedTemplate.description ?? '');
    setFormRegionId(selectedTemplate.regionId);
    setFormTotalDays(selectedTemplate.totalDays);
    setFormSortOrder(selectedTemplate.sortOrder);
    setFormIsActive(selectedTemplate.isActive);
  }, [selectedTemplate]);

  const regionNameById = useMemo(() => new Map(regions.map((region) => [region.id, region.name])), [regions]);

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">일정 템플릿</h1>
          <p className="mt-1 text-sm text-slate-600">템플릿 목록 조회 및 메타데이터를 관리합니다. 일정 본문은 빌더에서 수정합니다.</p>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">필터</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">지역</span>
            <select
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">전체</option>
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
              value={dayFilter}
              onChange={(event) => setDayFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">전체</option>
              {Array.from({ length: 9 }, (_, idx) => idx + 2).map((day) => (
                <option key={day} value={String(day)}>
                  {day}일
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-end gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            활성 템플릿만
          </label>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">템플릿 목록</h2>
          {loading ? <p className="mt-3 text-sm text-slate-500">불러오는 중...</p> : null}
          <div className="mt-3 overflow-auto">
            <Table className="min-w-[860px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>이름</Th>
                  <Th>지역</Th>
                  <Th>일수</Th>
                  <Th>상태</Th>
                  <Th>정렬</Th>
                  <Th>수정일</Th>
                  <Th>액션</Th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => {
                  const isSelected = template.id === selectedTemplateId;
                  return (
                    <tr key={template.id} className={`border-t border-slate-200 ${isSelected ? 'bg-slate-50' : ''}`}>
                      <Td>{template.name}</Td>
                      <Td>{regionNameById.get(template.regionId) ?? template.regionId}</Td>
                      <Td>{template.totalDays}일</Td>
                      <Td>{template.isActive ? '활성' : '비활성'}</Td>
                      <Td>{template.sortOrder}</Td>
                      <Td>{new Date(template.updatedAt).toLocaleString('ko-KR')}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => setSelectedTemplateId(template.id)}>
                            선택
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/itinerary-builder?templateId=${encodeURIComponent(template.id)}`)}
                          >
                            빌더로 이동
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={async () => {
                              if (!window.confirm(`템플릿 \"${template.name}\"을(를) 삭제할까요?`)) {
                                return;
                              }
                              await deleteTemplate({ variables: { id: template.id } });
                              await refetch();
                            }}
                          >
                            삭제
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">템플릿 메타 수정</h2>
          {!selectedTemplate ? (
            <p className="mt-3 text-sm text-slate-500">수정할 템플릿을 선택해주세요.</p>
          ) : (
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
              <p className="text-xs text-slate-500">
                6일 일정 본문(일차별 텍스트/루트)은 빌더 화면에서 템플릿을 불러와 수정 후 덮어쓰기 저장하세요.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  disabled={updating || !formName.trim() || !formRegionId}
                  onClick={async () => {
                    if (!selectedTemplate) {
                      return;
                    }
                    await updateTemplate({
                      variables: {
                        id: selectedTemplate.id,
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
                  }}
                >
                  {updating ? '저장 중...' : '메타 저장'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
