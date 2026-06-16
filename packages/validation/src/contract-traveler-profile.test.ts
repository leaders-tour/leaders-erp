import { describe, expect, it } from 'vitest';
import {
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
    ).toBe('정민우 남성 06.01.15');
  });

  it('omits note when contract says there is none', () => {
    expect(
      formatConfirmationTravelerLine({
        name: '박승원',
        gender: '남성',
        birthCode: '19990717',
        note: '없음',
      }),
    ).toBe('박승원 남성 99.07.17');
  });
});

describe('normalizeConfirmationBirthCodeDisplay', () => {
  it('normalizes dotted yyyy and spaced dates to yy.mm.dd', () => {
    expect(normalizeConfirmationBirthCodeDisplay('2003. 2. 4')).toBe('03.02.04');
    expect(normalizeConfirmationBirthCodeDisplay('2003. 8. 7')).toBe('03.08.07');
    expect(normalizeConfirmationBirthCodeDisplay('03.02.04')).toBe('03.02.04');
  });

  it('normalizes mixed seven-digit team birth codes', () => {
    expect(normalizeConfirmationBirthCodeDisplay('2007101')).toBe('07.10.01');
    expect(normalizeConfirmationBirthCodeDisplay('2007322')).toBe('07.03.22');
    expect(normalizeConfirmationBirthCodeDisplay('2006511')).toBe('06.05.11');
    expect(normalizeConfirmationBirthCodeDisplay('2007102')).toBe('07.10.02');
    expect(normalizeConfirmationBirthCodeDisplay('2003121')).toBe('03.01.21');
    expect(normalizeConfirmationBirthCodeDisplay('2006529')).toBe('06.05.29');
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
