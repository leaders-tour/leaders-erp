import {
  contractTravelerProfileFromSubmission,
  rawJsonAsStringRecord,
  type ContractTravelerProfile,
} from './contract-traveler-profile';

export type ContractSubmissionAttentionKind =
  | 'special_note'
  | 'consultation'
  | 'declined_consent'
  | 'activity_opt_out'
  | 'incomplete';

export type ContractSubmissionAttentionSeverity = 'high' | 'medium';

export interface ContractSubmissionAttentionItem {
  kind: ContractSubmissionAttentionKind;
  severity: ContractSubmissionAttentionSeverity;
  label: string;
  detail: string;
  sourceHeader: string;
}

export interface ContractSubmissionFormItem {
  label: string;
  value: string;
}

export interface ContractSubmissionReviewSummary {
  travelerProfile: ContractTravelerProfile;
  attentionItems: ContractSubmissionAttentionItem[];
  formResponses: ContractSubmissionFormItem[];
  hasAttentionItems: boolean;
}

export const SPECIAL_NOTE_HEADER = '리더스투어가 반드시 알아야 할 특이사항';
export const CONSULTATION_HEADER = '상담이 필요한 내용';
export const FINAL_CONSENT_HEADER = '본인은 제22조를 포함한 본 계약 전체에 최종 동의합니다.';

const MARKETING_OPT_OUT_HEADERS = [
  '이메일 광고성 정보 수신 동의',
  '문자(SMS/LMS) 및 카카오톡 채널 광고성 정보 수신 동의',
];

const EXCLUDED_FORM_RESPONSE_HEADER_PATTERNS = [
  /^column_\d+$/i,
  /^77열$/,
  /문서번호/,
  /타임스탬프|timestamp|제출일시/i,
  /여행객.*성명|여행객.*성함|본인 성함|traveler name/i,
  /최종 확인용 성명/,
  /연락처|전화|휴대폰|phone/i,
  /이메일/i,
  /대표자/,
  /여행자 구분|대표자 여부|대표자구분/,
  /견적서상 기준인원$|^총 동행|^총동행|^총 인원|^인원$/i,
  /서류.?수신/,
  /^성별$|^gender$/i,
  /생년월일|주민등록|birth/i,
  /여권/,
  /주소/,
  /비상연락/,
  /법정대리인/,
  /계약자 연령/,
  /증빙서류/,
  /현금영수증 발급번호/,
  /알게 된 경로|선택한 이유|개선 의견|단점/,
];

const TRIVIAL_NOTE_VALUES = new Set([
  '없음',
  '없습니다',
  '없음.',
  '없습니다.',
  '해당없음',
  '해당 없음',
  '특이사항 없음',
  '특이사항없음',
  '없음!',
  '없음 !',
]);

const ACTIVITY_OPT_OUT_MARKERS = [
  /액티비티\s*체험\s*생략/i,
  /액티비티.*생략/i,
  /희망하지\s*않/i,
  /원치\s*아니/i,
  /감수하지\s*아니/i,
  /참여하지\s*않/i,
];

const NEGATIVE_VALUE_MARKERS = [
  /동의하지\s*아니/i,
  /동의하지\s*않/i,
  /미\s*동의/i,
  /거절될\s*수\s*있습니다/i,
];

function normalizeHeader(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNoteValue(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function isTrivialNote(value: string | null | undefined): boolean {
  const normalized = normalizeNoteValue(value ?? '');
  if (!normalized) {
    return true;
  }
  if (TRIVIAL_NOTE_VALUES.has(normalized)) {
    return true;
  }
  if (/^(없|특이사항?\s*없)/i.test(normalized) && normalized.length <= 12) {
    return true;
  }
  if (/말고\s*없음$/i.test(normalized) || /외\s*없음$/i.test(normalized)) {
    return true;
  }
  return false;
}

function isMarketingOptOutHeader(header: string): boolean {
  const normalized = normalizeHeader(header);
  return MARKETING_OPT_OUT_HEADERS.some((candidate) => normalizeHeader(candidate) === normalized);
}

function isExcludedFormResponseHeader(header: string): boolean {
  const trimmed = header.trim();
  if (!trimmed) {
    return true;
  }
  return EXCLUDED_FORM_RESPONSE_HEADER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isActivityOptOutValue(value: string): boolean {
  return ACTIVITY_OPT_OUT_MARKERS.some((pattern) => pattern.test(value));
}

function hasNegativeConsentMarker(value: string): boolean {
  return NEGATIVE_VALUE_MARKERS.some((pattern) => pattern.test(value));
}

function isAffirmativeOnly(value: string): boolean {
  const normalized = normalizeNoteValue(value);
  if (!normalized) {
    return false;
  }
  if (hasNegativeConsentMarker(normalized) || isActivityOptOutValue(normalized)) {
    return false;
  }
  return /^(동의함|확인함|확인완료|동의합니다\.?|확인하였고\s*동의함|인지하였음|액티비티\s*참여\s*예정|모집완료|모집중|계좌이체|원화현금|기명\s*이동수단)/i.test(normalized)
    || (/동의|확인|인지|참여\s*예정/.test(normalized) && !hasNegativeConsentMarker(normalized));
}

function attentionLabelFromHeader(header: string): string {
  const articleMatch = header.match(/제\s*\d+\s*조/);
  if (articleMatch) {
    return articleMatch[0].replace(/\s+/g, ' ');
  }
  if (header.includes('특이사항')) {
    return '특이사항';
  }
  if (header.includes('상담')) {
    return '상담 필요';
  }
  if (header.length <= 48) {
    return header;
  }
  return `${header.slice(0, 45).trim()}…`;
}

function pickRawJsonValue(rawJson: Record<string, string>, header: string): string | null {
  if (header in rawJson) {
    const value = rawJson[header]?.trim();
    return value || null;
  }
  const normalizedTarget = normalizeHeader(header);
  for (const [key, value] of Object.entries(rawJson)) {
    if (normalizeHeader(key) === normalizedTarget) {
      const trimmed = value?.trim();
      return trimmed || null;
    }
  }
  return null;
}

export function extractContractFormResponses(rawJson: Record<string, string>): ContractSubmissionFormItem[] {
  const items: ContractSubmissionFormItem[] = [];
  for (const [header, value] of Object.entries(rawJson)) {
    const trimmedValue = value?.trim();
    if (!trimmedValue || isExcludedFormResponseHeader(header)) {
      continue;
    }
    items.push({ label: header.trim(), value: trimmedValue });
  }
  return items;
}

function pushUniqueAttention(
  items: ContractSubmissionAttentionItem[],
  seen: Set<string>,
  item: ContractSubmissionAttentionItem,
): void {
  const key = `${item.kind}:${item.sourceHeader}:${item.detail}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  items.push(item);
}

export function analyzeContractSubmissionReview(input: {
  rawJson?: unknown;
  travelerGender?: string | null;
  travelerBirthCode?: string | null;
  travelerNote?: string | null;
}): ContractSubmissionReviewSummary {
  const rawJson = rawJsonAsStringRecord(input.rawJson);
  const travelerProfile = contractTravelerProfileFromSubmission({
    travelerGender: input.travelerGender,
    travelerBirthCode: input.travelerBirthCode,
    travelerNote: input.travelerNote,
    rawJson,
  });
  const formResponses = extractContractFormResponses(rawJson);
  const attentionItems: ContractSubmissionAttentionItem[] = [];
  const seen = new Set<string>();

  const specialNoteFromRaw = pickRawJsonValue(rawJson, SPECIAL_NOTE_HEADER);
  const specialNotes = [specialNoteFromRaw, travelerProfile.note]
    .filter((value): value is string => Boolean(value?.trim()) && !isTrivialNote(value));

  for (const detail of [...new Set(specialNotes)]) {
    pushUniqueAttention(attentionItems, seen, {
      kind: 'special_note',
      severity: 'high',
      label: '특이사항',
      detail,
      sourceHeader: SPECIAL_NOTE_HEADER,
    });
  }

  const consultation = pickRawJsonValue(rawJson, CONSULTATION_HEADER);
  if (consultation && !isTrivialNote(consultation)) {
    pushUniqueAttention(attentionItems, seen, {
      kind: 'consultation',
      severity: 'high',
      label: '상담 필요',
      detail: consultation,
      sourceHeader: CONSULTATION_HEADER,
    });
  }

  for (const { label, value } of formResponses) {
    if (label === SPECIAL_NOTE_HEADER || label === CONSULTATION_HEADER) {
      continue;
    }
    if (isMarketingOptOutHeader(label)) {
      continue;
    }

    if (isActivityOptOutValue(value)) {
      pushUniqueAttention(attentionItems, seen, {
        kind: 'activity_opt_out',
        severity: 'high',
        label: attentionLabelFromHeader(label),
        detail: value,
        sourceHeader: label,
      });
      continue;
    }

    if (hasNegativeConsentMarker(value) && !isAffirmativeOnly(value)) {
      pushUniqueAttention(attentionItems, seen, {
        kind: 'declined_consent',
        severity: 'high',
        label: attentionLabelFromHeader(label),
        detail: value,
        sourceHeader: label,
      });
    }
  }

  const travelerName = pickRawJsonValue(rawJson, '여행객 한글 성명')
    ?? pickRawJsonValue(rawJson, '여행객 본인 성함');
  const finalConsent = pickRawJsonValue(rawJson, FINAL_CONSENT_HEADER);
  const hasSubmissionContent = formResponses.length > 0 || Boolean(travelerName);
  if (hasSubmissionContent && travelerName && !finalConsent) {
    pushUniqueAttention(attentionItems, seen, {
      kind: 'incomplete',
      severity: 'medium',
      label: '최종 동의 미완료',
      detail: '제22조 최종 동의 항목이 비어 있습니다.',
      sourceHeader: FINAL_CONSENT_HEADER,
    });
  }

  return {
    travelerProfile,
    attentionItems,
    formResponses,
    hasAttentionItems: attentionItems.length > 0,
  };
}
