'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';

const navLinks = [
  { name: 'Premise', href: '/#premise', n: '01' },
  { name: 'Sequence', href: '/#how-it-works', n: '02' },
  { name: 'Capabilities', href: '/#capabilities', n: '03' },
  { name: 'Evidence', href: '/#proof', n: '04' },
  { name: 'About', href: '/about', n: '05' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        style={{
          backgroundColor: isScrolled
            ? 'hsl(var(--background) / 0.78)'
            : 'hsl(var(--background) / 0.55)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          backdropFilter: 'blur(18px) saturate(160%)',
        }}
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500 ${
          isScrolled
            ? 'border-foreground/15 shadow-[0_1px_0_0_hsl(var(--border)/0.4)]'
            : 'border-foreground/10'
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--background) / 0.45), hsl(var(--background) / 0) 85%)',
          }}
        />
        <div className="relative mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-10" style={{ textShadow: '0 1px 0 hsl(var(--background) / 0.6)' }}>
          <Link to="/" className="group flex items-baseline gap-3">
            <span className="font-display text-[1.6rem] leading-none tracking-[-0.035em] text-foreground">
              Verdify
            </span>
            <span className="hidden font-mono-tight text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground sm:block">
              — field report
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="link-sweep text-[0.82rem] uppercase tracking-[0.18em] text-foreground/75 transition-colors hover:text-foreground"
              >
                <span className="font-mono-tight text-[0.64rem] text-[hsl(var(--accent))]">
                  {link.n}
                </span>
                {link.name}
              </Link>
            ))}
            <Link
              to="/#how-it-works"
              className="inline-flex h-10 items-center rounded-full border border-foreground/80 px-5 text-[0.72rem] uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Read the sequence
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary lg:hidden"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-border bg-background/96 px-4 py-4 backdrop-blur-md lg:top-20 lg:hidden"
          >
            <div className="mx-auto flex max-w-[1400px] flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-baseline justify-between border-b border-border/60 py-4 text-base text-foreground hover:text-[hsl(var(--accent))]"
                >
                  <span className="font-display text-lg tracking-[-0.02em]">
                    {link.name}
                  </span>
                  <span className="font-mono-tight text-[0.64rem] uppercase tracking-[0.28em] text-muted-foreground">
                    {link.n}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
