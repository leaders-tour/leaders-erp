import { gql, useMutation, useQuery } from '@apollo/client';
import { SPECIAL_MEAL_DESTINATION_RULES_DEFAULT } from '@tour/validation';
import { Button, Card } from '@tour/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatLocationNameInline } from '../features/location/display';
import { mapGqlSpecialMealDestinationRulesToPayload } from '../features/plan/hooks/use-special-meal-destination-rules';
import type { SpecialMealDestinationRules } from '../features/plan/special-meals';
import {
  SpecialMealDestinationRulesQueryDocument,
  UpdateSpecialMealDestinationRulesMutationDocument,
  type SpecialMealDestinationRulesInput,
} from '../generated/graphql';

const LOCATIONS_FOR_RULES_QUERY = gql`
  query SpecialMealRulesLocations {
    locations {
      id
      name
    }
  }
`;

interface LocationOptionRow {
  id: string;
  name: string[];
}

function cloneRules(r: SpecialMealDestinationRules): SpecialMealDestinationRules {
  return {
    shabushabuLocationIds: [...r.shabushabuLocationIds],
    shabushabuResolvedNameLines: r.shabushabuResolvedNameLines?.map((lines) => [...lines]),
    samgyeopsalRegionKeywordMap: r.samgyeopsalRegionKeywordMap.map((p) => ({ ...p })),
    samgyeopsalPriorityByRegion: r.samgyeopsalPriorityByRegion.map((p) => ({
      regionLabel: p.regionLabel,
      orderedLocationKeywords: [...p.orderedLocationKeywords],
    })),
    shashlikRegionKeywordMap: r.shashlikRegionKeywordMap.map((p) => ({ ...p })),
    shashlikPriorityByRegion: r.shashlikPriorityByRegion.map((p) => ({
      regionLabel: p.regionLabel,
      orderedLocationKeywords: [...p.orderedLocationKeywords],
    })),
  };
}

function toMutationInput(r: SpecialMealDestinationRules): SpecialMealDestinationRulesInput {
  return {
    shabushabuLocationIds: [...r.shabushabuLocationIds],
    samgyeopsalRegionKeywordMap: r.samgyeopsalRegionKeywordMap
      .filter((p) => p.keyword.trim() && p.regionLabel.trim())
      .map((p) => ({ keyword: p.keyword.trim(), regionLabel: p.regionLabel.trim() })),
    samgyeopsalPriorityByRegion: r.samgyeopsalPriorityByRegion
      .filter((p) => p.regionLabel.trim())
      .map((p) => ({
        regionLabel: p.regionLabel.trim(),
        orderedLocationKeywords: p.orderedLocationKeywords.map((s) => s.trim()).filter(Boolean),
      })),
    shashlikRegionKeywordMap: r.shashlikRegionKeywordMap
      .filter((p) => p.keyword.trim() && p.regionLabel.trim())
      .map((p) => ({ keyword: p.keyword.trim(), regionLabel: p.regionLabel.trim() })),
    shashlikPriorityByRegion: r.shashlikPriorityByRegion
      .filter((p) => p.regionLabel.trim())
      .map((p) => ({
        regionLabel: p.regionLabel.trim(),
        orderedLocationKeywords: p.orderedLocationKeywords.map((s) => s.trim()).filter(Boolean),
      })),
  };
}

/** draft에 선택한 id에 맞춰 이름 줄 갱신(저장 전 미리보기·로직 일치) */
function withShabushabuResolvedFromLocations(
  draft: SpecialMealDestinationRules,
  locationById: Map<string, string[]>,
): SpecialMealDestinationRules {
  const shabushabuResolvedNameLines = draft.shabushabuLocationIds.map(
    (id) => (locationById.get(id) ?? []).map((s) => s.trim()).filter(Boolean),
  );
  return { ...draft, shabushabuResolvedNameLines };
}

export function SpecialMealDestinationRulesPage(): JSX.Element {
  const { data, loading, refetch } = useQuery(SpecialMealDestinationRulesQueryDocument);
  const { data: locData } = useQuery<{ locations: LocationOptionRow[] }>(LOCATIONS_FOR_RULES_QUERY);
  const [updateRules, { loading: saving }] = useMutation(UpdateSpecialMealDestinationRulesMutationDocument);

  const [draft, setDraft] = useState<SpecialMealDestinationRules | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const locationById = useMemo(
    () => new Map((locData?.locations ?? []).map((l) => [l.id, l.name] as const)),
    [locData?.locations],
  );

  const locationOptionsSorted = useMemo(() => {
    const list = locData?.locations ?? [];
    return [...list].sort((a, b) =>
      formatLocationNameInline(a.name).localeCompare(formatLocationNameInline(b.name), 'ko'),
    );
  }, [locData?.locations]);

  useEffect(() => {
    if (data?.specialMealDestinationRules) {
      setDraft(mapGqlSpecialMealDestinationRulesToPayload(data.specialMealDestinationRules));
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!draft) {
      return;
    }
    setFeedback(null);
    try {
      await updateRules({
        variables: { input: toMutationInput(draft) },
      });
      await refetch();
      setFeedback({ type: 'ok', message: '저장했습니다.' });
    } catch (e) {
      setFeedback({
        type: 'err',
        message: e instanceof Error ? e.message : '저장에 실패했습니다.',
      });
    }
  }, [draft, refetch, updateRules]);

  const handleResetDefaults = useCallback(() => {
    const base = cloneRules(SPECIAL_MEAL_DESTINATION_RULES_DEFAULT);
    setDraft(withShabushabuResolvedFromLocations(base, locationById));
    setFeedback({ type: 'ok', message: '화면을 초기 기본값으로 채웠습니다. 저장하면 서버에 반영됩니다.' });
  }, [locationById]);

  if (loading && !draft) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-slate-600">불러오는 중…</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600">규칙을 불러오지 못했습니다.</p>
      </div>
    );
  }

  const updatedAt = data?.specialMealDestinationRules?.updatedAt;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">특식 여행지 규칙</h1>
        <p className="mt-1 text-sm text-slate-600">
          삼겹살·샤슬릭은 키워드와 지역 라벨, 지역별 추천 순서를 맞춥니다. 일정
          칸 텍스트가 등록한 이름·키워드와 부분 일치할 때 적용됩니다.
        </p>
        {updatedAt ? (
          <p className="mt-2 text-xs text-slate-500">마지막 수정: {new Date(updatedAt).toLocaleString('ko-KR')}</p>
        ) : null}
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <Card className="mb-6 rounded-2xl border border-slate-200 p-5">
        <h2 className="font-medium text-slate-900">삼겹살 — 키워드 ↔ 지역</h2>
        <p className="mt-1 text-xs text-slate-500">위에서부터 먼저 매칭 (긴·구체 키워드를 위에)</p>
        <ul className="mt-3 space-y-2">
          {draft.samgyeopsalRegionKeywordMap.map((p, i) => (
            <li key={`map-${i}`} className="flex flex-wrap gap-2 md:flex-nowrap">
              <input
                placeholder="키워드"
                value={p.keyword}
                onChange={(e) => {
                  const next = [...draft.samgyeopsalRegionKeywordMap];
                  next[i] = { ...next[i]!, keyword: e.target.value };
                  setDraft({ ...draft, samgyeopsalRegionKeywordMap: next });
                }}
                className="min-w-[120px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="지역 라벨"
                value={p.regionLabel}
                onChange={(e) => {
                  const next = [...draft.samgyeopsalRegionKeywordMap];
                  next[i] = { ...next[i]!, regionLabel: e.target.value };
                  setDraft({ ...draft, samgyeopsalRegionKeywordMap: next });
                }}
                className="min-w-[120px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const next = draft.samgyeopsalRegionKeywordMap.filter((_, j) => j !== i);
                  setDraft({ ...draft, samgyeopsalRegionKeywordMap: next });
                }}
              >
                삭제
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() =>
            setDraft({
              ...draft,
              samgyeopsalRegionKeywordMap: [...draft.samgyeopsalRegionKeywordMap, { keyword: '', regionLabel: '' }],
            })
          }
        >
          행 추가
        </Button>
      </Card>

      <Card className="mb-6 rounded-2xl border border-slate-200 p-5">
        <h2 className="font-medium text-slate-900">삼겹살 — 지역별 추천 순서</h2>
        <p className="mt-1 text-xs text-slate-500">앞쪽이 우선 (일정·목적지 텍스트 부분 일치)</p>
        <div className="mt-4 space-y-6">
          {draft.samgyeopsalPriorityByRegion.map((block, bi) => (
            <div key={`sam-prio-${bi}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  placeholder="지역 라벨 (위 키워드 매핑과 동일)"
                  value={block.regionLabel}
                  onChange={(e) => {
                    const next = [...draft.samgyeopsalPriorityByRegion];
                    next[bi] = { ...next[bi]!, regionLabel: e.target.value };
                    setDraft({ ...draft, samgyeopsalPriorityByRegion: next });
                  }}
                  className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const next = draft.samgyeopsalPriorityByRegion.filter((_, j) => j !== bi);
                    setDraft({ ...draft, samgyeopsalPriorityByRegion: next });
                  }}
                >
                  블록 삭제
                </Button>
              </div>
              <ul className="space-y-2">
                {block.orderedLocationKeywords.map((kw, ki) => (
                  <li key={`sam-prio-${bi}-${ki}`} className="flex flex-wrap items-center gap-2">
                    <span className="w-8 text-xs text-slate-400">{ki + 1}.</span>
                    <input
                      value={kw}
                      onChange={(e) => {
                        const next = [...draft.samgyeopsalPriorityByRegion];
                        const keywords = [...next[bi]!.orderedLocationKeywords];
                        keywords[ki] = e.target.value;
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, samgyeopsalPriorityByRegion: next });
                      }}
                      className="min-w-[160px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const next = [...draft.samgyeopsalPriorityByRegion];
                        const keywords = next[bi]!.orderedLocationKeywords.filter((_, j) => j !== ki);
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, samgyeopsalPriorityByRegion: next });
                      }}
                    >
                      삭제
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ki === 0}
                      onClick={() => {
                        const next = [...draft.samgyeopsalPriorityByRegion];
                        const keywords = [...next[bi]!.orderedLocationKeywords];
                        [keywords[ki - 1], keywords[ki]] = [keywords[ki]!, keywords[ki - 1]!];
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, samgyeopsalPriorityByRegion: next });
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ki === block.orderedLocationKeywords.length - 1}
                      onClick={() => {
                        const next = [...draft.samgyeopsalPriorityByRegion];
                        const keywords = [...next[bi]!.orderedLocationKeywords];
                        [keywords[ki], keywords[ki + 1]] = [keywords[ki + 1]!, keywords[ki]!];
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, samgyeopsalPriorityByRegion: next });
                      }}
                    >
                      ↓
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  const next = [...draft.samgyeopsalPriorityByRegion];
                  next[bi] = {
                    ...next[bi]!,
                    orderedLocationKeywords: [...next[bi]!.orderedLocationKeywords, ''],
                  };
                  setDraft({ ...draft, samgyeopsalPriorityByRegion: next });
                }}
              >
                추천지 추가
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() =>
            setDraft({
              ...draft,
              samgyeopsalPriorityByRegion: [
                ...draft.samgyeopsalPriorityByRegion,
                { regionLabel: '', orderedLocationKeywords: [''] },
              ],
            })
          }
        >
          지역 블록 추가
        </Button>
      </Card>

      <Card className="mb-6 rounded-2xl border border-slate-200 p-5">
        <h2 className="font-medium text-slate-900">샤슬릭 — 키워드 ↔ 지역</h2>
        <p className="mt-1 text-xs text-slate-500">삼겹살과 동일 규칙 형태</p>
        <ul className="mt-3 space-y-2">
          {draft.shashlikRegionKeywordMap.map((p, i) => (
            <li key={`shash-map-${i}`} className="flex flex-wrap gap-2 md:flex-nowrap">
              <input
                placeholder="키워드"
                value={p.keyword}
                onChange={(e) => {
                  const next = [...draft.shashlikRegionKeywordMap];
                  next[i] = { ...next[i]!, keyword: e.target.value };
                  setDraft({ ...draft, shashlikRegionKeywordMap: next });
                }}
                className="min-w-[120px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="지역 라벨"
                value={p.regionLabel}
                onChange={(e) => {
                  const next = [...draft.shashlikRegionKeywordMap];
                  next[i] = { ...next[i]!, regionLabel: e.target.value };
                  setDraft({ ...draft, shashlikRegionKeywordMap: next });
                }}
                className="min-w-[120px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const next = draft.shashlikRegionKeywordMap.filter((_, j) => j !== i);
                  setDraft({ ...draft, shashlikRegionKeywordMap: next });
                }}
              >
                삭제
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() =>
            setDraft({
              ...draft,
              shashlikRegionKeywordMap: [...draft.shashlikRegionKeywordMap, { keyword: '', regionLabel: '' }],
            })
          }
        >
          행 추가
        </Button>
      </Card>

      <Card className="mb-8 rounded-2xl border border-slate-200 p-5">
        <h2 className="font-medium text-slate-900">샤슬릭 — 지역별 추천 순서</h2>
        <div className="mt-4 space-y-6">
          {draft.shashlikPriorityByRegion.map((block, bi) => (
            <div key={`shash-prio-${bi}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  placeholder="지역 라벨"
                  value={block.regionLabel}
                  onChange={(e) => {
                    const next = [...draft.shashlikPriorityByRegion];
                    next[bi] = { ...next[bi]!, regionLabel: e.target.value };
                    setDraft({ ...draft, shashlikPriorityByRegion: next });
                  }}
                  className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const next = draft.shashlikPriorityByRegion.filter((_, j) => j !== bi);
                    setDraft({ ...draft, shashlikPriorityByRegion: next });
                  }}
                >
                  블록 삭제
                </Button>
              </div>
              <ul className="space-y-2">
                {block.orderedLocationKeywords.map((kw, ki) => (
                  <li key={`shash-prio-${bi}-${ki}`} className="flex flex-wrap items-center gap-2">
                    <span className="w-8 text-xs text-slate-400">{ki + 1}.</span>
                    <input
                      value={kw}
                      onChange={(e) => {
                        const next = [...draft.shashlikPriorityByRegion];
                        const keywords = [...next[bi]!.orderedLocationKeywords];
                        keywords[ki] = e.target.value;
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, shashlikPriorityByRegion: next });
                      }}
                      className="min-w-[160px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const next = [...draft.shashlikPriorityByRegion];
                        const keywords = next[bi]!.orderedLocationKeywords.filter((_, j) => j !== ki);
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, shashlikPriorityByRegion: next });
                      }}
                    >
                      삭제
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ki === 0}
                      onClick={() => {
                        const next = [...draft.shashlikPriorityByRegion];
                        const keywords = [...next[bi]!.orderedLocationKeywords];
                        [keywords[ki - 1], keywords[ki]] = [keywords[ki]!, keywords[ki - 1]!];
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, shashlikPriorityByRegion: next });
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ki === block.orderedLocationKeywords.length - 1}
                      onClick={() => {
                        const next = [...draft.shashlikPriorityByRegion];
                        const keywords = [...next[bi]!.orderedLocationKeywords];
                        [keywords[ki], keywords[ki + 1]] = [keywords[ki + 1]!, keywords[ki]!];
                        next[bi] = { ...next[bi]!, orderedLocationKeywords: keywords };
                        setDraft({ ...draft, shashlikPriorityByRegion: next });
                      }}
                    >
                      ↓
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  const next = [...draft.shashlikPriorityByRegion];
                  next[bi] = {
                    ...next[bi]!,
                    orderedLocationKeywords: [...next[bi]!.orderedLocationKeywords, ''],
                  };
                  setDraft({ ...draft, shashlikPriorityByRegion: next });
                }}
              >
                추천지 추가
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() =>
            setDraft({
              ...draft,
              shashlikPriorityByRegion: [
                ...draft.shashlikPriorityByRegion,
                { regionLabel: '', orderedLocationKeywords: [''] },
              ],
            })
          }
        >
          지역 블록 추가
        </Button>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </Button>
        <Button type="button" variant="outline" onClick={handleResetDefaults}>
          기본값으로 되돌리기 (화면)
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (data?.specialMealDestinationRules) {
              setDraft(mapGqlSpecialMealDestinationRulesToPayload(data.specialMealDestinationRules));
              setFeedback({ type: 'ok', message: '서버에 저장된 값으로 다시 불러왔습니다.' });
            }
          }}
        >
          서버 값으로 재로드
        </Button>
      </div>
    </div>
  );
}
