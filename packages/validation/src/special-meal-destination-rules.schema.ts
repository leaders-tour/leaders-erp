import { z } from 'zod';

const keywordRegionPairSchema = z.object({
  keyword: z.string().min(1).max(200),
  regionLabel: z.string().min(1).max(200),
});

const regionPrioritySchema = z.object({
  regionLabel: z.string().min(1).max(200),
  orderedLocationKeywords: z.array(z.string().min(1).max(200)),
});

export const specialMealDestinationRulesPayloadSchema = z.object({
  /** 샤브 허용: 목적지(Location) id 목록 (일정 칸 텍스트가 해당 목적지 이름과 매칭되면 허용) */
  shabushabuLocationIds: z.array(z.string().min(1).max(64)),
  samgyeopsalRegionKeywordMap: z.array(keywordRegionPairSchema),
  samgyeopsalPriorityByRegion: z.array(regionPrioritySchema),
  shashlikRegionKeywordMap: z.array(keywordRegionPairSchema),
  shashlikPriorityByRegion: z.array(regionPrioritySchema),
});

export type SpecialMealDestinationRulesPayload = z.infer<
  typeof specialMealDestinationRulesPayloadSchema
>;

/** DB 시드·되돌리기·클라 폴백 (샤브 허용 목적지는 운영에서 선택) */
export const SPECIAL_MEAL_DESTINATION_RULES_DEFAULT: SpecialMealDestinationRulesPayload = {
  shabushabuLocationIds: [],
  samgyeopsalRegionKeywordMap: [
    { keyword: '고비사막', regionLabel: '고비사막' },
    { keyword: '고비', regionLabel: '고비사막' },
    { keyword: '바양작', regionLabel: '고비사막' },
    { keyword: '차강소브라가', regionLabel: '고비사막' },
    { keyword: '박가츠린촐로', regionLabel: '고비사막' },
    { keyword: '욜린암', regionLabel: '고비사막' },
    { keyword: '중부', regionLabel: '중부' },
    { keyword: '어르헝폭포', regionLabel: '중부' },
    { keyword: '어기호수', regionLabel: '중부' },
    { keyword: '쳉헤르온천', regionLabel: '중부' },
    { keyword: '홉스골', regionLabel: '홉스골' },
    { keyword: '차강노르', regionLabel: '홉스골' },
  ],
  samgyeopsalPriorityByRegion: [
    { regionLabel: '고비사막', orderedLocationKeywords: ['바양작', '차강소브라가', '박가츠린촐로'] },
    { regionLabel: '중부', orderedLocationKeywords: ['어르헝폭포', '어기호수', '쳉헤르온천'] },
    { regionLabel: '홉스골', orderedLocationKeywords: ['홉스골', '차강노르'] },
  ],
  shashlikRegionKeywordMap: [
    { keyword: '테를지', regionLabel: '기타' },
    { keyword: '울란바토르', regionLabel: '기타' },
  ],
  shashlikPriorityByRegion: [
    { regionLabel: '기타', orderedLocationKeywords: ['테를지', '울란바토르'] },
  ],
};

type LegacyPayload = {
  shabushabuLocationKeywords?: unknown;
  shabushabuLocationIds?: unknown;
  shashlikRecommendedKeywords?: unknown;
  shashlikRegionKeywordMap?: unknown;
  shashlikPriorityByRegion?: unknown;
};

function migrateLegacyPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const o = { ...raw } as LegacyPayload & Record<string, unknown>;

  if (!Array.isArray(o.shabushabuLocationIds)) {
    o.shabushabuLocationIds = [];
  }
  delete o.shabushabuLocationKeywords;

  if (!Array.isArray(o.shashlikRegionKeywordMap) || !Array.isArray(o.shashlikPriorityByRegion)) {
    const old = o.shashlikRecommendedKeywords;
    if (Array.isArray(old) && old.length > 0) {
      const keywords = old
        .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        .map((k) => k.trim());
      o.shashlikRegionKeywordMap = keywords.map((k) => ({ keyword: k, regionLabel: '기타' }));
      o.shashlikPriorityByRegion = [{ regionLabel: '기타', orderedLocationKeywords: [...keywords] }];
    } else {
      o.shashlikRegionKeywordMap = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT.shashlikRegionKeywordMap;
      o.shashlikPriorityByRegion = SPECIAL_MEAL_DESTINATION_RULES_DEFAULT.shashlikPriorityByRegion;
    }
  }
  delete o.shashlikRecommendedKeywords;

  return o as Record<string, unknown>;
}

export function parseSpecialMealDestinationRulesPayload(
  value: unknown,
): SpecialMealDestinationRulesPayload {
  if (value === null || typeof value !== 'object') {
    return specialMealDestinationRulesPayloadSchema.parse(SPECIAL_MEAL_DESTINATION_RULES_DEFAULT);
  }
  const migrated = migrateLegacyPayload(value as Record<string, unknown>);
  return specialMealDestinationRulesPayloadSchema.parse(migrated);
}
