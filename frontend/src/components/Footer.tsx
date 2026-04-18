'use client';

import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';

const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  return (
    <footer
      ref={ref}
      className="landing-theme relative border-t px-4 pt-24 pb-10 sm:px-6 lg:px-10"
      style={{
        borderColor: 'var(--landing-border)',
        background: 'var(--landing-bg)',
        color: 'var(--landing-text)',
      }}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
              § Project brief
            </p>
            <h3 className="landing-display mt-5 max-w-3xl text-[clamp(2.4rem,5.5vw,4.8rem)] leading-[0.96]">
              One corridor.{' '}
              <span className="landing-italic" style={{ color: 'var(--landing-accent)' }}>
                Johor to Singapore
              </span>
              , every day.
            </h3>
            <p
              className="mt-6 max-w-lg text-[0.98rem] leading-7"
              style={{ color: 'var(--landing-text-muted)' }}
            >
              Agentic green navigation for commuters, companies, and reviewers who
              need mobility to end in measurable action.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/#how" className="landing-btn-primary">
                Plan a trip <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/#caps" className="landing-btn-ghost">
                Capabilities
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-10">
            <div
              className="grid grid-cols-2 gap-y-3 landing-mono-sm"
              style={{ color: 'var(--landing-text-muted)' }}
            >
              <span>Track 4 · Green Horizon</span>
              <span>Gemini · Genkit · RAG</span>
              <span>Vertex AI Search</span>
              <span>Cloud Run</span>
            </div>
            <p className="landing-italic text-2xl" style={{ color: 'var(--landing-text)' }}>
              Built for Net Zero 2050.
            </p>
          </div>
        </div>
        <div
          className="mt-20 flex items-end justify-between border-t pt-7"
          style={{ borderColor: 'var(--landing-border)' }}
        >
          <p className="landing-display text-[clamp(3rem,10vw,9rem)] leading-[0.88] tracking-[-0.055em]">
            Verdify<span style={{ color: 'var(--landing-accent)' }}>.</span>
          </p>
          <p className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
            © {new Date().getFullYear()} · Verdify
          </p>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
