import { EmployeeRole } from '@tour/domain';
import { Button, PageShell } from '@tour/ui';
import { type ComponentType, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context';

interface NavChild {
  path: string;
  label: string;
}

type NavIcon = ComponentType<{ className?: string }>;

interface NavItem {
  path: string;
  label: string;
  icon: NavIcon;
  children?: NavChild[];
}

const ItineraryIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />
  </svg>
);

const PipelineIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 18h4V10H4v8Zm6 0h4V6h-4v12Zm6 0h4v-5h-4v5Z" />
  </svg>
);

const OutreachIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
  </svg>
);

const TodoIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 6 1.5 1.5L7.5 5.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 12 1.5 1.5L7.5 11.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 18 1.5 1.5L7.5 17.5" />
  </svg>
);

const CustomerIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
  </svg>
);

const TemplateIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
);

const LocationIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const ConnectionIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 17h8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m13 4 3 3-3 3M11 14l-3 3 3 3" />
  </svg>
);

const MultiDayBlockIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="4" y="5" width="16" height="4" rx="1.5" />
    <rect x="4" y="11" width="16" height="4" rx="1.5" />
    <rect x="4" y="17" width="16" height="2" rx="1" />
  </svg>
);

const RegionIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const EventIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.1 4.6 4.9.4-3.7 3.4 1.1 4.8L12 13.8 7.6 16.2l1.1-4.8L5 8l4.9-.4L12 3Z" />
  </svg>
);

const AdminIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.2-2.9 8-7 9-4.1-1-7-4.8-7-9V7l7-4Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5 11 14l3.5-3.5" />
  </svg>
);

const PricingIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <g transform="translate(0 2)">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12V4a2 2 0 0 1 2-2h8l10 10-8 8L2 12Z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </g>
  </svg>
);

const TourListIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const GuideIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 21v-1a6 6 0 0 1 12 0v1" />
  </svg>
);

const DriverIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 17h14M7 9l2-4h6l2 4" />
    <rect x="3" y="9" width="18" height="8" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7.5" cy="17" r="2" />
    <circle cx="16.5" cy="17" r="2" />
  </svg>
);

const AccommodationIcon: NavIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
  </svg>
);

const resourceNavItems: NavItem[] = [
  { path: '/guides', label: '가이드', icon: GuideIcon },
  { path: '/drivers', label: '기사', icon: DriverIcon },
  { path: '/accommodations', label: '숙소', icon: AccommodationIcon },
];

const baseNavItems: NavItem[] = [
  { path: '/itinerary-builder', label: '일정 빌더', icon: ItineraryIcon },
  { path: '/confirmed-trips', label: '투어 리스트', icon: TourListIcon },
  { path: '/deal-pipeline', label: '딜 파이프라인 ( 준비중 )', icon: PipelineIcon },
  { path: '/outreach/leads', label: '카페 리드 ( 준비중 )', icon: OutreachIcon },
  { path: '/todos/list', label: 'TODO', icon: TodoIcon },
  {
    path: '/customers',
    label: '고객',
    icon: CustomerIcon,
    children: [
      { path: '/customers', label: '고객 목록' },
      { path: '/customers/create', label: '고객 생성' },
    ],
  },
  {
    path: '/itinerary-templates',
    label: '일정 템플릿',
    icon: TemplateIcon,
    children: [
      { path: '/itinerary-templates', label: '템플릿 목록' },
      { path: '/itinerary-templates/new', label: '템플릿 생성' },
    ],
  },
  {
    path: '/regions',
    label: '지역',
    icon: RegionIcon,
    children: [
      { path: '/regions/list', label: '지역 목록' },
      { path: '/regions/create', label: '지역 생성' },
      { path: '/regions/sets', label: '지역 세트' },
      { path: '/regions/lodgings', label: '지역 숙소' },
      { path: '/settings/special-meal-destination-rules', label: '특식 여행지 규칙' },
    ],
  },
  {
    path: '/locations',
    label: '목적지',
    icon: LocationIcon,
    children: [
      { path: '/locations/list', label: '목적지 목록' },
      { path: '/locations/create', label: '목적지 생성' },
      { path: '/location-guides', label: '여행지 안내사항' },
    ],
  },
  {
    path: '/connections',
    label: '연결',
    icon: ConnectionIcon,
    children: [
      { path: '/connections/list', label: '연결 목록' },
      { path: '/connections/create', label: '연결 생성' },
    ],
  },
  {
    path: '/multi-day-blocks',
    label: '연속 일정 블록',
    icon: MultiDayBlockIcon,
    children: [
      { path: '/multi-day-blocks/list', label: '블록 목록' },
      { path: '/multi-day-blocks/create', label: '블록 생성' },
    ],
  },
  {
    path: '/events',
    label: '이벤트',
    icon: EventIcon,
    children: [
      { path: '/events/list', label: '이벤트 목록' },
      { path: '/events/create', label: '이벤트 생성' },
    ],
  },
];

const sidebarCollapsedStorageKey = 'tour-erp:sidebar-collapsed';
const hiddenNavPaths = new Set(['/outreach/leads', '/todos/list']);

function roleLabel(role: EmployeeRole): string {
  return role === EmployeeRole.ADMIN ? '관리자' : '일반';
}

export function AppLayout(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee, logout } = useAuth();
  const [hideLogo, setHideLogo] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const savedValue = window.localStorage.getItem(sidebarCollapsedStorageKey);

    if (savedValue === null) {
      return true;
    }

    return savedValue === 'true';
  });
  const navItems =
    (employee?.role === EmployeeRole.ADMIN
      ? [
          ...baseNavItems,
          { path: '/admin/pricing-policies', label: '가격 정책', icon: PricingIcon },
          ...resourceNavItems,
          { path: '/admin/employees', label: '직원 관리', icon: AdminIcon },
        ]
      : [...baseNavItems, ...resourceNavItems]
    ).filter((item) => !hiddenNavPaths.has(item.path));

  const matchesPath = (path: string): boolean =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const isFullBleedPage = matchesPath('/itinerary-builder') || matchesPath('/deal-pipeline');
  const isPricingAdminPage = matchesPath('/admin/pricing-policies');
  const isWideLocationProfilePage =
    location.pathname === '/locations/create' ||
    location.pathname === '/connections/create' ||
    /^\/locations\/[^/]+\/versions\/[^/]+\/edit$/.test(location.pathname);
  const isWideMultiDayBlockCreatePage = location.pathname === '/multi-day-blocks/create';
  const isWideConnectionListPage = location.pathname === '/connections/list';
  const isConfirmedTripsPage = matchesPath('/confirmed-trips');
  const isTodoListPage = matchesPath('/todos/list');
  const pageShellClassName = isFullBleedPage
    ? 'max-w-none px-0 py-0'
    : isWideConnectionListPage || isPricingAdminPage || isConfirmedTripsPage || isTodoListPage
      ? 'max-w-none'
      : isWideLocationProfilePage || isWideMultiDayBlockCreatePage
        ? 'max-w-[1800px]'
        : undefined;
  const isCompactSidebar = isSidebarCollapsed;

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

  const activeExpandablePath =
    navItems.find((item) => item.children && item.children.some((child) => matchesPath(child.path)))?.path ?? null;

  const [openNavPath, setOpenNavPath] = useState<string | null>(activeExpandablePath);

  useEffect(() => {
    if (activeExpandablePath) {
      setOpenNavPath(activeExpandablePath);
    }
  }, [activeExpandablePath]);

  useEffect(() => {
    window.localStorage.setItem(sidebarCollapsedStorageKey, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div className={`min-h-screen bg-slate-50 lg:grid ${isCompactSidebar ? 'lg:grid-cols-[88px_minmax(0,1fr)]' : 'lg:grid-cols-[240px_minmax(0,1fr)]'}`}>
      <aside className="hidden border-r border-slate-200 bg-white/95 backdrop-blur lg:flex lg:flex-col">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className={`border-b border-slate-200 ${isCompactSidebar ? 'px-3 py-5' : 'px-5 py-6'}`}>
            <div className={`grid h-[152px] ${isCompactSidebar ? 'grid-rows-[40px_1fr]' : 'grid-rows-[48px_1fr]'} gap-4`}>
              <div className={`flex items-center ${isCompactSidebar ? 'justify-center' : 'justify-between gap-3'}`}>
                <div className={`flex h-12 items-center overflow-hidden ${isCompactSidebar ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  <Link to="/itinerary-builder" className="flex h-12 items-center" title="일정 빌더" aria-hidden={isCompactSidebar}>
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
                <button
                  type="button"
                  title={isCompactSidebar ? '사이드바 펼치기' : '사이드바 접기'}
                  aria-label={isCompactSidebar ? '사이드바 펼치기' : '사이드바 접기'}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setIsSidebarCollapsed((current) => !current)}
                >
                  <span className="text-sm font-semibold tracking-tight">{isCompactSidebar ? '>>' : '<<'}</span>
                </button>
              </div>

              <div className={`min-h-0 ${isCompactSidebar ? 'flex flex-col items-center justify-center gap-3' : ''}`}>
                {isCompactSidebar ? (
                  <>
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white"
                      title={`${employee?.name ?? '직원'} · ${employee?.email ?? '-'}`}
                    >
                      {(employee?.name ?? '직원').slice(0, 1)}
                    </div>
                    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                      {employee ? roleLabel(employee.role) : '-'}
                    </span>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Signed In</p>
                    <p className="mt-2 text-sm font-semibold">{employee?.name ?? '직원'}</p>
                    <p className="mt-1 text-xs text-slate-300">{employee?.email ?? '-'}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-slate-200">
                        {employee ? roleLabel(employee.role) : '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav className={`flex-1 overflow-y-auto ${isCompactSidebar ? 'px-2 py-4' : 'px-4 py-5'}`}>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const itemActive = isNavItemActive(item.path, item.children);
                const activeChildPath = item.children ? getActiveChildPath(item.children) : null;
                const showDividerAbove = item.path === '/customers' || item.path === '/guides' || item.path === '/admin/employees';
                const ItemIcon = item.icon;
                const compactItemClassName = `flex items-center justify-center rounded-2xl px-3 py-3 transition-colors ${
                  itemActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`;

                return (
                  <li key={item.path} className={`space-y-1 ${showDividerAbove ? 'mt-3 border-t border-slate-200 pt-3' : ''}`}>
                    {isCompactSidebar ? (
                      <Link to={item.path} title={item.label} aria-label={item.label} className={compactItemClassName}>
                        <ItemIcon className="h-5 w-5 flex-none" />
                      </Link>
                    ) : item.children && item.children.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setOpenNavPath((currentPath) => (currentPath === item.path ? null : item.path))}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          itemActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ItemIcon className="h-4 w-4 flex-none" />
                          <span>{item.label}</span>
                        </span>
                        <span className="text-xs">{openNavPath === item.path ? '▾' : '▸'}</span>
                      </button>
                    ) : (
                      <Link
                        to={item.path}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          itemActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <ItemIcon className="h-4 w-4 flex-none" />
                        {item.label}
                      </Link>
                    )}

                    {!isCompactSidebar && item.children && item.children.length > 0 && openNavPath === item.path ? (
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{employee?.name ?? '직원'}</p>
              <p className="text-xs text-slate-500">
                {employee?.email ?? '-'} · {employee ? roleLabel(employee.role) : '-'}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              로그아웃
            </Button>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const itemActive = isNavItemActive(item.path, item.children);
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                    itemActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ItemIcon className="h-3.5 w-3.5 flex-none" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main>
          <PageShell className={pageShellClassName}>
            <Outlet />
          </PageShell>
        </main>
      </div>
    </div>
  );
}
