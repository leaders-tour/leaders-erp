import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { datasetTheme } from './theme';

interface DatasetPageHeaderProps {
  breadcrumb: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function DatasetPageShell({ children }: { children: ReactNode }): JSX.Element {
  return <div className={`-mx-4 -my-4 min-h-[calc(100vh-2rem)] px-4 py-5 md:-mx-6 md:px-6 ${datasetTheme.pageBg}`}>{children}</div>;
}

export function DatasetPageHeader({ breadcrumb, title, description, actions }: DatasetPageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-[#8B83B8]">{breadcrumb}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

interface DatasetTabItem {
  id: string;
  label: string;
}

interface DatasetTabsProps {
  items: DatasetTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  size?: 'md' | 'sm';
}

export function DatasetTabs({ items, activeId, onChange, size = 'md' }: DatasetTabsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`transition-colors ${size === 'sm' ? 'rounded-lg px-2.5 py-1 text-xs' : 'rounded-xl px-3.5 py-1.5 text-sm'} font-medium ${
              active ? datasetTheme.tabActive : datasetTheme.tabInactive
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

interface DatasetFilterBarProps {
  children: ReactNode;
}

export function DatasetFilterBar({ children }: DatasetFilterBarProps): JSX.Element {
  return <div className={`grid gap-3 p-4 ${datasetTheme.card}`}>{children}</div>;
}

interface DatasetSelectionBarProps {
  count: number;
  onClear: () => void;
  actions?: ReactNode;
}

export function DatasetSelectionBar({ count, onClear, actions }: DatasetSelectionBarProps): JSX.Element | null {
  if (count === 0) return null;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${datasetTheme.selectionBar}`}>
      <div className={`flex items-center gap-3 text-sm ${datasetTheme.selectionText}`}>
        <span className="font-semibold">{count}개 선택됨</span>
        <button type="button" className="underline-offset-2 hover:underline" onClick={onClear}>
          선택 해제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

type DatasetButtonVariant = 'primary' | 'outline' | 'ghost' | 'soft';

export function DatasetButton({
  variant = 'outline',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: DatasetButtonVariant }): JSX.Element {
  const variantClass =
    variant === 'primary'
      ? datasetTheme.primary
      : variant === 'soft'
        ? `${datasetTheme.primarySoft} border border-transparent hover:bg-[#5B4BD6]/15`
        : variant === 'ghost'
          ? 'border border-transparent bg-transparent text-slate-600 hover:bg-[#F3F0FF] hover:text-[#5B4BD6]'
          : datasetTheme.outline;

  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`}
      {...props}
    />
  );
}

export function StubButton({
  label,
  variant = 'outline',
  onStub,
}: {
  label: string;
  variant?: DatasetButtonVariant;
  onStub: () => void;
}): JSX.Element {
  return (
    <DatasetButton type="button" variant={variant} onClick={onStub}>
      {label}
    </DatasetButton>
  );
}

export function DatasetCard({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={`overflow-hidden ${datasetTheme.card} ${className}`}>{children}</div>;
}

export function DatasetField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-500">
      {label}
      {children}
    </label>
  );
}

export const datasetControlClass = `h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 ${datasetTheme.focusRing}`;
