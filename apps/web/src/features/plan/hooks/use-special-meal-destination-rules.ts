import { useQuery } from '@apollo/client';
import {
  SpecialMealDestinationRulesQueryDocument,
  type SpecialMealDestinationRulesQueryQuery,
} from '../../../generated/graphql';
import {
  DEFAULT_SPECIAL_MEAL_DESTINATION_RULES,
  type SpecialMealDestinationRules,
} from '../special-meals';

export function mapGqlSpecialMealDestinationRulesToPayload(
  row: SpecialMealDestinationRulesQueryQuery['specialMealDestinationRules'],
): SpecialMealDestinationRules {
  const shabushabuResolvedNameLines = row.shabushabuLocations.map((loc) =>
    [...loc.name].map((s) => s.trim()).filter(Boolean),
  );
  return {
    shabushabuLocationIds: [...row.shabushabuLocationIds],
    shabushabuResolvedNameLines,
    samgyeopsalRegionKeywordMap: row.samgyeopsalRegionKeywordMap.map((p) => ({
      keyword: p.keyword,
      regionLabel: p.regionLabel,
    })),
    samgyeopsalPriorityByRegion: row.samgyeopsalPriorityByRegion.map((p) => ({
      regionLabel: p.regionLabel,
      orderedLocationKeywords: [...p.orderedLocationKeywords],
    })),
    shashlikRegionKeywordMap: row.shashlikRegionKeywordMap.map((p) => ({
      keyword: p.keyword,
      regionLabel: p.regionLabel,
    })),
    shashlikPriorityByRegion: row.shashlikPriorityByRegion.map((p) => ({
      regionLabel: p.regionLabel,
      orderedLocationKeywords: [...p.orderedLocationKeywords],
    })),
  };
}

export function useSpecialMealDestinationRules(): {
  rules: SpecialMealDestinationRules;
  loading: boolean;
} {
  const { data, loading } = useQuery(SpecialMealDestinationRulesQueryDocument, {
    fetchPolicy: 'cache-and-network',
  });
  const rules = data?.specialMealDestinationRules
    ? mapGqlSpecialMealDestinationRulesToPayload(data.specialMealDestinationRules)
    : DEFAULT_SPECIAL_MEAL_DESTINATION_RULES;
  return { rules, loading };
}
