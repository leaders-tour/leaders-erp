import { PageShell } from '@tour/ui';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/itinerary-builder', label: '일정 빌더' },
  {
    path: '/customers',
    label: '고객',
    children: [{ path: '/customers', label: '고객 목록' }],
  },
  { path: '/activities', label: '액티비티' },
  {
    path: '/locations',
    label: '목적지',
    children: [
      { path: '/locations/list', label: '목적지 목록' },
      { path: '/locations/create', label: '목적지 생성' },
      { path: '/locations/connections', label: '목적지 간 연결' },
      { path: '/location-guides', label: '여행지 안내사항' },
    ],
  },
  {
    path: '/regions',
    label: '지역',
    children: [
      { path: '/regions/list', label: '지역 목록' },
      { path: '/regions/create', label: '지역 생성' },
    ],
  },
];

export function AppLayout(): JSX.Element {
  const location = useLocation();
  const [hideLogo, setHideLogo] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur no-print">
        <PageShell>
          <div className="grid grid-cols-[160px_minmax(0,1fr)_160px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <Link to="/itinerary-builder" className="flex h-14 w-[160px] items-center px-2">
              {!hideLogo ? (
                <img
                  src="/text-logo.png"
                  alt="로고"
                  className="h-14 w-auto object-contain"
                  onError={() => setHideLogo(true)}
                />
              ) : (
                <span className="text-sm font-semibold text-slate-700">Tour ERP</span>
              )}
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {navItems.map((item) => (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
                      location.pathname.startsWith(item.path)
                        ? 'border border-slate-900 bg-slate-900 text-white'
                        : 'border border-transparent text-slate-700 hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                  {item.children && item.children.length > 0 ? (
                    <div className="invisible pointer-events-none absolute left-0 top-full z-30 min-w-[180px] pt-1 opacity-0 transition group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                      <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                              location.pathname === child.path
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div aria-hidden className="h-14 w-[160px]" />
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
