interface RegionNameChipProps {
  name: string | null | undefined;
}

export function RegionNameChip({ name }: RegionNameChipProps): JSX.Element {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return (
    <span className="inline-flex max-w-full min-w-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      <span className="truncate">{trimmed}</span>
    </span>
  );
}
