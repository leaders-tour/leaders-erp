export interface TemplateCandidateForPrompt {
  id: string;
  name: string;
  description: string | null;
}

export function buildTemplateRecommendationPrompt(input: {
  rawText: string;
  destinationRaw: string;
  movementIntensityLabel: string | null;
  lodgingLevel: string | null;
  candidates: TemplateCandidateForPrompt[];
}): string {
  const candidateLines = input.candidates.map(
    (c) =>
      `- id: ${c.id}\n  name: ${c.name}\n  description: ${c.description?.trim() || '(없음)'}`,
  );

  return [
    '고객 상담 내용과 아래 일정 템플릿 후보 목록을 보고, 고객 요청에 가장 잘 맞는 템플릿 하나의 id를 고르거나, 어느 것도 맞지 않으면 null을 반환하라.',
    '반드시 후보에 나온 id 문자열을 그대로 사용하라. 임의의 id를 만들지 말 것.',
    '',
    '고객 원문:',
    '---',
    input.rawText.trim(),
    '---',
    '',
    `희망 여행지(추출): ${input.destinationRaw || '(없음)'}`,
    `이동 강도(추출): ${input.movementIntensityLabel ?? '(없음)'}`,
    `숙소 등급 힌트(추출): ${input.lodgingLevel ?? '(없음)'}`,
    '',
    '템플릿 후보:',
    candidateLines.join('\n'),
    '',
    'JSON만 반환: {"chosenId": "<후보 id>" | null, "reason": "한국어 1~2문장, 고객 요청과 템플릿명·설명을 근거로 선택 이유"}',
    'chosenId가 null이면 reason은 빈 문자열 "" 로 두어라.',
  ].join('\n');
}
