import type { TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from './cn';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>): JSX.Element {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <th className={cn('border-b border-slate-200 bg-slate-50 p-3 text-left font-semibold text-slate-700', className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={cn('border-b border-slate-200 p-3 text-slate-900', className)} {...props} />;
}
