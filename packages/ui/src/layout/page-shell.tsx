import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../base/cn';

type PageShellProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function PageShell({ children, className, ...props }: PageShellProps): JSX.Element {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-6 py-6', className)} {...props}>
      {children}
    </div>
  );
}
