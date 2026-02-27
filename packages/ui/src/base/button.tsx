import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type ButtonVariant = 'default' | 'primary' | 'outline' | 'destructive';

const variantMap: Record<ButtonVariant, string> = {
  default: 'border border-slate-900 bg-slate-900 text-white hover:bg-slate-700',
  primary: 'border border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-100',
  destructive: 'border border-red-600 bg-red-600 text-white hover:bg-red-500',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = 'default', ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variantMap[variant],
        className,
      )}
      {...props}
    />
  );
}
