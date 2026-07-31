import { describe, expect, it } from 'vitest';
import {
  guideLiveLocationFilterSchema,
  guideLocationFilterSchema,
} from './guide.schema';

describe('guideLocationFilterSchema', () => {
  it('accepts a calendar date and optional guide id', () => {
    expect(
      guideLocationFilterSchema.safeParse({
        date: '2026-07-29',
        guideId: '019f-guide-id',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid dates and formats', () => {
    expect(guideLocationFilterSchema.safeParse({ date: '2026-02-30' }).success).toBe(false);
    expect(guideLocationFilterSchema.safeParse({ date: '07/29/2026' }).success).toBe(false);
  });
});

describe('guideLiveLocationFilterSchema', () => {
  it('accepts optional project and date filters', () => {
    expect(
      guideLiveLocationFilterSchema.safeParse({
        projectId: '5bd109e7-7bd3-4932-9fde-ee5b18942005',
        date: '2026-07-29',
      }).success,
    ).toBe(true);
    expect(guideLiveLocationFilterSchema.safeParse({}).success).toBe(true);
  });

  it('rejects invalid date values', () => {
    expect(
      guideLiveLocationFilterSchema.safeParse({
        date: '2026-02-30',
      }).success,
    ).toBe(false);
  });
});
