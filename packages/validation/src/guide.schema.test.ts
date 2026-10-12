import { describe, expect, it } from 'vitest';
import {
  guideLiveLocationFilterSchema,
  guideLocationFilterSchema,
  guidePlaceVisitSamplesFilterSchema,
  guidePlaceVisitsFilterSchema,
  leaderstepsActiveProjectsFilterSchema,
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
    expect(
      guideLiveLocationFilterSchema.safeParse({
        projectId: '5bd109e7-7bd3-4932-9fde-ee5b18942005',
        date: null,
      }).success,
    ).toBe(true);
  });

  it('rejects invalid date values', () => {
    expect(
      guideLiveLocationFilterSchema.safeParse({
        date: '2026-02-30',
      }).success,
    ).toBe(false);
  });
});

describe('leaderstepsActiveProjectsFilterSchema', () => {
  it('accepts all projects with a null date', () => {
    expect(leaderstepsActiveProjectsFilterSchema.safeParse({ date: null, all: true }).success).toBe(true);
  });
});

describe('guidePlaceVisitsFilterSchema', () => {
  it('accepts guide id with optional filters', () => {
    expect(
      guidePlaceVisitsFilterSchema.safeParse({
        guideId: '019f-guide-id',
        projectId: '5bd109e7-7bd3-4932-9fde-ee5b18942005',
        date: '2026-07-29',
      }).success,
    ).toBe(true);
  });

  it('accepts date-only or project-only filters without a person', () => {
    expect(guidePlaceVisitsFilterSchema.safeParse({ date: '2026-07-29' }).success).toBe(true);
    expect(
      guidePlaceVisitsFilterSchema.safeParse({
        projectId: '5bd109e7-7bd3-4932-9fde-ee5b18942005',
      }).success,
    ).toBe(true);
    expect(
      guidePlaceVisitsFilterSchema.safeParse({
        projectId: '5bd109e7-7bd3-4932-9fde-ee5b18942005',
        date: null,
      }).success,
    ).toBe(true);
  });

  it('requires at least a person, project, or date', () => {
    expect(guidePlaceVisitsFilterSchema.safeParse({}).success).toBe(false);
  });
});

describe('guidePlaceVisitSamplesFilterSchema', () => {
  it('accepts 1 to 200 project ids', () => {
    expect(
      guidePlaceVisitSamplesFilterSchema.safeParse({
        projectIds: ['5bd109e7-7bd3-4932-9fde-ee5b18942005'],
      }).success,
    ).toBe(true);
  });

  it('rejects an empty list or more than 200 ids', () => {
    expect(guidePlaceVisitSamplesFilterSchema.safeParse({ projectIds: [] }).success).toBe(false);
    expect(
      guidePlaceVisitSamplesFilterSchema.safeParse({
        projectIds: Array.from({ length: 201 }, (_, index) => {
          const suffix = String(index + 1).padStart(12, '0');
          return `5bd109e7-7bd3-4932-9fde-${suffix}`;
        }),
      }).success,
    ).toBe(false);
  });
});
