import { describe, expect, it } from 'vitest';
import { planResolver } from './plan.resolver';
import { planTemplateResolver } from '../plan-template/plan-template.resolver';

describe('plan stop movement intensity resolver', () => {
  it('falls back to locationVersion.firstDayMovementIntensity for first-day location stops', () => {
    expect(
      planResolver.PlanStop.movementIntensity({
        locationVersion: {
          firstDayMovementIntensity: 'LEVEL_2',
        },
      }),
    ).toBe('LEVEL_2');
  });

  it('prefers segment/connection sources before locationVersion fallback', () => {
    expect(
      planResolver.PlanStop.movementIntensity({
        segmentVersion: {
          movementIntensity: 'LEVEL_4',
        },
        locationVersion: {
          firstDayMovementIntensity: 'LEVEL_2',
        },
      }),
    ).toBe('LEVEL_4');
  });
});

describe('plan template stop movement intensity resolver', () => {
  it('falls back to locationVersion.firstDayMovementIntensity for first-day location stops', () => {
    expect(
      planTemplateResolver.PlanTemplateStop.movementIntensity({
        locationVersion: {
          firstDayMovementIntensity: 'LEVEL_3',
        },
      }),
    ).toBe('LEVEL_3');
  });
});
