import { formatUserDisplayName } from '@tour/domain';

type UserDisplayNameSource = {
  name: string;
  nameDisambiguator?: string | null;
  displayName?: string | null;
};

export function resolveUserDisplayName(user: UserDisplayNameSource): string {
  const fromGraphql = user.displayName?.trim();
  if (fromGraphql) {
    return fromGraphql;
  }
  return formatUserDisplayName(user.name, user.nameDisambiguator);
}

export function userDisplayNameMatchesKeyword(
  user: UserDisplayNameSource,
  keyword: string,
): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return false;
  }

  if (user.name.trim().toLowerCase().includes(normalizedKeyword)) {
    return true;
  }

  const displayName = resolveUserDisplayName(user).toLowerCase();
  if (displayName.includes(normalizedKeyword)) {
    return true;
  }

  const suffix = user.nameDisambiguator?.trim().toLowerCase();
  if (suffix && `${user.name.trim().toLowerCase()} ${suffix}`.includes(normalizedKeyword)) {
    return true;
  }

  return false;
}
