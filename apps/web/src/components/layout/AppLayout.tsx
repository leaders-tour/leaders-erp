import { PageShell } from '@tour/ui';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/itinerary-builder', label: '일정 빌더' },
  { path: '/regions', label: '지역' },
  { path: '/locations', label: '목적지' },
];

export function AppLayout(): JSX.Element {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur no-print">
        <PageShell>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
                  location.pathname.startsWith(item.path)
                    ? 'border border-slate-900 bg-slate-900 text-white'
                    : 'border border-transparent text-slate-700 hover:border-slate-200 hover:bg-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </PageShell>
      </header>
      <main>
        <PageShell>
          <Outlet />
        </PageShell>
      </main>
    </div>
  );
}
