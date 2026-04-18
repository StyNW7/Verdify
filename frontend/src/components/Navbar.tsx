'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Leaf, Menu, Search, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import AnimatedThemeToggler from '@/components/AnimatedThemeToggler';

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
    id: 'premise',
    label: 'Premise',
    to: '/#premise',
    columns: [
      {
        title: 'Explore Premise',
        links: [
          { label: 'Corridor brief', to: '/#premise', prominent: true },
          { label: 'Mobility pressure', to: '/#premise', prominent: true },
          { label: 'Why April 2026', to: '/#premise', prominent: true },
          { label: 'Continue to sequence', to: '/#how', prominent: true },
        ],
      },
      {
        title: 'On this page',
        links: [
          { label: 'How it works', to: '/#how' },
          { label: 'Capabilities', to: '/#caps' },
          { label: 'Stack', to: '/#stack' },
          { label: 'Plan a trip', to: '/#how' },
        ],
      },
      {
        title: 'Take action',
        links: [
          { label: 'Plan a trip', to: '/#how' },
          { label: 'Route planner', to: '/route' },
          { label: 'Sign in', to: '/auth/login' },
          { label: 'Register', to: '/auth/register' },
        ],
      },
    ],
  },
  {
    id: 'sequence',
    label: 'Sequence',
    to: '/#how',
    columns: [
      {
        title: 'Explore Sequence',
        links: [
          { label: 'Prompt to action', to: '/#how', prominent: true },
          { label: 'Grounding and RAG', to: '/#how', prominent: true },
          { label: 'Autonomous booking', to: '/#how', prominent: true },
          { label: 'Report generation', to: '/#how', prominent: true },
        ],
      },
      {
        title: 'On this page',
        links: [
          { label: 'Premise', to: '/#premise' },
          { label: 'Capabilities', to: '/#caps' },
          { label: 'Stack', to: '/#stack' },
          { label: 'Route planner', to: '/route' },
        ],
      },
      {
        title: 'In the app',
        links: [
          { label: 'Plan a trip', to: '/#how' },
          { label: 'Review live map', to: '/#how' },
          { label: 'Route planner', to: '/route' },
          { label: 'Professional report', to: '/#caps' },
        ],
      },
    ],
  },
  {
    id: 'capabilities',
    label: 'Capabilities',
    to: '/#caps',
    columns: [
      {
        title: 'Explore Capabilities',
        links: [
          { label: 'Smart route optimizer', to: '/#caps', prominent: true },
          { label: 'Carbon intelligence', to: '/#caps', prominent: true },
          { label: 'Action engine', to: '/#caps', prominent: true },
          { label: 'Reward system', to: '/#caps', prominent: true },
        ],
      },
      {
        title: 'On this page',
        links: [
          { label: 'Premise', to: '/#premise' },
          { label: 'Sequence', to: '/#how' },
          { label: 'Stack', to: '/#stack' },
          { label: 'Plan a trip', to: '/#how' },
        ],
      },
      {
        title: 'More from Verdify',
        links: [
          { label: 'Route planner', to: '/route' },
          { label: 'Read the sequence', to: '/#how' },
          { label: 'See the stack', to: '/#stack' },
          { label: 'Plan a trip', to: '/#how' },
        ],
      },
    ],
  },
  {
    id: 'evidence',
    label: 'Evidence',
    to: '/#stack',
    columns: [
      {
        title: 'Explore Evidence',
        links: [
          { label: 'Google AI stack fit', to: '/#stack', prominent: true },
          { label: 'Gemini reasoning', to: '/#stack', prominent: true },
          { label: 'Vertex RAG grounding', to: '/#stack', prominent: true },
          { label: 'Cloud Run deployment', to: '/#stack', prominent: true },
        ],
      },
      {
        title: 'On this page',
        links: [
          { label: 'Premise', to: '/#premise' },
          { label: 'Sequence', to: '/#how' },
          { label: 'Capabilities', to: '/#caps' },
          { label: 'Plan a trip', to: '/#how' },
        ],
      },
      {
        title: 'System paths',
        links: [
          { label: 'Route planner', to: '/route' },
          { label: 'Sign in', to: '/auth/login' },
          { label: 'Register', to: '/auth/register' },
          { label: 'Plan a trip', to: '/#how' },
        ],
      },
    ],
  },
];

const NAV_HEIGHT = 64;

function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, '');
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT - 8;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

function handleHashLink(
  to: string,
  onAfter?: () => void,
): (e: ReactMouseEvent<HTMLAnchorElement>) => void {
  return (e) => {
    const [path, hash] = to.split('#');
    if (hash && (path === '' || path === window.location.pathname)) {
      e.preventDefault();
      scrollToHash(`#${hash}`);
      window.history.replaceState(null, '', `#${hash}`);
      onAfter?.();
    }
  };
}

function FlyoutLink({
  item,
  onClick,
}: {
  item: { label: string; to: string; prominent?: boolean };
  onClick?: () => void;
}) {
  const combined = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    handleHashLink(item.to, onClick)(e);
    if (!e.defaultPrevented) onClick?.();
  };

  if (item.prominent) {
    return (
      <Link
        to={item.to}
        onClick={combined}
        className="group inline-flex items-baseline gap-2 landing-display tracking-[-0.035em] text-[clamp(1.25rem,1.6vw,1.65rem)] text-[var(--landing-text)] transition-colors duration-300"
      >
        <span>{item.label}</span>
        <ArrowUpRight
          className="h-3.5 w-3.5 -translate-y-px translate-x-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100"
          style={{ color: 'var(--landing-accent)' }}
          strokeWidth={1.8}
        />
      </Link>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={combined}
      className="inline-flex text-[0.88rem] font-normal text-[var(--landing-text-muted)] transition-colors duration-300 hover:text-[var(--landing-text)]"
    >
      {item.label}
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
                  const isActive =
                    pathname === '/' && item.to === `/${hash}` && hash !== '';

                  return (
                    <li key={item.id}>
                      <Link
                        to={item.to}
                        aria-expanded={isOpen}
                        onMouseEnter={() => setActiveMenu(item.id)}
                        onFocus={() => setActiveMenu(item.id)}
                        onClick={handleHashLink(item.to, () => setActiveMenu(null))}
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
                            <FlyoutLink key={link.label} item={link} />
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

              <div className="mt-6 flex items-center justify-between">
                <AnimatedThemeToggler
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                />
                <Link
                  to="/#how"
                  onClick={(e) => {
                    handleHashLink('/#how', () => setIsMobileMenuOpen(false))(e);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-[0.82rem]"
                  style={{ color: 'var(--landing-text-muted)' }}
                >
                  Plan a trip →
                </Link>
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
