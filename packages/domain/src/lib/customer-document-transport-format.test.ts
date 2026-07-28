import { describe, expect, it } from 'vitest';
import { formatFlightDisplay, formatTransportFlightLines } from './customer-document-transport-format';

describe('formatFlightDisplay', () => {
  it('shows date-only flights as time pending', () => {
    expect(formatFlightDisplay('2026-07-15', null)).toBe('7월 15일 · 시간 미정');
  });

  it('shows complete flights with date and time', () => {
    expect(formatFlightDisplay('2026-07-15', '02:45')).toBe('07/15 - 02:45');
  });

  it('returns dash when date is missing', () => {
    expect(formatFlightDisplay(null, '02:45')).toBe('-');
  });
});

describe('formatTransportFlightLines', () => {
  it('renders date-only flights without collapsing to unspecified', () => {
    const lines = formatTransportFlightLines(
      [
        {
          teamName: 'A팀',
          headcount: 8,
          flightInDate: '2026-07-15',
          flightInTime: null,
          flightOutDate: null,
          flightOutTime: null,
        },
      ],
      'IN',
    );

    expect(lines).toBe('7월 15일 · 시간 미정');
  });
});
