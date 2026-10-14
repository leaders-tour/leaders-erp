import { describe, expect, it } from 'vitest';
import { findVisitNeighbors, sliceLocationPath, visitPathWindowMs } from './visit-link-context';

describe('findVisitNeighbors', () => {
  const rows = [
    { id: 'a', projectId: 'p1', startedAt: '2026-08-01T01:00:00.000Z' },
    { id: 'b', projectId: 'p1', startedAt: '2026-08-01T03:00:00.000Z' },
    { id: 'c', projectId: 'p1', startedAt: '2026-08-01T05:00:00.000Z' },
    { id: 'other', projectId: 'p2', startedAt: '2026-08-01T04:00:00.000Z' },
  ];

  it('returns previous and next visits in the same project', () => {
    expect(findVisitNeighbors(rows, rows[1]!)).toEqual({ prev: rows[0], next: rows[2] });
  });

  it('omits neighbors from another project', () => {
    expect(findVisitNeighbors(rows, rows[3]!)).toEqual({ prev: null, next: null });
  });
});

describe('visitPathWindowMs', () => {
  it('uses previous start and next end when present', () => {
    const window = visitPathWindowMs({
      selectedStartedAt: '2026-08-01T03:00:00.000Z',
      selectedEndedAt: '2026-08-01T03:30:00.000Z',
      prevStartedAt: '2026-08-01T01:00:00.000Z',
      nextEndedAt: '2026-08-01T06:00:00.000Z',
    });
    expect(window.fromMs).toBe(new Date('2026-08-01T01:00:00.000Z').getTime());
    expect(window.toMs).toBe(new Date('2026-08-01T06:00:00.000Z').getTime());
  });
});

describe('sliceLocationPath', () => {
  it('keeps points inside the visit window', () => {
    const path = [
      { latitude: 1, longitude: 1, recordedAt: '2026-08-01T00:00:00.000Z' },
      { latitude: 2, longitude: 2, recordedAt: '2026-08-01T03:00:00.000Z' },
      { latitude: 3, longitude: 3, recordedAt: '2026-08-01T07:00:00.000Z' },
    ];
    expect(
      sliceLocationPath(path, new Date('2026-08-01T01:00:00.000Z').getTime(), new Date('2026-08-01T06:00:00.000Z').getTime()),
    ).toEqual([path[1]]);
  });
});
