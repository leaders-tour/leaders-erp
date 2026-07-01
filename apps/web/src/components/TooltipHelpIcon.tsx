import type { ReactNode } from 'react';

function HoverTooltip({
  content,
  align = 'left',
  placement = 'below',
  children,
}: {
  content: string;
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
  children: ReactNode;
}): JSX.Element {
  return (
    <span className="group/tooltip relative inline-flex max-w-full">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 hidden w-64 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-normal leading-snug text-slate-600 shadow-lg group-hover/tooltip:block group-focus-within/tooltip:block ${
          placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
        } ${align === 'right' ? 'right-0' : 'left-0'}`}
      >
        {content}
      </span>
    </span>
  );
}

export function TooltipHelpIcon({
  content,
  align = 'left',
  placement = 'below',
  className,
  ariaLabel = '도움말',
}: {
  content: string;
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
  className?: string;
  ariaLabel?: string;
}): JSX.Element {
  return (
    <HoverTooltip content={content} align={align} placement={placement}>
      <span
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        className={`inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold leading-none text-slate-500 transition hover:border-slate-400 hover:text-slate-700 ${className ?? ''}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.stopPropagation();
          }
        }}
      >
        ?
      </span>
    </HoverTooltip>
  );
}
