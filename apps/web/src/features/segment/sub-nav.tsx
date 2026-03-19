import { Link } from 'react-router-dom';

interface ConnectionSubNavProps {
  pathname: string;
}

export function ConnectionSubNav({ pathname }: ConnectionSubNavProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/connections/list"
        className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
          pathname === '/connections/list'
            ? 'border border-slate-900 bg-slate-900 text-white'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        연결 목록
      </Link>
      <Link
        to="/connections/create"
        className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
          pathname === '/connections/create'
            ? 'border border-slate-900 bg-slate-900 text-white'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        연결 생성
      </Link>
    </div>
  );
}
