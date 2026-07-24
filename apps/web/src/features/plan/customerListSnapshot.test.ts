import { describe, expect, it } from 'vitest';
import {
  areUserListSnapshotsEqual,
  buildUserListSnapshotFromUsers,
  shouldRefreshUsersFromSnapshot,
} from './customerListSnapshot';

function buildUser(createdAt: string) {
  return { createdAt };
}

describe('customerListSnapshot', () => {
  it('builds snapshot from cached users', () => {
    expect(buildUserListSnapshotFromUsers([])).toEqual({ count: 0, latestCreatedAt: null });
    expect(
      buildUserListSnapshotFromUsers([
        buildUser('2026-01-01T00:00:00.000Z'),
        buildUser('2026-03-01T00:00:00.000Z'),
        buildUser('2026-02-01T00:00:00.000Z'),
      ]),
    ).toEqual({
      count: 3,
      latestCreatedAt: '2026-03-01T00:00:00.000Z',
    });
  });

  it('compares snapshots including latestCreatedAt changes with same count', () => {
    const left = { count: 2, latestCreatedAt: '2026-02-01T00:00:00.000Z' };
    const right = { count: 2, latestCreatedAt: '2026-03-01T00:00:00.000Z' };

    expect(areUserListSnapshotsEqual(left, left)).toBe(true);
    expect(areUserListSnapshotsEqual(left, right)).toBe(false);
  });

  it('decides refresh when server snapshot differs', () => {
    const cachedUsers = [buildUser('2026-01-01T00:00:00.000Z')];

    expect(
      shouldRefreshUsersFromSnapshot(cachedUsers, {
        count: 1,
        latestCreatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe(false);

    expect(
      shouldRefreshUsersFromSnapshot(cachedUsers, {
        count: 2,
        latestCreatedAt: '2026-02-01T00:00:00.000Z',
      }),
    ).toBe(true);

    expect(
      shouldRefreshUsersFromSnapshot(cachedUsers, {
        count: 1,
        latestCreatedAt: '2026-02-01T00:00:00.000Z',
      }),
    ).toBe(true);

    expect(
      shouldRefreshUsersFromSnapshot([], {
        count: 0,
        latestCreatedAt: null,
      }),
    ).toBe(false);

    expect(
      shouldRefreshUsersFromSnapshot([], {
        count: 1,
        latestCreatedAt: '2026-02-01T00:00:00.000Z',
      }),
    ).toBe(true);
  });
});
