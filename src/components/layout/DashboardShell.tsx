import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogoMark } from '../common/ui';
import { AccountHeaderControls } from '../common/AccountHeaderControls';
import { LanguageToggle } from '../common/LanguageToggle';

export interface DashboardNavItem {
  to: string;
  label: string;
  labelBn?: string;
  icon: ReactNode;
  end?: boolean;
}

type DashboardSection = 'user' | 'moderator' | 'admin' | 'super_admin';

const DASHBOARD_ACCESS: Record<DashboardSection, { to: string; en: string; bn: string }> = {
  user: { to: '/user', en: 'User Dashboard', bn: 'ইউজার ড্যাশবোর্ড' },
  super_admin: { to: '/super-admin', en: 'Super Admin Panel', bn: 'সুপার অ্যাডমিন প্যানেল' },
  admin: { to: '/admin', en: 'Admin Panel', bn: 'অ্যাডমিন প্যানেল' },
  moderator: { to: '/moderator', en: 'Moderator Panel', bn: 'মডারেটর প্যানেল' },
};

function currentDashboardSection(pathname: string): DashboardSection | null {
  if (pathname.startsWith('/user')) return 'user';
  if (pathname.startsWith('/super-admin')) return 'super_admin';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/moderator')) return 'moderator';
  return null;
}

export function DashboardShell({
  title,
  titleBn,
  navItems,
  children,
}: {
  title: string;
  titleBn?: string;
  navItems: DashboardNavItem[];
  children: ReactNode;
}) {
  const { profile } = useAuth();
  const { tr } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.55)] ring-1 ring-white/90'
        : 'hover:bg-white/12 hover:translate-x-0.5'
    }`;

  // Use an inline color as a contrast safety net. Some local Tailwind rebuilds
  // were leaving active sidebar links white-on-white, making the label/icon look blank.
  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? '#111827' : '#ecfdf5',
  });

  const section = currentDashboardSection(location.pathname);
  const dashboardAccess: DashboardSection[] = profile?.role === 'super_admin'
    ? ['super_admin', 'admin', 'moderator', 'user']
    : profile?.role === 'admin'
    ? ['admin', 'moderator']
    : profile?.role === 'moderator' || profile?.role === 'sub_admin'
    ? ['moderator']
    : profile?.role === 'user'
    ? ['user']
    : [];
  const otherDashboards = dashboardAccess.filter((item) => item !== section);
  const resolvedTitle = tr(title, titleBn ?? title);
  const dashboardHome = section ? DASHBOARD_ACCESS[section].to : '/dashboard';
  const profilePath = `${dashboardHome}/profile`;
  const addressesPath = `${dashboardHome}/addresses`;

  const sidebarContent = (
    <>
      <Link
        to={dashboardHome}
        onClick={() => setSidebarOpen(false)}
        className="mb-6 flex min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-white shadow-[0_14px_34px_-24px_rgba(0,0,0,0.9)] transition-all hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
        aria-label={tr('Go to dashboard home', 'ড্যাশবোর্ড হোমে যান')}
      >
        <div className="rounded-2xl bg-white p-1.5 shadow-lg shadow-black/15">
          <LogoMark className="h-9 w-9 shrink-0" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-extrabold leading-tight text-white">Hadia Mart</div>
          <div className="mt-0.5 truncate text-[11px] font-semibold text-emerald-100/85">{resolvedTitle}</div>
        </div>
      </Link>

      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/65">
        {tr('Navigation', 'নেভিগেশন')}
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass} style={navLinkStyle} onClick={() => setSidebarOpen(false)}>
            <span className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105">{item.icon}</span>
            <span className="min-w-0 truncate">{tr(item.label, item.labelBn ?? item.label)}</span>
          </NavLink>
        ))}
        <NavLink to={profilePath} className={navLinkClass} style={navLinkStyle} onClick={() => setSidebarOpen(false)}>
          <span className="h-5 w-5 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </span>
          {tr('Profile', 'প্রোফাইল')}
        </NavLink>
        <NavLink to={addressesPath} className={navLinkClass} style={navLinkStyle} onClick={() => setSidebarOpen(false)}>
          <span className="h-5 w-5 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s6.75-5.19 6.75-11.25a6.75 6.75 0 10-13.5 0C5.25 15.81 12 21 12 21z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </span>
          {tr('Addresses', 'ঠিকানা')}
        </NavLink>

        {(otherDashboards.length > 0 || profile?.role === 'super_admin') && (
          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/65">
              {tr('Switch access', 'অ্যাক্সেস পরিবর্তন')}
            </div>
            {otherDashboards.map((target) => (
              <Link
                key={target}
                to={DASHBOARD_ACCESS[target].to}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-emerald-50/90 transition-all hover:bg-white/10 hover:text-white"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent-300" />
                <span className="truncate">{tr(DASHBOARD_ACCESS[target].en, DASHBOARD_ACCESS[target].bn)}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-primary-900 focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.125 1.125 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-5.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
          </svg>
          {tr('Go back to home page', 'হোম পেজে ফিরে যান')}
        </Link>
      </div>
    </>
  );

  return (
    <div className="dashboard-shell flex h-screen min-h-0 overflow-hidden bg-slate-50 text-slate-900">
      <aside
        className="dashboard-sidebar hidden md:flex md:w-60 lg:w-72 shrink-0 flex-col p-3 lg:p-4 sticky top-0 h-screen text-white border-r border-emerald-950/25 shadow-[14px_0_38px_-30px_rgba(2,44,32,0.75)]"
        style={{ background: 'linear-gradient(165deg, #07543c 0%, #053c2e 46%, #032b22 100%)' }}
      >
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} />
          <aside
            className="dashboard-sidebar absolute left-0 top-0 flex h-full w-[min(19rem,88vw)] flex-col p-4 text-white shadow-2xl animate-slide-up"
            style={{ background: 'linear-gradient(165deg, #07543c 0%, #053c2e 46%, #032b22 100%)' }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="dashboard-topbar sticky top-0 z-40 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-[0_8px_28px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-2.5">
            <button onClick={() => setSidebarOpen(true)} className="icon-btn -ml-1 shrink-0 md:hidden" aria-label={tr('Open dashboard menu', 'ড্যাশবোর্ড মেনু খুলুন')}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-950 sm:text-base">{resolvedTitle}</div>
              <div className="hidden truncate text-xs font-medium text-slate-500 sm:block">{tr('Secure management workspace', 'নিরাপদ ম্যানেজমেন্ট ওয়ার্কস্পেস')}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <div className="hidden min-[430px]:block"><LanguageToggle compact /></div>
            <AccountHeaderControls />
          </div>
        </header>

        <main
          className="relative min-h-0 min-w-0 flex-1 overflow-y-scroll overscroll-y-contain bg-[linear-gradient(180deg,#f8fbf9_0%,#f3f7f5_100%)] p-3 sm:p-5 lg:p-7 xl:p-8"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-primary-100/35 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-accent-100/20 blur-3xl" />
          </div>
          <div className="relative mx-auto w-full max-w-[1540px] dashboard-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
