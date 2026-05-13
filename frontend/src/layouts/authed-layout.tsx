import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '@/components/loading-screen';
import { getLastPath } from '@/utility/nav-history';
import { parseAuthRequired, resolveAuthGuard } from '@/lib/auth-guard';
import { useAuth } from '@/lib/auth-provider';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Gauge,
  Gift,
  History,
  Leaf,
  LogOut,
  Menu,
  Trophy,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';

import AnimatedThemeToggler from '@/components/AnimatedThemeToggler';
import { AuthModalProvider } from '@/components/auth-modal';

type NavEntry = {
  label: string;
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
  stub?: boolean;
};

const primaryNav: NavEntry[] = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge },
  { label: 'Plan Route', shortLabel: 'Route', to: '/route', icon: Compass },
  { label: 'History', to: '/history', icon: History },
  { label: 'Rewards', to: '/rewards', icon: Gift },
  { label: 'Leaderboard', shortLabel: 'Board', to: '/leaderboard', icon: Trophy },
];

const secondaryNav: NavEntry[] = [
  { label: 'Profile', to: '/profile', icon: UserRound },
];

const SIDEBAR_OPEN = 268;
const SIDEBAR_CLOSED = 76;

const isAuthedPath = (p: string) =>
  p.startsWith('/dashboard') ||
  p.startsWith('/route') ||
  p.startsWith('/history') ||
  p.startsWith('/rewards') ||
  p.startsWith('/leaderboard') ||
  p.startsWith('/profile');

export default function AuthedLayout() {
  const { pathname, search } = useLocation();
  const { user, loading } = useAuth();
  if (loading) {
    return null;
  }
  const guard = resolveAuthGuard({
    authRequired: parseAuthRequired(import.meta.env.VITE_AUTH_REQUIRED),
    sessionUserId: user?.uid ?? null,
    devUserId: import.meta.env.VITE_DEV_USER_ID ?? '',
    pathname: pathname + search,
  });
  if ('redirectTo' in guard) {
    return <Navigate to={guard.redirectTo} replace />;
  }
  return <AuthedShell />;
}

function AuthedShell() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem('verdify:sidebar');
    return v === null ? true : v === '1';
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const profileName = user?.displayName?.trim() || user?.email || 'Verdify member';
  const profileInitials = profileName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'V';
  const profileSubtitle = user?.email && user.email !== profileName ? user.email : 'Verdify member';

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const handoffDecided = useRef(false);
  const [handoff, setHandoff] = useState(false);
  if (!handoffDecided.current) {
    handoffDecided.current = true;
    const prev = getLastPath();
    if (prev !== null && !isAuthedPath(prev)) {
      setHandoff(true);
    }
  }

  useEffect(() => {
    window.localStorage.setItem('verdify:sidebar', expanded ? '1' : '0');
  }, [expanded]);

  return (
    <AuthModalProvider>
      {handoff && (
        <LoadingScreen variant="handoff" onDone={() => setHandoff(false)} />
      )}
      <div className="theme-root relative min-h-svh overflow-x-clip">
        <div className="theme-grain" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(42% 30% at 8% 12%, var(--theme-mesh-a), transparent 70%), radial-gradient(35% 28% at 92% 88%, var(--theme-mesh-b), transparent 70%)',
            filter: 'blur(60px)',
            opacity: 0.65,
          }}
        />

        <div
          className="relative z-10 flex min-h-svh"
          style={
            {
              '--sidebar-w': `${expanded ? SIDEBAR_OPEN : SIDEBAR_CLOSED}px`,
              '--sidebar-ease': 'cubic-bezier(0.2, 0.7, 0.2, 1)',
              '--sidebar-dur': '460ms',
              '--page-max-w': '1280px',
            } as React.CSSProperties
          }
        >
          <div
            aria-hidden
            className="pointer-events-none fixed inset-y-0 left-0 hidden border-r lg:block"
            style={{
              width: 'var(--sidebar-w)',
              transition: 'width var(--sidebar-dur) var(--sidebar-ease)',
              willChange: 'width',
              borderColor: 'var(--theme-border)',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--theme-bg) 96%, transparent) 0%, color-mix(in srgb, var(--theme-bg-soft) 94%, transparent) 100%)',
              backdropFilter: 'blur(22px) saturate(180%)',
              WebkitBackdropFilter: 'blur(22px) saturate(180%)',
            }}
          />
          <aside
            className="fixed inset-y-0 left-0 z-10 hidden h-svh shrink-0 flex-col lg:flex"
            style={{
              width: 'var(--sidebar-w)',
              transition: 'width var(--sidebar-dur) var(--sidebar-ease)',
              willChange: 'width',
            }}
          >
            <div className="flex items-center gap-3 px-5 pb-5 pt-7">
              <Link
                to="/"
                onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })}
                className="flex items-center gap-2.5"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                  style={{ background: 'var(--theme-accent)' }}
                >
                  <Leaf
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--theme-accent-fg)' }}
                    strokeWidth={2.2}
                  />
                </span>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      key="wordmark"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.25 }}
                      className="theme-display overflow-hidden whitespace-nowrap text-[1.05rem] tracking-[-0.03em]"
                      style={{ color: 'var(--theme-fg)' }}
                    >
                      Verdify
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </div>

            <div className="px-3">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                className="group flex w-full items-center justify-center rounded-full border transition-colors duration-300"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-fg-muted)',
                  height: 34,
                }}
              >
                {expanded ? (
                  <ChevronsLeft className="h-[15px] w-[15px]" strokeWidth={1.6} />
                ) : (
                  <ChevronsRight className="h-[15px] w-[15px]" strokeWidth={1.6} />
                )}
              </button>
            </div>

            <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
              <SidebarLabel expanded={expanded}>Track</SidebarLabel>
              {primaryNav.map((entry) => (
                <SidebarItem
                  key={entry.to}
                  entry={entry}
                  expanded={expanded}
                  active={pathname.startsWith(entry.to) && !entry.stub}
                />
              ))}

              <div className="my-4 h-px" style={{ background: 'var(--theme-border)' }} />

              <SidebarLabel expanded={expanded}>Account</SidebarLabel>
              {secondaryNav.map((entry) => (
                <SidebarItem
                  key={entry.to}
                  entry={entry}
                  expanded={expanded}
                  active={pathname.startsWith(entry.to) && !entry.stub}
                />
              ))}
            </nav>

            <div className="border-t px-3 py-4" style={{ borderColor: 'var(--theme-border)' }}>
              <div
                className={`flex items-center ${expanded ? 'gap-3 px-2' : 'justify-center'}`}
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    style={{ border: '1px solid var(--theme-accent-muted)' }}
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-medium"
                    style={{
                      background: 'var(--theme-accent-soft)',
                      color: 'var(--theme-accent)',
                      border: '1px solid var(--theme-accent-muted)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {profileInitials}
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="who"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.22 }}
                      className="min-w-0 flex-1 overflow-hidden"
                    >
                      <p
                        className="truncate text-[0.82rem]"
                        style={{ color: 'var(--theme-fg)' }}
                      >
                        {profileName}
                      </p>
                      <p
                        className="theme-mono-sm truncate"
                        style={{ color: 'var(--theme-fg-dim)' }}
                      >
                        {profileSubtitle}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.button
                      key="signout"
                      type="button"
                      onClick={() => { void signOut(); }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--theme-surface-muted)]"
                      style={{ color: 'var(--theme-fg-muted)' }}
                      aria-label="Sign out"
                    >
                      <LogOut className="h-[14px] w-[14px]" strokeWidth={1.6} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </aside>

          <div
            aria-hidden
            className="hidden shrink-0 lg:block"
            style={{
              width: 'var(--sidebar-w)',
              transition: 'width var(--sidebar-dur) var(--sidebar-ease)',
              willChange: 'width',
            }}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <header
              className="sticky top-0 z-20 flex h-16 items-center justify-between border-b px-6 lg:px-10"
              style={{
                borderColor: 'var(--theme-border)',
                background: 'color-mix(in srgb, var(--theme-bg) 78%, transparent)',
                backdropFilter: 'blur(18px) saturate(180%)',
                WebkitBackdropFilter: 'blur(18px) saturate(180%)',
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
                  style={{
                    border: '1px solid var(--theme-border)',
                    color: 'var(--theme-fg)',
                  }}
                >
                  <Menu size={16} strokeWidth={1.6} />
                </button>
                <span
                  className="theme-accent-dot hidden lg:block"
                  aria-hidden
                />
                <span
                  className="theme-mono-sm min-w-0 truncate"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  Verdify / {pageLabel(pathname)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AnimatedThemeToggler className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--theme-surface-muted)]" />
              </div>
            </header>

            <AnimatePresence>
              {mobileNavOpen ? (
                <>
                  <motion.button
                    key="authed-backdrop"
                    aria-label="Close menu"
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[55] cursor-default lg:hidden"
                    style={{
                      background: 'color-mix(in srgb, var(--theme-bg) 40%, transparent)',
                      backdropFilter: 'blur(8px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                    }}
                  />
                  <motion.aside
                    key="authed-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navigation"
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                    className="fixed inset-y-0 left-0 z-[60] flex h-[100dvh] w-full max-w-[320px] flex-col border-r lg:hidden"
                    style={{
                      borderColor: 'var(--theme-border)',
                      background: 'var(--theme-bg)',
                      boxShadow: '0 40px 80px -30px rgba(10,14,12,0.35)',
                    }}
                  >
                    <div
                      className="flex items-center justify-between border-b px-5"
                      style={{ height: 64, borderColor: 'var(--theme-border)' }}
                    >
                      <Link to="/" className="flex items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                          style={{ background: 'var(--theme-accent)' }}
                        >
                          <Leaf
                            className="h-3.5 w-3.5"
                            style={{ color: 'var(--theme-accent-fg)' }}
                            strokeWidth={2.2}
                          />
                        </span>
                        <span
                          className="theme-display text-[1.05rem] tracking-[-0.03em]"
                          style={{ color: 'var(--theme-fg)' }}
                        >
                          Verdify
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setMobileNavOpen(false)}
                        aria-label="Close menu"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          border: '1px solid var(--theme-border)',
                          color: 'var(--theme-fg-muted)',
                        }}
                      >
                        <X size={16} strokeWidth={1.6} />
                      </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 py-6">
                      <p
                        className="theme-mono-sm px-3 pb-3"
                        style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.18em' }}
                      >
                        Track
                      </p>
                      <ul className="flex flex-col gap-1">
                        {primaryNav.map((entry) => (
                          <li key={entry.to}>
                            <MobileNavItem
                              entry={entry}
                              active={pathname.startsWith(entry.to) && !entry.stub}
                              onClick={() => setMobileNavOpen(false)}
                            />
                          </li>
                        ))}
                      </ul>

                      <div
                        className="my-5 h-px"
                        style={{ background: 'var(--theme-border)' }}
                      />

                      <p
                        className="theme-mono-sm px-3 pb-3"
                        style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.18em' }}
                      >
                        Account
                      </p>
                      <ul className="flex flex-col gap-1">
                        {secondaryNav.map((entry) => (
                          <li key={entry.to}>
                            <MobileNavItem
                              entry={entry}
                              active={pathname.startsWith(entry.to) && !entry.stub}
                              onClick={() => setMobileNavOpen(false)}
                            />
                          </li>
                        ))}
                      </ul>
                    </nav>

                    <div
                      className="border-t px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
                      style={{ borderColor: 'var(--theme-border)' }}
                    >
                      <div className="flex items-center gap-3">
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                            style={{ border: '1px solid var(--theme-accent-muted)' }}
                          />
                        ) : (
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-medium"
                            style={{
                              background: 'var(--theme-accent-soft)',
                              color: 'var(--theme-accent)',
                              border: '1px solid var(--theme-accent-muted)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {profileInitials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-[0.82rem]"
                            style={{ color: 'var(--theme-fg)' }}
                          >
                            {profileName}
                          </p>
                          <p
                            className="theme-mono-sm truncate"
                            style={{ color: 'var(--theme-fg-dim)' }}
                          >
                            {profileSubtitle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { void signOut(); }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                          style={{
                            border: '1px solid var(--theme-border)',
                            color: 'var(--theme-fg-muted)',
                          }}
                          aria-label="Sign out"
                        >
                          <LogOut className="h-[14px] w-[14px]" strokeWidth={1.6} />
                        </button>
                      </div>
                    </div>
                  </motion.aside>
                </>
              ) : null}
            </AnimatePresence>

            <main className="relative flex-1 overflow-x-clip">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, x: 120 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -120 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ willChange: 'transform, opacity' }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    </AuthModalProvider>
  );
}

function pageLabel(pathname: string) {
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/route')) return 'Route';
  if (pathname.startsWith('/history')) return 'History';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/leaderboard')) return 'Board';
  if (pathname.startsWith('/rewards')) return 'Rewards';
  return 'Verdify';
}

function MobileNavItem({
  entry,
  active,
  onClick,
}: {
  entry: NavEntry;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = entry.icon;
  const className =
    'group relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors duration-300';

  const content = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-300"
        style={{
          background: active ? 'var(--theme-accent)' : 'transparent',
          color: active
            ? 'var(--theme-accent-fg)'
            : 'var(--theme-fg-muted)',
          border: active
            ? '1px solid var(--theme-accent)'
            : '1px solid transparent',
        }}
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={1.7} />
      </span>
      <span
        className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap text-[0.95rem]"
        style={{
          color: active ? 'var(--theme-fg)' : 'var(--theme-fg-muted)',
        }}
      >
        <span className="truncate">{entry.shortLabel ?? entry.label}</span>
        {entry.stub ? (
          <span
            className="theme-mono-sm shrink-0"
            style={{ color: 'var(--theme-fg-dim)', fontSize: '0.56rem' }}
          >
            Soon
          </span>
        ) : null}
      </span>
    </>
  );

  if (entry.stub) {
    return (
      <button
        type="button"
        disabled
        className={`${className} w-full cursor-not-allowed opacity-70`}
      >
        {content}
      </button>
    );
  }

  return (
    <NavLink
      to={entry.to}
      onClick={() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        onClick();
      }}
      className={className}
    >
      {content}
    </NavLink>
  );
}

function SidebarLabel({
  children,
  expanded,
}: {
  children: React.ReactNode;
  expanded: boolean;
}) {
  return (
    <div className="mb-1 h-5 px-3">
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="theme-mono-sm block"
            style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.18em' }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({
  entry,
  expanded,
  active,
}: {
  entry: NavEntry;
  expanded: boolean;
  active: boolean;
}) {
  const Icon = entry.icon;
  const content = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-300"
        style={{
          background: active ? 'var(--theme-accent)' : 'transparent',
          color: active
            ? 'var(--theme-accent-fg)'
            : 'var(--theme-fg-muted)',
          border: active ? '1px solid var(--theme-accent)' : '1px solid transparent',
        }}
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={1.7} />
      </span>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.22 }}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap text-[0.88rem]"
            style={{
              color: active ? 'var(--theme-fg)' : 'var(--theme-fg-muted)',
            }}
          >
            <span className="truncate">{entry.shortLabel ?? entry.label}</span>
            {entry.stub && (
              <span
                className="theme-mono-sm shrink-0"
                style={{ color: 'var(--theme-fg-dim)', fontSize: '0.56rem' }}
              >
                Soon
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  const className =
    'group relative flex items-center gap-3 rounded-[12px] px-2 py-1.5 transition-colors duration-300 hover:bg-[var(--theme-surface-muted)]';

  if (entry.stub) {
    return (
      <button
        type="button"
        disabled
        className={`${className} cursor-not-allowed opacity-70`}
        title={`${entry.label} (coming soon)`}
      >
        {content}
      </button>
    );
  }

  return (
    <NavLink
      to={entry.to}
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })}
      className={className}
    >
      {content}
    </NavLink>
  );
}
