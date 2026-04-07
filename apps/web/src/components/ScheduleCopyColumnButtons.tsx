import { Button } from '@tour/ui';
import { useEffect, useRef, useState } from 'react';

const COPIED_RESET_MS = 2000;

function CheckIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

async function copyScheduleColumn(
  lines: Array<{ time: string; activity: string }>,
  column: 'time' | 'activity',
): Promise<boolean> {
  const text = lines.map((line) => (column === 'time' ? line.time : line.activity)).join('\n');
  if (text.length === 0) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.alert('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    return false;
  }
}

export function ScheduleCopyColumnButtons({
  lines,
}: {
  lines: Array<{ time: string; activity: string }>;
}): JSX.Element | null {
  const [copied, setCopied] = useState<'time' | 'activity' | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current) {
        clearTimeout(resetRef.current);
      }
    };
  }, []);

  if (lines.length === 0) {
    return null;
  }

  const scheduleReset = (): void => {
    if (resetRef.current) {
      clearTimeout(resetRef.current);
    }
    resetRef.current = setTimeout(() => setCopied(null), COPIED_RESET_MS);
  };

  const onCopy = async (column: 'time' | 'activity'): Promise<void> => {
    const ok = await copyScheduleColumn(lines, column);
    if (ok) {
      setCopied(column);
      scheduleReset();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className={`inline-flex min-h-8 min-w-[5.5rem] items-center justify-center gap-1 text-xs ${
          copied === 'time' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''
        }`}
        aria-label={copied === 'time' ? '시간을 복사했습니다' : '시간 열 복사'}
        onClick={() => void onCopy('time')}
      >
        {copied === 'time' ? <CheckIcon className="h-4 w-4 shrink-0" /> : '시간 복사'}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={`inline-flex min-h-8 min-w-[5.5rem] items-center justify-center gap-1 text-xs ${
          copied === 'activity' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''
        }`}
        aria-label={copied === 'activity' ? '일정을 복사했습니다' : '일정 열 복사'}
        onClick={() => void onCopy('activity')}
      >
        {copied === 'activity' ? <CheckIcon className="h-4 w-4 shrink-0" /> : '일정 복사'}
      </Button>
    </div>
  );
}
