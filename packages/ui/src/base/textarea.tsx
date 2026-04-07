import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'min-h-[4.5rem] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-normal text-slate-900',
        'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
        className,
      )}
      {...props}
    />
  );
});
