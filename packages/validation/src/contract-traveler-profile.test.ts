import { describe, expect, it } from 'vitest';
import { formatConfirmationTravelerLine, parseContractTravelerProfile } from './contract-traveler-profile';

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
    ).toBe('정민우 남성 0601153');
  });
});
