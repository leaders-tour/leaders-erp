const TRAVEL_LINE_PATTERN = /^이동\s*(?:\d+(?:\.\d+)?\s*시간|미정)/u;
const DISTANCE_LINE_PATTERN = /^\(\s*(?:\d+(?:\.\d+)?\s*km|거리 미정)\s*\)$/u;
const INLINE_TRAVEL_PATTERN = /\s*이동\s*\d+(?:\.\d+)?\s*시간(?:\s*\(\s*\d+(?:\.\d+)?\s*km\s*\))?/gu;
const INLINE_DISTANCE_PATTERN = /\s*\(\s*\d+(?:\.\d+)?\s*km\s*\)/gu;

/** 목적지 셀에서 이동 시간·거리 문구를 제거하고 장소명만 남긴다. */
export function simplifyDestinationCellText(text: string): string {
  const lines = text.split('\n').map((line) => {
    return line.trim().replace(INLINE_TRAVEL_PATTERN, '').replace(INLINE_DISTANCE_PATTERN, '').trim();
  });

  return lines
    .filter((line) => line.length > 0 && !TRAVEL_LINE_PATTERN.test(line) && !DISTANCE_LINE_PATTERN.test(line))
    .join(' ')
    .trim();
}
