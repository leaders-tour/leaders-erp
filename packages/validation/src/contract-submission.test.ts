import { describe, expect, it } from 'vitest';
import {
  compareContractDocumentNumbersByDateDesc,
  contractDocumentDateSortKey,
  normalizeContractDocumentNumber,
  normalizeContractPersonName,
  normalizeContractPhoneDigits,
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
});
