import type { PropsWithChildren } from 'react';

export function PageShell({ children }: PropsWithChildren): JSX.Element {
  return <div className="mx-auto w-full max-w-7xl px-6 py-6">{children}</div>;
}
