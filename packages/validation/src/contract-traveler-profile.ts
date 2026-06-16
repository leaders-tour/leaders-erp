const GENDER_HEADER_CANDIDATES = [
  '성별',
  'gender',
  '여행객 성별',
  '본인 성별',
];

const BIRTH_HEADER_CANDIDATES = [
  '생년월일',
  '생년월일(7자리)',
  '생년월일 7자리',
  '주민등록번호',
  '주민등록번호(앞7자리)',
  '생년',
  'birth',
  'birthdate',
];

const NOTE_HEADER_CANDIDATES = [
  '특이사항',
  '여행객 특이사항',
  '비고',
  'note',
  'remarks',
];

export interface ContractTravelerProfile {
  gender: string | null;
  birthCode: string | null;
  note: string | null;
}

function normalizeHeader(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function pickRawJsonValue(rawJson: Record<string, string>, candidates: string[]): string | null {
  const entries = Object.entries(rawJson);
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const match = entries.find(([header]) => {
      const normalizedHeader = normalizeHeader(header);
      return (
        normalizedHeader === normalizedCandidate
        || normalizedHeader.includes(normalizedCandidate)
        || normalizedCandidate.includes(normalizedHeader)
      );
    });
    if (!match) {
      continue;
    }
    const value = match[1]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function normalizeBirthCode(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 7) {
    return digits.slice(0, 7);
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function parseContractTravelerProfile(rawJson: Record<string, string>): ContractTravelerProfile {
  return {
    gender: pickRawJsonValue(rawJson, GENDER_HEADER_CANDIDATES),
    birthCode: normalizeBirthCode(pickRawJsonValue(rawJson, BIRTH_HEADER_CANDIDATES)),
    note: pickRawJsonValue(rawJson, NOTE_HEADER_CANDIDATES),
  };
}

export function rawJsonAsStringRecord(rawJson: unknown): Record<string, string> {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawJson)) {
    if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
}

export interface ContractSubmissionTravelerProfileFields {
  travelerGender: string | null;
  travelerBirthCode: string | null;
  travelerNote: string | null;
}

export function contractTravelerProfileFieldsFromRawJson(
  rawJson: Record<string, string>,
): ContractSubmissionTravelerProfileFields {
  const profile = parseContractTravelerProfile(rawJson);
  return {
    travelerGender: profile.gender,
    travelerBirthCode: profile.birthCode,
    travelerNote: profile.note,
  };
}

export function contractTravelerProfileFromSubmission(input: {
  travelerGender?: string | null;
  travelerBirthCode?: string | null;
  travelerNote?: string | null;
  rawJson?: unknown;
}): ContractTravelerProfile {
  const gender = input.travelerGender?.trim() || null;
  const birthCode = input.travelerBirthCode?.trim() || null;
  const note = input.travelerNote?.trim() || null;
  if (gender || birthCode || note) {
    return { gender, birthCode, note };
  }
  return parseContractTravelerProfile(rawJsonAsStringRecord(input.rawJson));
}

export function shouldUpdateContractSubmissionTravelerProfile(
  current: ContractSubmissionTravelerProfileFields,
  parsed: ContractSubmissionTravelerProfileFields,
): boolean {
  if (!parsed.travelerGender && !parsed.travelerBirthCode && !parsed.travelerNote) {
    return false;
  }
  return (
    parsed.travelerGender !== current.travelerGender
    || parsed.travelerBirthCode !== current.travelerBirthCode
    || parsed.travelerNote !== current.travelerNote
  );
}

function shouldDisplayTravelerNote(note: string): boolean {
  const normalized = note.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  const hidden = new Set(['-', '없음', '해당없음', '해당 없음', 'none', 'n/a', 'na']);
  return !hidden.has(normalized);
}

export function formatConfirmationTravelerLine(input: {
  name: string;
  gender?: string | null;
  birthCode?: string | null;
  note?: string | null;
}): string {
  const name = input.name.trim();
  if (!name) {
    return '';
  }
  const parts = [name];
  if (input.gender?.trim()) {
    parts.push(input.gender.trim());
  }
  if (input.birthCode?.trim()) {
    parts.push(input.birthCode.trim());
  }
  if (input.note?.trim() && shouldDisplayTravelerNote(input.note)) {
    parts.push(input.note.trim());
  }
  return parts.join(' ');
}
