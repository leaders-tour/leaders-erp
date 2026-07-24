import type { UserRow } from './hooks';

export interface UserListSnapshot {
  count: number;
  latestCreatedAt: string | null;
}

export function buildUserListSnapshotFromUsers(users: Pick<UserRow, 'createdAt'>[]): UserListSnapshot {
  if (users.length === 0) {
    return { count: 0, latestCreatedAt: null };
  }

  let latestCreatedAt = users[0]?.createdAt ?? null;
  for (const user of users) {
    if (latestCreatedAt == null || user.createdAt > latestCreatedAt) {
      latestCreatedAt = user.createdAt;
    }
  }

  return {
    count: users.length,
    latestCreatedAt,
  };
}

export function areUserListSnapshotsEqual(
  left: UserListSnapshot | null | undefined,
  right: UserListSnapshot | null | undefined,
): boolean {
  if (left == null || right == null) {
    return false;
  }

  return left.count === right.count && left.latestCreatedAt === right.latestCreatedAt;
}

export function shouldRefreshUsersFromSnapshot(
  cachedUsers: Pick<UserRow, 'createdAt'>[],
  serverSnapshot: UserListSnapshot,
): boolean {
  if (cachedUsers.length === 0) {
    return serverSnapshot.count > 0;
  }

  const cachedSnapshot = buildUserListSnapshotFromUsers(cachedUsers);
  return !areUserListSnapshotsEqual(cachedSnapshot, serverSnapshot);
}
