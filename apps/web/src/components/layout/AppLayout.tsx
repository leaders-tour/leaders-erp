import { PageShell } from '@tour/ui';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/itinerary-builder', label: 'Builder' },
  { path: '/regions', label: 'Regions' },
  { path: '/locations', label: 'Locations' },
  { path: '/segments', label: 'Segments' },
  { path: '/plans', label: 'Plans' },
  { path: '/day-plans', label: 'DayPlans' },
  { path: '/time-blocks', label: 'TimeBlocks' },
  { path: '/activities', label: 'Activities' },
  { path: '/overrides', label: 'Overrides' },
];

export function AppLayout(): JSX.Element {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white no-print">
        <PageShell>
          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded px-3 py-1 text-sm ${
                  location.pathname.startsWith(item.path) ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
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
