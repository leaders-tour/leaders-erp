import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from './cn';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>): JSX.Element {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <th className={cn('border-b p-2 text-left font-semibold text-slate-700', className)} {...props} />;
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={cn('border-b p-2 text-slate-900', className)} {...props} />;
}
