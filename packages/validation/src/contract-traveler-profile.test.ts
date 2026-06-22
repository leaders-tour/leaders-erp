import { describe, expect, it } from 'vitest';
import {
  confirmationTravelerDisplayParts,
  contractTravelerProfileFieldsFromRawJson,
  contractTravelerProfileFromSubmission,
  formatConfirmationTravelerLine,
  normalizeConfirmationBirthCodeDisplay,
  parseContractTravelerProfile,
  shouldUpdateContractSubmissionTravelerProfile,
} from './contract-traveler-profile';

describe('parseContractTravelerProfile', () => {
  it('parses gender and birth code from rawJson headers', () => {
    const profile = parseContractTravelerProfile({
      '여행객 본인 성함': '정민우',
      성별: '남성',
      '생년월일(7자리)': '0601153',
      특이사항: '비건',
    });

    expect(profile).toEqual({
      gender: '남성',
      birthCode: '0601153',
      note: '비건',
    });
  });
});

describe('formatConfirmationTravelerLine', () => {
  it('formats traveler line for confirmation document', () => {
    expect(
      formatConfirmationTravelerLine({
        name: '정민우',
        gender: '남성',
        birthCode: '0601153',
      }),
    ).toBe('정민우 남성 060115');
  });

  it('does not include traveler note in confirmation line', () => {
    expect(
      formatConfirmationTravelerLine({
        name: '박승원',
        gender: '남성',
        birthCode: '19990717',
        note: '없음',
      }),
    ).toBe('박승원 남성 990717');
  });

  it('returns core profile only for stacked display', () => {
    expect(
      confirmationTravelerDisplayParts({
        name: '손하은',
        gender: '여성',
        birthCode: '970101',
        note: '식단 알러지(갑각류-새우, / 게 포함-, 복숭아 등)',
      }),
    ).toEqual({
      core: '손하은 여성 970101',
      note: null,
    });
  });
});

describe('normalizeConfirmationBirthCodeDisplay', () => {
  it('normalizes dotted yyyy and spaced dates to yymmdd', () => {
    expect(normalizeConfirmationBirthCodeDisplay('2003. 2. 4')).toBe('030204');
    expect(normalizeConfirmationBirthCodeDisplay('2003. 8. 7')).toBe('030807');
    expect(normalizeConfirmationBirthCodeDisplay('03.02.04')).toBe('030204');
  });

  it('normalizes mixed seven-digit team birth codes', () => {
    expect(normalizeConfirmationBirthCodeDisplay('2007101')).toBe('071001');
    expect(normalizeConfirmationBirthCodeDisplay('2007322')).toBe('070322');
    expect(normalizeConfirmationBirthCodeDisplay('2006511')).toBe('060511');
    expect(normalizeConfirmationBirthCodeDisplay('2007102')).toBe('071002');
    expect(normalizeConfirmationBirthCodeDisplay('2003121')).toBe('030121');
    expect(normalizeConfirmationBirthCodeDisplay('2006529')).toBe('060529');
  });
});

describe('contractTravelerProfileFromSubmission', () => {
  it('prefers stored columns over rawJson', () => {
    expect(
      contractTravelerProfileFromSubmission({
        travelerGender: '여성',
        travelerBirthCode: '9901012',
        rawJson: { 성별: '남성', '생년월일(7자리)': '0601153' },
      }),
    ).toEqual({
      gender: '여성',
      birthCode: '9901012',
      note: null,
    });
  });

  it('falls back to rawJson when stored columns are empty', () => {
    expect(
      contractTravelerProfileFromSubmission({
        rawJson: { 성별: '남성', '생년월일(7자리)': '0601153', 특이사항: '비건' },
      }),
    ).toEqual({
      gender: '남성',
      birthCode: '0601153',
      note: '비건',
    });
  });
});

describe('shouldUpdateContractSubmissionTravelerProfile', () => {
  it('returns true when parsed profile differs from current columns', () => {
    const parsed = contractTravelerProfileFieldsFromRawJson({
      성별: '남성',
      '생년월일(7자리)': '0601153',
    });
    expect(
      shouldUpdateContractSubmissionTravelerProfile(
        { travelerGender: null, travelerBirthCode: null, travelerNote: null },
        parsed,
      ),
    ).toBe(true);
  });
});
