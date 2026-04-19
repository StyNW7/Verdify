import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '@/components/loading-screen';
import { getLastPath } from '@/utility/nav-history';
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
  Settings,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

import AnimatedThemeToggler from '@/components/AnimatedThemeToggler';
import { AuthModalProvider } from '@/components/auth-modal';

type NavEntry = {
  label: string;
  to: string;
  icon: LucideIcon;
  stub?: boolean;
};

const primaryNav: NavEntry[] = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge },
  { label: 'Plan Route', to: '/route', icon: Compass },
  { label: 'History', to: '#history', icon: History, stub: true },
  { label: 'Rewards', to: '#rewards', icon: Gift, stub: true },
  { label: 'Leaderboard', to: '#leaderboard', icon: Trophy, stub: true },
];

const secondaryNav: NavEntry[] = [
  { label: 'Settings', to: '#settings', icon: Settings, stub: true },
];

const SIDEBAR_OPEN = 268;
const SIDEBAR_CLOSED = 76;

const isAuthedPath = (p: string) =>
  p.startsWith('/dashboard') || p.startsWith('/route');

export default function AuthedLayout() {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem('verdify:sidebar');
    return v === null ? true : v === '1';
  });

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
      <div className="landing-theme landing-root relative min-h-svh overflow-x-hidden">
        <div className="landing-grain" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(42% 30% at 8% 12%, var(--landing-mesh-a), transparent 70%), radial-gradient(35% 28% at 92% 88%, var(--landing-mesh-b), transparent 70%)',
            filter: 'blur(60px)',
            opacity: 0.65,
          }}
        />

        <div className="relative z-10 flex min-h-svh">
          <motion.aside
            initial={false}
            animate={{ width: expanded ? SIDEBAR_OPEN : SIDEBAR_CLOSED }}
            transition={{ duration: 0.42, ease: [0.2, 0.7, 0.2, 1] }}
            className="sticky top-0 hidden h-svh shrink-0 flex-col border-r lg:flex"
            style={{
              borderColor: 'var(--landing-border)',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--landing-bg) 96%, transparent) 0%, color-mix(in srgb, var(--landing-bg-soft) 94%, transparent) 100%)',
              backdropFilter: 'blur(22px) saturate(180%)',
              WebkitBackdropFilter: 'blur(22px) saturate(180%)',
            }}
          >
            <div className="flex items-center gap-3 px-5 pb-5 pt-7">
              <Link to="/" className="flex items-center gap-2.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                  style={{ background: 'var(--landing-accent)' }}
                >
                  <Leaf
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--landing-button-foreground)' }}
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
                      className="landing-display overflow-hidden whitespace-nowrap text-[1.05rem] tracking-[-0.03em]"
                      style={{ color: 'var(--landing-text)' }}
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
                  borderColor: 'var(--landing-border)',
                  color: 'var(--landing-text-muted)',
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

              <div className="my-4 h-px" style={{ background: 'var(--landing-border)' }} />

              <SidebarLabel expanded={expanded}>Account</SidebarLabel>
              {secondaryNav.map((entry) => (
                <SidebarItem
                  key={entry.to}
                  entry={entry}
                  expanded={expanded}
                  active={false}
                />
              ))}
            </nav>

            <div className="border-t px-3 py-4" style={{ borderColor: 'var(--landing-border)' }}>
              <div
                className={`flex items-center ${expanded ? 'gap-3 px-2' : 'justify-center'}`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-medium"
                  style={{
                    background: 'var(--landing-accent-soft)',
                    color: 'var(--landing-accent)',
                    border: '1px solid var(--landing-accent-muted)',
                    letterSpacing: '0.04em',
                  }}
                >
                  SR
                </div>
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
                        style={{ color: 'var(--landing-text)' }}
                      >
                        Sarah Rashid
                      </p>
                      <p
                        className="landing-mono-sm truncate"
                        style={{ color: 'var(--landing-text-dim)' }}
                      >
                        Commuter · JB
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.button
                      key="signout"
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--landing-surface-alt)]"
                      style={{ color: 'var(--landing-text-muted)' }}
                      aria-label="Sign out"
                    >
                      <LogOut className="h-[14px] w-[14px]" strokeWidth={1.6} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header
              className="sticky top-0 z-20 flex h-16 items-center justify-between border-b px-6 lg:px-10"
              style={{
                borderColor: 'var(--landing-border)',
                background: 'color-mix(in srgb, var(--landing-bg) 78%, transparent)',
                backdropFilter: 'blur(18px) saturate(180%)',
                WebkitBackdropFilter: 'blur(18px) saturate(180%)',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="landing-accent-dot"
                  aria-hidden
                />
                <span
                  className="landing-mono-sm"
                  style={{ color: 'var(--landing-text-dim)' }}
                >
                  Verdify / {pageLabel(pathname)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AnimatedThemeToggler className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--landing-surface-alt)]" />
              </div>
            </header>

            <main className="relative flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                  transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
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
  if (pathname.startsWith('/route')) return 'Route Planner';
  return 'Verdify';
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
            className="landing-mono-sm block"
            style={{ color: 'var(--landing-text-dim)', letterSpacing: '0.18em' }}
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
          background: active ? 'var(--landing-accent)' : 'transparent',
          color: active
            ? 'var(--landing-button-foreground)'
            : 'var(--landing-text-muted)',
          border: active ? '1px solid var(--landing-accent)' : '1px solid transparent',
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
              color: active ? 'var(--landing-text)' : 'var(--landing-text-muted)',
            }}
          >
            <span>{entry.label}</span>
            {entry.stub && (
              <span
                className="landing-mono-sm shrink-0"
                style={{ color: 'var(--landing-text-dim)', fontSize: '0.56rem' }}
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
    'group relative flex items-center gap-3 rounded-[12px] px-2 py-1.5 transition-colors duration-300 hover:bg-[var(--landing-surface-alt)]';

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
    <NavLink to={entry.to} className={className}>
      {content}
    </NavLink>
  );
}
