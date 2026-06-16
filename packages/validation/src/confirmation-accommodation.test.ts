import { describe, expect, it } from 'vitest';
import {
  formatConfirmationAccommodationLine,
  normalizeConfirmationAccommodationLine,
  resolveConfirmationAccommodationName,
} from './confirmation-accommodation';

describe('resolveConfirmationAccommodationName', () => {
  it('prefers linked accommodation name over snapshot text', () => {
    expect(
      resolveConfirmationAccommodationName('khangai Resort - 창문 있는 게르×1', 'Khangai Resort'),
    ).toBe('Khangai Resort');
  });

  it('strips option summary suffix from snapshot text', () => {
    expect(
      resolveConfirmationAccommodationName('Toyoko Inn Ulaanbaatar - 호텔×3'),
    ).toBe('Toyoko Inn Ulaanbaatar');
  });
});

describe('normalizeConfirmationAccommodationLine', () => {
  it('cleans legacy snapshot suffix before capacity label', () => {
    expect(
      normalizeConfirmationAccommodationLine(
        'khangai Resort - 창문 있는 게르×1, 창문 있는 게르×1 3인실 1개',
      ),
    ).toBe('khangai Resort 3인실 1개');
  });
});

describe('formatConfirmationAccommodationLine', () => {
  it('formats accommodation as name, capacity room, and room count', () => {
    expect(
      formatConfirmationAccommodationLine({
        name: 'Govi urguu camp',
        roomCount: 2,
        capacity: 3,
      }),
    ).toBe('Govi urguu camp 3인실 2개');
  });

  it('derives capacity label from room type when capacity is missing', () => {
    expect(
      formatConfirmationAccommodationLine({
        name: 'Bright govi',
        roomCount: 2,
        roomType: '3인실',
      }),
    ).toBe('Bright govi 3인실 2개');
  });

  it('falls back to room count only when capacity is unknown', () => {
    expect(
      formatConfirmationAccommodationLine({
        name: 'Guest house',
        roomCount: 1,
        roomType: 'Standard',
      }),
    ).toBe('Guest house 1개');
  });
});
