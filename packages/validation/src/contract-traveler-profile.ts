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

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatBirthDateYyMmDd(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${pad2(year % 100)}.${pad2(month)}.${pad2(day)}`;
}

function inferFullYearFromTwoDigits(yy: number): number {
  return yy >= 30 ? 1900 + yy : 2000 + yy;
}

function parseDottedBirthDate(raw: string): { year: number; month: number; day: number } | null {
  const match = raw.match(/^(\d{2,4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }
  const yearPart = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const year = yearPart < 100 ? inferFullYearFromTwoDigits(yearPart) : yearPart;
  return formatBirthDateYyMmDd(year, month, day) ? { year, month, day } : null;
}

function parseResidentRegistrationSevenDigits(digits: string): { year: number; month: number; day: number } | null {
  const yy = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10);
  const day = parseInt(digits.slice(4, 6), 10);
  const year = inferFullYearFromTwoDigits(yy);
  return formatBirthDateYyMmDd(year, month, day) ? { year, month, day } : null;
}

function parseYearPrefixedSevenDigits(digits: string): { year: number; month: number; day: number } | null {
  const year = parseInt(digits.slice(0, 4), 10);
  if (year < 1900 || year > 2099) {
    return null;
  }
  const tail = digits.slice(4);
  if (tail.length !== 3) {
    return null;
  }

  const monthFromOneDigit = parseInt(tail.slice(0, 1), 10);
  const dayFromTwoDigits = parseInt(tail.slice(1, 3), 10);
  const monthFromTwoDigits = parseInt(tail.slice(0, 2), 10);
  const dayFromOneDigit = parseInt(tail.slice(2, 3), 10);

  const monthDayFromSplit =
    monthFromOneDigit >= 1
    && monthFromOneDigit <= 12
    && dayFromTwoDigits >= 1
    && dayFromTwoDigits <= 31
      ? { year, month: monthFromOneDigit, day: dayFromTwoDigits }
      : null;
  const monthDayFromCompact =
    monthFromTwoDigits >= 1
    && monthFromTwoDigits <= 12
    && dayFromOneDigit >= 1
    && dayFromOneDigit <= 9
      ? { year, month: monthFromTwoDigits, day: dayFromOneDigit }
      : null;

  if (monthDayFromSplit && dayFromTwoDigits >= 13) {
    return monthDayFromSplit;
  }
  if (monthDayFromCompact) {
    return monthDayFromCompact;
  }
  if (monthDayFromSplit) {
    return monthDayFromSplit;
  }
  return null;
}

export function normalizeConfirmationBirthCodeDisplay(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  const dotted = parseDottedBirthDate(raw);
  if (dotted) {
    return formatBirthDateYyMmDd(dotted.year, dotted.month, dotted.day);
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return raw;
  }

  if (digits.length === 8) {
    const year = parseInt(digits.slice(0, 4), 10);
    const month = parseInt(digits.slice(4, 6), 10);
    const day = parseInt(digits.slice(6, 8), 10);
    return formatBirthDateYyMmDd(year, month, day);
  }

  if (digits.length === 6) {
    const yy = parseInt(digits.slice(0, 2), 10);
    const month = parseInt(digits.slice(2, 4), 10);
    const day = parseInt(digits.slice(4, 6), 10);
    return formatBirthDateYyMmDd(inferFullYearFromTwoDigits(yy), month, day);
  }

  if (digits.length === 7) {
    const yearPrefix = parseInt(digits.slice(0, 4), 10);
    if (yearPrefix >= 1900 && yearPrefix <= 2099) {
      const parsed = parseYearPrefixedSevenDigits(digits);
      if (parsed) {
        return formatBirthDateYyMmDd(parsed.year, parsed.month, parsed.day);
      }
    }
    const parsed = parseResidentRegistrationSevenDigits(digits);
    if (parsed) {
      return formatBirthDateYyMmDd(parsed.year, parsed.month, parsed.day);
    }
  }

  return raw;
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
  const birthCode = normalizeConfirmationBirthCodeDisplay(input.birthCode);
  if (birthCode) {
    parts.push(birthCode);
  }
  if (input.note?.trim() && shouldDisplayTravelerNote(input.note)) {
    parts.push(input.note.trim());
  }
  return parts.join(' ');
}
