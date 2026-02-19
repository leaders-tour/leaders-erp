import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
        className,
      )}
      {...props}
    />
  );
}
