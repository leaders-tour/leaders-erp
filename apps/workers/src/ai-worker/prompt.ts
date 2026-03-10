import type { CafeLeadNeedsInput } from '@tour/validation';

export const NEEDS_PROMPT_VERSION = 'needs-v1';
export const DRAFT_PROMPT_VERSION = 'draft-v1';
export const DEFAULT_MODEL_NAME = 'gpt-4.1-mini';

const COMPANY_INTRO = [
  '우리는 몽골 자유여행과 맞춤 견적을 운영하는 여행사다.',
  '회신 목적은 게시글 내용을 토대로 정확한 추가 정보를 받고, 맞춤 견적 상담을 이어가는 것이다.',
].join(' ');

const FORBIDDEN_RULES = [
  '가격을 단정하지 말 것',
  '과장 표현을 쓰지 말 것',
  '게시글에 없는 정보를 지어내지 말 것',
  '한국어로 작성할 것',
].join(', ');

const TONE_GUIDE = '정중하고 실무적인 톤으로, 상대 요구사항을 정확히 반영하되 부담스럽지 않게 작성한다.';

export function buildNeedsPrompt(input: { title: string; body: string; metadata: string }): string {
  return [
    '아래 네이버 카페 게시글을 읽고 여행 요구사항을 JSON으로만 반환하라.',
    '날짜가 불명확하면 null로 두고, travelerType은 family/couple/friends/solo/unknown 중 하나만 사용하라.',
    'leadScore는 0~100 정수로 계산하라.',
    `제목: ${input.title}`,
    `본문: ${input.body}`,
    `메타데이터: ${input.metadata}`,
    '반환 JSON 필드: departureDate, returnDate, durationNights, durationDays, travelerCount, travelerType, destinations, budget, interests, specialRequests, urgency, leadScore',
  ].join('\n');
}

export function buildDraftPrompt(input: {
  title: string;
  body: string;
  needs: CafeLeadNeedsInput;
  contactEmail: string | null;
  contactPhone: string | null;
}): string {
  return [
    '아래 네이버 카페 여행 문의 글에 답장하는 영업 메일 초안을 JSON으로만 반환하라.',
    `회사 소개: ${COMPANY_INTRO}`,
    `금지 표현: ${FORBIDDEN_RULES}`,
    `톤 가이드: ${TONE_GUIDE}`,
    `제목: ${input.title}`,
    `본문: ${input.body}`,
    `구조화된 요구사항: ${JSON.stringify(input.needs)}`,
    `추출 연락처: ${JSON.stringify({ email: input.contactEmail, phone: input.contactPhone })}`,
    'JSON 필드: subject, previewText, bodyText, bodyHtml, qualityScore',
    'bodyText는 한국어 400~700자로 쓰고 마지막에 질문 2개를 포함하라.',
    'bodyHtml은 bodyText와 의미가 동일한 HTML로 반환하라.',
  ].join('\n');
}
