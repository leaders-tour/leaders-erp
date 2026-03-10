export interface ExtractedContacts {
  email: string | null;
  phone: string | null;
  kakaoId: string | null;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g;
const PHONE_REGEX = /01[016789]-?\d{3,4}-?\d{4}/g;
const KAKAO_REGEX = /(?:카카오(?:톡)?|kakao)\s*(?:id|아이디)?\s*[:：]?\s*([A-Za-z0-9._-]{3,30})/i;

export function extractContacts(text: string): ExtractedContacts {
  const email = text.match(EMAIL_REGEX)?.[0]?.toLowerCase() ?? null;
  const phone = text.match(PHONE_REGEX)?.[0] ?? null;
  const kakaoId = text.match(KAKAO_REGEX)?.[1] ?? null;

  return {
    email,
    phone,
    kakaoId,
  };
}
