import { Link } from 'react-router-dom';

interface LocationSubNavProps {
  pathname: string;
}

function isListContext(pathname: string): boolean {
  return pathname === '/locations/list' || /^\/locations\/[^/]+(?:\/edit)?$/.test(pathname);
}

export function LocationSubNav({ pathname }: LocationSubNavProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/locations/list"
        className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
          isListContext(pathname)
            ? 'border border-slate-900 bg-slate-900 text-white'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        목적지 목록
      </Link>
      <Link
        to="/locations/create"
        className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
          pathname === '/locations/create'
            ? 'border border-slate-900 bg-slate-900 text-white'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        목적지 생성
      </Link>
      <Link
        to="/locations/connections"
        className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
          pathname === '/locations/connections'
            ? 'border border-slate-900 bg-slate-900 text-white'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        목적지 간 연결
      </Link>
    </div>
  );
}
