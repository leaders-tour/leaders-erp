import { describe, expect, it } from 'vitest';
import {
  formatUserDisplayName,
  indexToNameDisambiguator,
  normalizeUserNameKey,
} from './format-user-display-name';

describe('normalizeUserNameKey', () => {
  it('trims and NFKC-normalizes', () => {
    expect(normalizeUserNameKey('  오동환  ')).toBe('오동환');
  });
});

describe('indexToNameDisambiguator', () => {
  it('maps indices to A,B,C,...,Z,AA', () => {
    expect(indexToNameDisambiguator(0)).toBe('A');
    expect(indexToNameDisambiguator(1)).toBe('B');
    expect(indexToNameDisambiguator(25)).toBe('Z');
    expect(indexToNameDisambiguator(26)).toBe('AA');
  });
});

describe('formatUserDisplayName', () => {
  it('returns name only when disambiguator is absent', () => {
    expect(formatUserDisplayName('오동환', null)).toBe('오동환');
    expect(formatUserDisplayName('오동환', '')).toBe('오동환');
  });

  it('appends disambiguator suffix', () => {
    expect(formatUserDisplayName('오동환', 'B')).toBe('오동환 B');
  });
});
