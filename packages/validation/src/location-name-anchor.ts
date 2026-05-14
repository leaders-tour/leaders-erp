/**
 * 목적지명 줄과 `/`(슬래시)로 나뉜 표기 블록 기준으로 앵커 토큰이 어느 줄에 속하는지 판별한다.
 * (일정 Segment 모델과 무관, Location 이름만 다룸.)
 */

export type GuideLocationNameLike = string[] | string | null | undefined;

/** DB `Location.name` / 견적 가이드 매칭과 동일한 줄 배열 */
export function normalizeGuideLocationNameLines(value: GuideLocationNameLike): string[] {
  if (Array.isArray(value)) {
    return value.map((line) => line.trim()).filter((line) => line.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

/** 줄·토큰 비교용: 공백 정리, NFC, 소문자(라틴) */
export function normalizeLocationAnchorToken(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLocaleLowerCase();
}

export function splitLocationNameLineIntoSlashParts(line: string): string[] {
  return line
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * 줄 배열 중, 위에서 아래로 각 줄을 `/`로 나눈 조각 중
 * 정규화된 앵커와 일치하는 조각이 처음 나오는 줄 인덱스.
 */
export function findAnchorLineIndexInLocationName(
  nameLines: readonly string[],
  anchorTokenRaw: string,
): number | null {
  const anchor = normalizeLocationAnchorToken(anchorTokenRaw);
  if (anchor.length === 0) {
    return null;
  }

  for (let lineIndex = 0; lineIndex < nameLines.length; lineIndex += 1) {
    const rawLine = nameLines[lineIndex] ?? '';
    const parts = splitLocationNameLineIntoSlashParts(rawLine);
    for (const part of parts) {
      if (normalizeLocationAnchorToken(part) === anchor) {
        return lineIndex;
      }
    }
    if (normalizeLocationAnchorToken(rawLine) === anchor) {
      return lineIndex;
    }
  }

  return null;
}

export function locationNameContainsAnchorToken(nameLines: readonly string[], anchorTokenRaw: string): boolean {
  return findAnchorLineIndexInLocationName(nameLines, anchorTokenRaw) != null;
}

/** Prisma `Location.name` 같은 원본 값 기준 줄 인덱스. */
export function findAnchorLineIndexForGuideLocationName(
  name: GuideLocationNameLike,
  anchorTokenRaw: string,
): number | null {
  const lines = normalizeGuideLocationNameLines(name);
  return findAnchorLineIndexInLocationName(lines, anchorTokenRaw);
}

/** `Location.name`에 앵커 표기 포함 여부. */
export function guideLocationNameContainsAnchorToken(name: GuideLocationNameLike, anchorTokenRaw: string): boolean {
  return findAnchorLineIndexForGuideLocationName(name, anchorTokenRaw) != null;
}

/**
 * 앵커 "기준" 목적지로 선택 가능한 이름: 이름 줄이 하나이며, 한 줄 안에 슬래시로 나뉜 조각도 하나뿐임(`a/b` 경유 표기 없음·이름 줄 여러 개 없음).
 */
export function guideLocationNameHasNoWaypointInForm(value: GuideLocationNameLike): boolean {
  const lines = normalizeGuideLocationNameLines(value);
  if (lines.length !== 1) {
    return false;
  }
  return splitLocationNameLineIntoSlashParts(lines[0]!).length === 1;
}