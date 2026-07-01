import { describe, expect, it } from 'vitest';
import { resolveInitialValidUntilDateForNewVersion } from './resolve-initial-valid-until-date';

describe('resolveInitialValidUntilDateForNewVersion', () => {
  const parentCreatedAt = '2026-01-01T00:00:00.000Z';
  const parentValidUntilDate = '2026-01-15T00:00:00.000Z';

  it('keeps parent validUntil when less than one week has passed', () => {
    expect(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: parentCreatedAt,
        parentValidUntilDate,
        referenceDate: '2026-01-05',
      }),
    ).toBe('2026-01-15');
  });

  it('extends by 3 days after one completed week', () => {
    expect(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: parentCreatedAt,
        parentValidUntilDate,
        referenceDate: '2026-01-08',
      }),
    ).toBe('2026-01-18');
  });

  it('extends by 6 days after two completed weeks', () => {
    expect(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: parentCreatedAt,
        parentValidUntilDate,
        referenceDate: '2026-01-15',
      }),
    ).toBe('2026-01-21');
  });

  it('does not extend on day 6 after parent createdAt', () => {
    expect(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: parentCreatedAt,
        parentValidUntilDate,
        referenceDate: '2026-01-07',
      }),
    ).toBe('2026-01-15');
  });

  it('falls back to parent createdAt + 14 when validUntil is missing', () => {
    expect(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: parentCreatedAt,
        parentValidUntilDate: null,
        referenceDate: '2026-01-05',
      }),
    ).toBe('2026-01-15');
  });

  it('falls back to referenceDate + 14 when extension cannot reach today', () => {
    expect(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: '2026-04-01T00:00:00.000Z',
        parentValidUntilDate: '2026-04-15T00:00:00.000Z',
        referenceDate: '2026-07-01',
      }),
    ).toBe('2026-07-15');
  });

  it('falls back to referenceDate + 14 when extended date is still before today', () => {
    expect(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: '2026-04-01T00:00:00.000Z',
        parentValidUntilDate: '2026-04-15T00:00:00.000Z',
        referenceDate: '2026-05-01',
      }),
    ).toBe('2026-05-15');
  });
});
