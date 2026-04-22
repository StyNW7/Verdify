'use client';

import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';

const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  return (
    <footer
      ref={ref}
      className="landing-theme relative border-t px-5 pt-16 pb-10 sm:px-6 sm:pt-24 lg:px-10"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-bg)',
        color: 'var(--theme-fg)',
      }}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              § Project brief
            </p>
            <h3 className="theme-display mt-5 max-w-3xl text-[clamp(2.4rem,5.5vw,4.8rem)] leading-[0.96]">
              One corridor.{' '}
              <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
                Johor to Singapore
              </span>
              , every day.
            </h3>
            <p
              className="mt-6 max-w-lg text-[0.98rem] leading-7"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              Agentic green navigation for commuters, companies, and reviewers who
              need mobility to end in measurable action.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/#how" className="theme-btn-primary">
                Plan a trip <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/#caps" className="theme-btn-ghost">
                Capabilities
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-10">
            <div
              className="grid grid-cols-2 gap-y-3 theme-mono-sm"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              <span>Track 4 · Green Horizon</span>
              <span>Gemini · Genkit · RAG</span>
              <span>Vertex AI Search</span>
              <span>Cloud Run</span>
            </div>
            <p className="theme-italic text-2xl" style={{ color: 'var(--theme-fg)' }}>
              Built for Net Zero 2050.
            </p>
          </div>
        </div>
        <div
          className="mt-14 flex flex-wrap items-end justify-between gap-4 border-t pt-7 sm:mt-20"
          style={{ borderColor: 'var(--landing-border)' }}
        >
          <p className="theme-display text-[clamp(3rem,10vw,9rem)] leading-[0.88] tracking-[-0.055em]">
            Verdify<span style={{ color: 'var(--theme-accent)' }}>.</span>
          </p>
          <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            © {new Date().getFullYear()} · Verdify
          </p>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
