'use client';

import { forwardRef } from 'react';
import { Link } from 'react-router';

const footerLinks = [
  { name: 'About', href: '/about', n: '05' },
  { name: 'Premise', href: '/#premise', n: '01' },
  { name: 'Sequence', href: '/#how-it-works', n: '02' },
  { name: 'Capabilities', href: '/#capabilities', n: '03' },
  { name: 'Evidence', href: '/#proof', n: '04' },
];

const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  const year = new Date().getFullYear();

  return (
    <footer
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-0 border-t border-border/60 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="font-mono-tight text-[0.68rem] uppercase tracking-[0.26em] text-[hsl(var(--primary-foreground))/0.55]">
              Project brief
            </p>
            <h3 className="mt-6 max-w-3xl text-[clamp(2.4rem,5.2vw,4.6rem)] leading-[0.98] tracking-[-0.035em]">
              Built for one corridor — <em>Johor to Singapore.</em>
            </h3>
            <p className="mt-8 max-w-lg text-[1rem] leading-7 text-[hsl(var(--primary-foreground))/0.75]">
              Agentic green navigation for commuters, companies, and public-sector
              reviewers who need mobility decisions to end in measurable action.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-10">
            <nav aria-label="Footer" className="grid gap-4 sm:grid-cols-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="flex items-baseline justify-between border-b border-[hsl(var(--primary-foreground))/0.18] pb-3 text-[hsl(var(--primary-foreground))/0.85] transition-colors hover:text-[hsl(var(--primary-foreground))]"
                >
                  <span className="font-display text-lg tracking-[-0.02em]">
                    {link.name}
                  </span>
                  <span className="font-mono-tight text-[0.64rem] uppercase tracking-[0.28em] text-[hsl(var(--primary-foreground))/0.5]">
                    {link.n}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="space-y-2">
              <p className="font-mono-tight text-[0.64rem] uppercase tracking-[0.26em] text-[hsl(var(--primary-foreground))/0.5]">
                Current brief
              </p>
              <p className="font-italic text-xl text-[hsl(var(--primary-foreground))/0.95]">
                April 2026
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-wrap items-end justify-between gap-6 border-t border-[hsl(var(--primary-foreground))/0.18] pt-8">
          <p className="font-display text-[clamp(3rem,10vw,8rem)] leading-[0.9] tracking-[-0.05em] text-[hsl(var(--primary-foreground))]">
            Verdify
          </p>
          <div className="flex flex-col items-end gap-2 font-mono-tight text-[0.64rem] uppercase tracking-[0.26em] text-[hsl(var(--primary-foreground))/0.55]">
            <span>© {year} · Verdify Editorial</span>
            <span>Track 4 · Green Horizon</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
