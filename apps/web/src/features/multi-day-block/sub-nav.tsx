import { Link } from 'react-router-dom';

interface MultiDayBlockSubNavProps {
  pathname: string;
}

function isListContext(pathname: string): boolean {
  return pathname === '/multi-day-blocks/list' || /^\/multi-day-blocks\/[^/]+(?:\/edit)?$/.test(pathname);
}

export function MultiDayBlockSubNav({ pathname }: MultiDayBlockSubNavProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/multi-day-blocks/list"
        className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
          isListContext(pathname)
            ? 'border border-slate-900 bg-slate-900 text-white'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        블록 목록
      </Link>
      <Link
        to="/multi-day-blocks/create"
        className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
          pathname === '/multi-day-blocks/create'
            ? 'border border-slate-900 bg-slate-900 text-white'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        블록 생성
      </Link>
    </div>
  );
}
