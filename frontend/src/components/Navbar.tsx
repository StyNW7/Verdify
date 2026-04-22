'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Leaf, Menu, Search, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

import AnimatedThemeToggler from '@/components/AnimatedThemeToggler';
import { useAuthModal } from '@/components/auth-modal';

type FlyoutColumn = {
  title: string;
  links: Array<{ label: string; to: string; prominent?: boolean }>;
};

type NavItem = {
  id: string;
  label: string;
  to: string;
  columns: [FlyoutColumn, FlyoutColumn, FlyoutColumn];
};

const navItems: NavItem[] = [
  {
    id: 'product',
    label: 'Product',
    to: '/',
    columns: [
      {
        title: 'Explore Product',
        links: [
          { label: 'The premise', to: '/#premise', prominent: true },
          { label: 'How it works', to: '/#how', prominent: true },
          { label: 'Capabilities', to: '/#caps', prominent: true },
          { label: 'Plan a trip', to: '/route', prominent: true },
        ],
      },
      {
        title: 'On this page',
        links: [
          { label: 'Premise', to: '/#premise' },
          { label: 'Sequence', to: '/#how' },
          { label: 'Capabilities', to: '/#caps' },
          { label: 'Closing', to: '/#closing' },
        ],
      },
      {
        title: 'Take action',
        links: [
          { label: 'Route planner', to: '/route' },
          { label: 'Sign in', to: '/auth/login' },
          { label: 'Register', to: '/auth/register' },
          { label: 'See the stack', to: '/technology' },
        ],
      },
    ],
  },
  {
    id: 'technology',
    label: 'Technology',
    to: '/technology',
    columns: [
      {
        title: 'Explore Technology',
        links: [
          { label: 'Gemini · reasoning', to: '/technology#chap-01', prominent: true },
          { label: 'Vertex · grounding', to: '/technology#chap-02', prominent: true },
          { label: 'Genkit · agentic', to: '/technology#chap-03', prominent: true },
          { label: 'Cloud Run · execution', to: '/technology#chap-04', prominent: true },
        ],
      },
      {
        title: 'On this page',
        links: [
          { label: 'Reasoning', to: '/technology#chap-01' },
          { label: 'Grounding', to: '/technology#chap-02' },
          { label: 'Agentic flows', to: '/technology#chap-03' },
          { label: 'Frontend', to: '/technology#chap-05' },
        ],
      },
      {
        title: 'Adjacent',
        links: [
          { label: 'Product overview', to: '/' },
          { label: 'Profile', to: '/about' },
          { label: 'Route planner', to: '/route' },
          { label: 'Infrastructure', to: '/technology#chap-06' },
        ],
      },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    to: '/about',
    columns: [
      {
        title: 'Explore Profile',
        links: [
          { label: 'Manifesto', to: '/about#manifesto', prominent: true },
          { label: 'Project brief', to: '/about#brief', prominent: true },
          { label: 'The team', to: '/about#team', prominent: true },
          { label: 'Closing promise', to: '/about#closing', prominent: true },
        ],
      },
      {
        title: 'On this page',
        links: [
          { label: 'Track 4 · Green Horizon', to: '/about#hero' },
          { label: 'Audience', to: '/about#brief' },
          { label: 'Net Zero 2050', to: '/about#manifesto' },
          { label: 'Team', to: '/about#team' },
        ],
      },
      {
        title: 'Adjacent',
        links: [
          { label: 'Product overview', to: '/' },
          { label: 'Technology', to: '/technology' },
          { label: 'Sign in', to: '/auth/login' },
          { label: 'Register', to: '/auth/register' },
        ],
      },
    ],
  },
];

const NAV_HEIGHT = 64;

function scrollToId(id: string, behavior: ScrollBehavior = 'smooth') {
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  const y = el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT - 8;
  window.scrollTo({ top: Math.max(0, y), behavior });
  return true;
}

function scrollToIdWhenReady(id: string, timeoutMs = 800) {
  if (!id) return;

  let rafId = 0;
  const deadline = performance.now() + timeoutMs;

  const tick = () => {
    if (scrollToId(id)) return;
    if (performance.now() < deadline) {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  rafId = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(rafId);
}

function parseTo(to: string): { path: string; hash: string } {
  const [rawPath, rawHash] = to.split('#');
  return {
    path: rawPath || '/',
    hash: rawHash || '',
  };
}

function FlyoutLink({
  item,
  onClick,
}: {
  item: { label: string; to: string; prominent?: boolean };
  onClick?: () => void;
}) {
  const { open: openAuth } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();

  const authMode =
    item.to === '/auth/login'
      ? ('login' as const)
      : item.to === '/auth/register'
      ? ('register' as const)
      : null;

  if (authMode) {
    return (
      <button
        type="button"
        onClick={() => {
          onClick?.();
          openAuth(authMode);
        }}
        className={
          item.prominent
            ? 'group inline-flex items-baseline gap-2 landing-display tracking-[-0.035em] text-[clamp(1.25rem,1.6vw,1.65rem)] text-[var(--landing-text)] transition-colors duration-300'
            : 'inline-flex text-left text-[0.88rem] font-normal text-[var(--landing-text-muted)] transition-colors duration-300 hover:text-[var(--landing-text)]'
        }
      >
        <span>{item.label}</span>
        {item.prominent ? (
          <ArrowUpRight
            className="h-3.5 w-3.5 -translate-y-px opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100"
            style={{ color: 'var(--landing-accent)' }}
            strokeWidth={1.8}
          />
        ) : null}
      </button>
    );
  }

  const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (typeof e.button === 'number' && e.button !== 0)
    ) {
      onClick?.();
      return;
    }

    e.preventDefault();
    onClick?.();

    const { path, hash } = parseTo(item.to);

    if (!hash) {
      if (path !== location.pathname) navigate(path);
      return;
    }

    if (path === location.pathname) {
      navigate(`${path}${location.search}#${hash}`, { replace: false });
      scrollToIdWhenReady(hash);
      return;
    }

    navigate(`${path}#${hash}`);
  };

  const className = item.prominent
    ? 'group inline-flex items-baseline gap-2 landing-display tracking-[-0.035em] text-[clamp(1.25rem,1.6vw,1.65rem)] text-[var(--landing-text)] transition-colors duration-300'
    : 'inline-flex text-[0.88rem] font-normal text-[var(--landing-text-muted)] transition-colors duration-300 hover:text-[var(--landing-text)]';

  return (
    <Link to={item.to} onClick={handleClick} className={className}>
      <span>{item.label}</span>
      {item.prominent ? (
        <ArrowUpRight
          className="h-3.5 w-3.5 -translate-y-px translate-x-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100"
          style={{ color: 'var(--landing-accent)' }}
          strokeWidth={1.8}
        />
      ) : null}
    </Link>
  );
}

export default function Navbar() {
  const { pathname, hash } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveMenu(null);
  }, [pathname, hash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { open: openAuth } = useAuthModal();

  const activeItem = useMemo(
    () => navItems.find((item) => item.id === activeMenu) ?? null,
    [activeMenu],
  );

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setActiveMenu(null), 140);
  };

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div
          className="transition-[background-color,border-color,backdrop-filter] duration-500"
          style={{
            backgroundColor: activeMenu
              ? 'color-mix(in srgb, var(--landing-bg) 92%, transparent)'
              : isScrolled
              ? 'color-mix(in srgb, var(--landing-bg) 68%, transparent)'
              : 'transparent',
            borderBottom: '1px solid',
            borderBottomColor:
              isScrolled || activeMenu ? 'var(--landing-border)' : 'transparent',
            backdropFilter:
              isScrolled || activeMenu ? 'blur(22px) saturate(180%)' : 'none',
            WebkitBackdropFilter:
              isScrolled || activeMenu ? 'blur(22px) saturate(180%)' : 'none',
          }}
        >
          <div
            className="mx-auto flex max-w-[1024px] items-center justify-between px-4 sm:px-6 lg:px-8"
            style={{ height: NAV_HEIGHT }}
          >
            <Link
              to="/"
              onMouseEnter={() => setActiveMenu(null)}
              className="flex items-center gap-2"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-[6px]"
                style={{ background: 'var(--landing-accent)' }}
              >
                <Leaf
                  className="h-3 w-3"
                  style={{ color: 'var(--landing-button-foreground)' }}
                  strokeWidth={2.4}
                />
              </span>
              <span
                className="landing-display text-[1.05rem] tracking-[-0.03em]"
                style={{ color: 'var(--landing-text)' }}
              >
                Verdify
              </span>
            </Link>

            <div className="hidden flex-1 items-center justify-center lg:flex">
              <ul className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isOpen = activeMenu === item.id;
                  const itemPath = item.to.split('#')[0] || '/';
                  const isActive =
                    (itemPath === '/' && pathname === '/') ||
                    (itemPath !== '/' && pathname.startsWith(itemPath));

                  return (
                    <li key={item.id}>
                      <Link
                        to={item.to}
                        aria-expanded={isOpen}
                        onMouseEnter={() => setActiveMenu(item.id)}
                        onFocus={() => setActiveMenu(item.id)}
                        onClick={() => setActiveMenu(null)}
                        className="relative inline-flex px-3 py-2 text-[0.88rem] transition-colors duration-300"
                        style={{
                          color:
                            isOpen || isActive
                              ? 'var(--landing-text)'
                              : 'var(--landing-text-muted)',
                        }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="hidden items-center gap-1 lg:flex">
              <button
                type="button"
                aria-label="Search"
                onMouseEnter={() => setActiveMenu(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--landing-surface-alt)]"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                <Search className="h-[15px] w-[15px]" strokeWidth={1.6} />
              </button>
              <AnimatedThemeToggler
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--landing-surface-alt)]"
              />
              <span
                aria-hidden
                className="mx-2 h-4 w-px"
                style={{ background: 'var(--landing-border)' }}
              />
              <button
                type="button"
                onClick={() => openAuth('login')}
                onMouseEnter={() => setActiveMenu(null)}
                className="landing-link-underline text-[0.82rem] transition-colors duration-300"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => openAuth('register')}
                onMouseEnter={() => setActiveMenu(null)}
                className="ml-2 inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.78rem] font-medium transition-all duration-300"
                style={{
                  background: 'var(--landing-accent)',
                  color: 'var(--landing-button-foreground)',
                  letterSpacing: '0.015em',
                }}
              >
                Get started
                <ArrowUpRight size={13} strokeWidth={1.8} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
              style={{ color: 'var(--landing-text)' }}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {activeItem ? (
            <motion.div
              key="flyout-shell"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              className="hidden overflow-hidden border-b lg:block"
              style={{
                borderColor: 'var(--landing-border)',
                background: 'color-mix(in srgb, var(--landing-bg) 96%, transparent)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                boxShadow: '0 30px 60px -42px rgba(10,14,12,0.28)',
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="mx-auto max-w-[1024px] px-8 pb-12 pt-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeItem.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
                    className="grid gap-12 lg:grid-cols-[1.25fr_0.85fr_0.85fr]"
                  >
                    {activeItem.columns.map((column, index) => (
                      <section key={column.title} className="space-y-5">
                        <p
                          className="landing-mono-sm"
                          style={{ color: 'var(--landing-text-dim)' }}
                        >
                          {column.title}
                        </p>
                        <div
                          className={`flex flex-col ${
                            index === 0 ? 'gap-3' : 'gap-3.5'
                          }`}
                        >
                          {column.links.map((link) => (
                            <FlyoutLink
                              key={link.label}
                              item={link}
                              onClick={() => setActiveMenu(null)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
            className="fixed inset-x-0 z-40 border-b px-5 py-6 lg:hidden"
            style={{
              top: NAV_HEIGHT,
              borderColor: 'var(--landing-border)',
              background: 'color-mix(in srgb, var(--landing-bg) 96%, transparent)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            <div className="mx-auto flex max-w-[1024px] flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between border-b py-4 landing-display tracking-[-0.03em] text-[1.35rem]"
                  style={{
                    borderColor: 'var(--landing-border)',
                    color: 'var(--landing-text)',
                  }}
                >
                  <span>{item.label}</span>
                  <ArrowUpRight
                    className="h-4 w-4"
                    style={{ color: 'var(--landing-text-dim)' }}
                    strokeWidth={1.6}
                  />
                </Link>
              ))}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuth('register');
                  }}
                  className="landing-btn-primary w-full justify-center"
                >
                  Get started
                  <ArrowUpRight size={14} strokeWidth={1.8} />
                </button>
                <div className="flex items-center justify-between">
                  <AnimatedThemeToggler
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuth('login');
                    }}
                    className="landing-link-underline text-[0.82rem]"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    Sign in →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        aria-hidden
        className="fixed inset-0 z-30 hidden lg:block"
        style={{
          pointerEvents: activeMenu ? 'auto' : 'none',
          opacity: activeMenu ? 1 : 0,
          transition: 'opacity 0.2s ease',
          background: activeMenu ? 'rgba(10, 14, 12, 0.12)' : 'transparent',
        }}
        onClick={() => setActiveMenu(null)}
      />
    </>
  );
}
