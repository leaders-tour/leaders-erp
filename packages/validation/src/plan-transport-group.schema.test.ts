import { describe, expect, it } from 'vitest';
import { planVersionTransportGroupInputSchema } from './plan.schema';

const baseGroup = {
  teamName: 'A팀',
  headcount: 8,
};

describe('planVersionTransportGroupInputSchema flight schedule', () => {
  it('accepts date-only IN/OUT', () => {
    const parsed = planVersionTransportGroupInputSchema.safeParse({
      ...baseGroup,
      flightInDate: '2026-07-15T00:00:00.000Z',
      flightOutDate: '2026-07-20T00:00:00.000Z',
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts complete date and time pairs', () => {
    const parsed = planVersionTransportGroupInputSchema.safeParse({
      ...baseGroup,
      flightInDate: '2026-07-15T00:00:00.000Z',
      flightInTime: '02:45',
      flightOutDate: '2026-07-20T00:00:00.000Z',
      flightOutTime: '18:15',
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts fully unspecified IN/OUT', () => {
    const parsed = planVersionTransportGroupInputSchema.safeParse(baseGroup);
    expect(parsed.success).toBe(true);
  });

  it('rejects time-only IN/OUT', () => {
    const inOnly = planVersionTransportGroupInputSchema.safeParse({
      ...baseGroup,
      flightInTime: '02:45',
    });
    const outOnly = planVersionTransportGroupInputSchema.safeParse({
      ...baseGroup,
      flightOutTime: '18:15',
    });

    expect(inOnly.success).toBe(false);
    expect(outOnly.success).toBe(false);
  });
});
