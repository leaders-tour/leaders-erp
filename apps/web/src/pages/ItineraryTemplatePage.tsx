import { gql, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface RegionRow {
  id: string;
  name: string;
}

interface PlanTemplateStopRow {
  id: string;
  dayIndex: number;
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
  regionId: string;
  totalDays: number;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

interface PlanTemplateDetailRow extends PlanTemplateRow {
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
      regionId
      totalDays
      sortOrder
      isActive
      updatedAt
    }
  }
`;

const PLAN_TEMPLATE_QUERY = gql`
  query ItineraryTemplateSummary($id: ID!) {
    planTemplate(id: $id) {
      id
      name
      regionId
      totalDays
      sortOrder
      isActive
      updatedAt
      planStops {
        id
        dayIndex
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

export function ItineraryTemplatePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSelectedTemplateId = searchParams.get('selectedTemplateId') ?? '';
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [dayFilter, setDayFilter] = useState<string>(initialSelectedTemplateId ? 'all' : '6');
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialSelectedTemplateId);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);

  const totalDaysFilter = dayFilter === 'all' ? undefined : Number(dayFilter);
  const { data: templateData, loading } = useQuery<{ planTemplates: PlanTemplateRow[] }>(PLAN_TEMPLATES_QUERY, {
    variables: {
      regionId: regionFilter || undefined,
      totalDays: totalDaysFilter,
      activeOnly,
    },
  });

  const { data: selectedTemplateData, loading: selectedTemplateLoading } = useQuery<{
    planTemplate: PlanTemplateDetailRow | null;
  }>(PLAN_TEMPLATE_QUERY, {
    variables: { id: selectedTemplateId },
    skip: !selectedTemplateId,
  });

  const regions = regionData?.regions ?? [];
  const templates = templateData?.planTemplates ?? [];
  const selectedTemplate = selectedTemplateData?.planTemplate ?? null;
  const orderedStops = useMemo(
    () => selectedTemplate?.planStops.slice().sort((a, b) => a.dayIndex - b.dayIndex) ?? [],
    [selectedTemplate],
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

  const regionNameById = useMemo(() => new Map(regions.map((region) => [region.id, region.name])), [regions]);

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">일정 템플릿</h1>
          <p className="mt-1 text-sm text-slate-600">목록에서 템플릿을 선택하면 하단에 본문 요약이 표시됩니다.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/itinerary-templates/new')}>
          신규 템플릿 생성
        </Button>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">필터</h2>
        <div className="mt-3 grid gap-4">
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">지역</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRegionFilter('')}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  regionFilter === ''
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                전체
              </button>
              {regions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setRegionFilter(region.id)}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${
                    regionFilter === region.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">일수</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDayFilter('all')}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  dayFilter === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                전체
              </button>
              {Array.from({ length: 9 }, (_, idx) => idx + 2).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDayFilter(String(day))}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${
                    dayFilter === String(day)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {day}일
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            활성 템플릿만
          </label>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">템플릿 목록</h2>
        {loading ? <p className="mt-3 text-sm text-slate-500">불러오는 중...</p> : null}
        <div className="mt-3 overflow-auto">
          <Table className="min-w-[920px] w-full text-sm">
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
                const isSelected = selectedTemplateId === template.id;
                return (
                  <tr
                    key={template.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTemplateId(template.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTemplateId(template.id);
                      }
                    }}
                    className={`cursor-pointer border-t border-slate-200 ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Td>{template.name}</Td>
                    <Td>{regionNameById.get(template.regionId) ?? template.regionId}</Td>
                    <Td>{template.totalDays}일</Td>
                    <Td>{template.isActive ? '활성' : '비활성'}</Td>
                    <Td>{template.sortOrder}</Td>
                    <Td>{new Date(template.updatedAt).toLocaleString('ko-KR')}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/itinerary-templates/${template.id}`);
                          }}
                        >
                          상세보기
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
        <h2 className="text-sm font-semibold text-slate-900">일차별 본문 요약 (읽기 전용)</h2>
        {selectedTemplateLoading ? <p className="mt-3 text-sm text-slate-500">요약 불러오는 중...</p> : null}
        {!selectedTemplateId ? <p className="mt-3 text-sm text-slate-500">선택된 템플릿이 없습니다.</p> : null}
        {selectedTemplate && orderedStops.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">일차별 본문 데이터가 없습니다.</p>
        ) : null}
        {selectedTemplate && orderedStops.length > 0 ? (
          <div className="mt-3 overflow-auto">
            <Table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>일차</Th>
                  <Th>날짜</Th>
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
                    <Td className="whitespace-pre-wrap">{stop.dateCellText}</Td>
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
        ) : null}
      </Card>
    </section>
  );
}
