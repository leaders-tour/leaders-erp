import { describe, expect, it } from 'vitest';
import { guideLocationFilterSchema } from './guide.schema';

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
