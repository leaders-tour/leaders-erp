interface RecruitmentStatusToggleProps {
  open: boolean;
  disabled?: boolean;
  saving?: boolean;
  onToggle: (nextOpen: boolean) => Promise<void> | void;
}

export function RecruitmentStatusToggle({
  open,
  disabled = false,
  saving = false,
  onToggle,
}: RecruitmentStatusToggleProps) {
  const isDisabled = disabled || saving;
  const label = open ? '모집중' : '마감';

  return (
    <button
      type="button"
      aria-pressed={open}
      aria-label={`모집 상태 ${open ? '마감으로 변경' : '모집중으로 변경'}`}
      title={open ? '클릭하면 마감으로 변경' : '클릭하면 모집중으로 변경'}
      disabled={isDisabled}
      onClick={() => {
        void onToggle(!open);
      }}
      className={[
        'inline-flex min-w-[3.5rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1',
        open
          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700',
        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      {saving ? '저장중' : label}
    </button>
  );
}
