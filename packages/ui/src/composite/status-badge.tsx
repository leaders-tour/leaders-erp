interface StatusBadgeProps {
  tone: 'auto' | 'override' | 'success' | 'warning';
  label: string;
}

const toneClassMap: Record<StatusBadgeProps['tone'], string> = {
  auto: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  override: 'border-amber-200 bg-amber-50 text-amber-800',
  success: 'border-blue-200 bg-blue-50 text-blue-700',
  warning: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function StatusBadge({ tone, label }: StatusBadgeProps): JSX.Element {
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneClassMap[tone]}`}>{label}</span>;
}
