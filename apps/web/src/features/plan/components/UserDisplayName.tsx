import { resolveUserDisplayName } from '../format-user-display-name';

type UserDisplayNameProps = {
  user: {
    name: string;
    nameDisambiguator?: string | null;
    displayName?: string | null;
  };
  className?: string;
  badgeClassName?: string;
};

export function UserDisplayName({
  user,
  className,
  badgeClassName,
}: UserDisplayNameProps): JSX.Element {
  const suffix = user.nameDisambiguator?.trim();

  if (!suffix) {
    return <span className={className}>{user.name}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`.trim()}>
      <span>{user.name.trim()}</span>
      <span
        className={
          badgeClassName ??
          'rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-600'
        }
        aria-label={`동명이인 구분 ${suffix}`}
      >
        {suffix}
      </span>
    </span>
  );
}

export function resolveUserDisplayNameText(user: UserDisplayNameProps['user']): string {
  return resolveUserDisplayName(user);
}
