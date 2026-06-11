import { describe, expect, it } from 'vitest';
import {
  compareContractDocumentNumbersByDateDesc,
  contractDocumentDateSortKey,
  isContractDocumentNumberExpiredByDays,
  normalizeContractDocumentNumber,
  normalizeContractPersonName,
  normalizeContractPhoneDigits,
  parseContractDocumentDate,
} from './contract-submission';

describe('contract submission normalization', () => {
  it('normalizes document numbers across spacing, case, width, and dash variants', () => {
    expect(normalizeContractDocumentNumber(' ab － １２３ – x ')).toBe('AB-123-X');
  });

  it('normalizes phone numbers to digits only', () => {
    expect(normalizeContractPhoneDigits('010-１２３４ 5678')).toBe('01012345678');
  });

  it('normalizes person names by trimming and collapsing internal whitespace', () => {
    expect(normalizeContractPersonName('  홍   길 동  ')).toBe('홍 길 동');
  });

  it('extracts YYMMDD sort key from document numbers', () => {
    expect(contractDocumentDateSortKey('260815127')).toBe(260815);
    expect(contractDocumentDateSortKey('261231001')).toBe(261231);
  });

  it('sorts document numbers by embedded date descending', () => {
    expect(compareContractDocumentNumbersByDateDesc('260101001', '261231001')).toBeGreaterThan(0);
    expect(compareContractDocumentNumbersByDateDesc('261231001', '260101001')).toBeLessThan(0);
  });

  it('parses YYMMDD from document numbers into local dates', () => {
    const parsed = parseContractDocumentDate('260517456');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(4);
    expect(parsed?.getDate()).toBe(17);
    expect(parseContractDocumentDate('invalid')).toBeNull();
    expect(parseContractDocumentDate('261331001')).toBeNull();
  });

  it('treats document numbers older than seven days as expired', () => {
    const referenceDate = new Date(2026, 5, 11);

    expect(isContractDocumentNumberExpiredByDays('260517456', 7, referenceDate)).toBe(true);
    expect(isContractDocumentNumberExpiredByDays('260604001', 7, referenceDate)).toBe(false);
    expect(isContractDocumentNumberExpiredByDays('260603001', 7, referenceDate)).toBe(true);
    expect(isContractDocumentNumberExpiredByDays('invalid', 7, referenceDate)).toBe(false);
  });
});
