import { PageShell } from '@tour/ui';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

interface NavChild {
  path: string;
  label: string;
}

interface NavItem {
  path: string;
  label: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { path: '/itinerary-builder', label: '일정 빌더' },
  {
    path: '/customers',
    label: '고객',
    children: [
      { path: '/customers', label: '고객 목록' },
      { path: '/customers/create', label: '고객 생성' },
    ],
  },
  { path: '/itinerary-templates', label: '일정 템플릿' },
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
  { path: '/events', label: '이벤트' },
];

export function AppLayout(): JSX.Element {
  const location = useLocation();
  const [hideLogo, setHideLogo] = useState(false);

  const matchesPath = (path: string): boolean =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isNavItemActive = (path: string, children?: NavChild[]): boolean => {
    if (matchesPath(path)) {
      return true;
    }

    if (!children || children.length === 0) {
      return false;
    }

    return children.some((child) => matchesPath(child.path));
  };

  const getActiveChildPath = (children: NavChild[]): string | null => {
    const matchedChildren = children
      .filter((child) => matchesPath(child.path))
      .sort((left, right) => right.path.length - left.path.length);

    return matchedChildren[0]?.path ?? null;
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white/95 backdrop-blur lg:flex lg:flex-col">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-slate-200 px-5 py-6">
            <Link to="/itinerary-builder" className="flex h-12 items-center">
              {!hideLogo ? (
                <img
                  src="/text-logo.png"
                  alt="로고"
                  className="h-12 w-auto object-contain"
                  onError={() => setHideLogo(true)}
                />
              ) : (
                <span className="text-base font-semibold text-slate-700">Tour ERP</span>
              )}
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const itemActive = isNavItemActive(item.path, item.children);
                const activeChildPath = item.children ? getActiveChildPath(item.children) : null;

                return (
                  <li key={item.path} className="space-y-1">
                    <Link
                      to={item.path}
                      className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        itemActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </Link>

                    {item.children && item.children.length > 0 ? (
                      <ul className="space-y-1 pl-3">
                        {item.children.map((child) => {
                          const childActive = activeChildPath === child.path;

                          return (
                            <li key={child.path}>
                              <Link
                                to={child.path}
                                className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                  childActive
                                    ? 'bg-slate-200 font-medium text-slate-900'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden no-print">
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const itemActive = isNavItemActive(item.path, item.children);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                    itemActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main>
          <PageShell>
            <Outlet />
          </PageShell>
        </main>
      </div>
    </div>
  );
}
