import { describe, expect, it } from 'vitest';
import {
  pickLatestPlanId,
  pickLatestVersionId,
  resolveSelectedPlanId,
  resolveSelectedVersionId,
  resolveVersionIdFromPlanSummary,
} from './customerWorkspaceSelection';

describe('customerWorkspaceSelection', () => {
  describe('resolveSelectedPlanId', () => {
    it('returns null when there are no plans', () => {
      expect(resolveSelectedPlanId([], 'plan-1')).toBeNull();
    });

    it('keeps current selection when it still exists', () => {
      expect(resolveSelectedPlanId(['plan-new', 'plan-old'], 'plan-old')).toBe('plan-old');
    });

    it('falls back to first plan (latest createdAt) when selection is missing', () => {
      expect(resolveSelectedPlanId(['plan-new', 'plan-old'], 'gone')).toBe('plan-new');
      expect(resolveSelectedPlanId(['plan-new', 'plan-old'], null)).toBe('plan-new');
    });
  });

  describe('resolveSelectedVersionId', () => {
    const versions = [
      { id: 'v1', versionNumber: 1 },
      { id: 'v3', versionNumber: 3 },
      { id: 'v2', versionNumber: 2 },
    ];

    it('returns null when there are no versions', () => {
      expect(resolveSelectedVersionId([], 'v1')).toBeNull();
    });

    it('keeps current selection when it still exists', () => {
      expect(resolveSelectedVersionId(versions, 'v2')).toBe('v2');
    });

    it('picks highest versionNumber when selection is missing', () => {
      expect(resolveSelectedVersionId(versions, null)).toBe('v3');
      expect(resolveSelectedVersionId(versions, 'gone')).toBe('v3');
    });
  });

  describe('pickLatest helpers', () => {
    it('pickLatestPlanId uses first id', () => {
      expect(pickLatestPlanId(['a', 'b'])).toBe('a');
      expect(pickLatestPlanId([])).toBeNull();
    });

    it('pickLatestVersionId uses max versionNumber', () => {
      expect(
        pickLatestVersionId([
          { id: 'v1', versionNumber: 1 },
          { id: 'v2', versionNumber: 2 },
        ]),
      ).toBe('v2');
    });
  });

  describe('resolveVersionIdFromPlanSummary', () => {
    it('prefers highest versionNumber from embedded versions', () => {
      expect(
        resolveVersionIdFromPlanSummary({
          currentVersionId: 'v1',
          versions: [
            { id: 'v1', versionNumber: 1 },
            { id: 'v3', versionNumber: 3 },
          ],
        }),
      ).toBe('v3');
    });

    it('falls back to currentVersionId when versions are missing', () => {
      expect(
        resolveVersionIdFromPlanSummary({
          currentVersionId: 'v-current',
          currentVersion: { id: 'v-current', versionNumber: 2 },
        }),
      ).toBe('v-current');
    });

    it('keeps current selection when still present in versions', () => {
      expect(
        resolveVersionIdFromPlanSummary(
          {
            currentVersionId: 'v3',
            versions: [
              { id: 'v1', versionNumber: 1 },
              { id: 'v3', versionNumber: 3 },
            ],
          },
          'v1',
        ),
      ).toBe('v1');
    });
  });
});
